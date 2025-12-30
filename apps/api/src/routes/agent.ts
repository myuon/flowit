import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  ToolLoopAgent,
  createAgentUIStreamResponse,
  tool,
  Output,
  hasToolCall,
} from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  getNodeCatalog,
  getGroupedCatalog,
  getNode,
  registerBuiltinNodes,
  validateWorkflow,
} from "@flowit/sdk";
import type { WorkflowDSL } from "@flowit/shared";
import type { AuthVariables } from "../middleware/auth";
import { db, appConfig } from "../db";
import { appConfigFromDb, getAnthropicApiKey } from "../models";

// Register builtin nodes on module load
registerBuiltinNodes();

// Request schema - AI SDK v6 uses parts format
const messagePartSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({
    type: z.literal("file"),
    mediaType: z.string(),
    url: z.string(),
  }),
]);

const agentRequestSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string().optional(),
      role: z.enum(["user", "assistant", "system"]),
      parts: z.array(messagePartSchema),
    })
  ),
});

const SYSTEM_PROMPT = `You are a workflow builder assistant that helps users create automation workflows.

You have access to tools to:
1. List available node types (listAvailableNodes)
2. Get detailed information about specific nodes (getNodeDetails)
3. Validate a workflow (validateWorkflow)

When helping users build workflows:
1. First understand what the user wants to accomplish
2. List and explore available nodes to find the right ones
3. Get details about specific nodes to understand their parameters
4. Build the workflow by connecting nodes appropriately
5. IMPORTANT: Before completing, you MUST call validateWorkflow to verify the workflow is valid

Key concepts:
- Nodes are connected via edges
- Each node has inputs and outputs with specific handles (e.g., "value", "result", "text")
- Parameters can be static values or reference secrets
- Workflows flow from input/trigger nodes to output nodes

Always explore the available nodes first to understand what's possible. When you have gathered enough information and built the workflow, call validateWorkflow to check for errors. If there are validation errors, fix them before completing.

Your final output MUST be a valid WorkflowDSL object with:
- dslVersion: "0.1.0"
- meta: { name, description, version: "1", status: "draft" }
- inputs: {}
- outputs: {}
- secrets: []
- nodes: array of node definitions
- edges: array of edge definitions connecting nodes`;

// WorkflowDSL output schema
const nodeParamSchema = z.object({
  type: z.enum(["static", "secret", "input"]),
  value: z.unknown().optional(),
  ref: z.string().optional(),
  path: z.string().optional(),
});

const ioSchema = z.object({
  type: z.enum(["string", "number", "boolean", "object", "array", "any"]),
  description: z.string().optional(),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
});

const workflowNodeSchema = z.object({
  id: z.string().describe("Unique identifier for this node instance"),
  type: z.string().describe("The node type ID from the registry"),
  label: z.string().optional().describe("Optional display label"),
  params: z
    .object({})
    .catchall(nodeParamSchema)
    .describe("Node parameters as key-value pairs"),
  inputs: z
    .object({})
    .catchall(ioSchema)
    .describe("Node inputs schema as key-value pairs"),
  outputs: z
    .object({})
    .catchall(ioSchema)
    .describe("Node outputs schema as key-value pairs"),
});

const workflowEdgeSchema = z.object({
  id: z.string().describe("Unique edge identifier"),
  source: z.string().describe("Source node ID"),
  target: z.string().describe("Target node ID"),
  sourceHandle: z.string().describe("Output handle name on source node"),
  targetHandle: z.string().describe("Input handle name on target node"),
});

const workflowDSLSchema = z.object({
  dslVersion: z.literal("0.1.0"),
  meta: z.object({
    name: z.string().describe("Workflow name"),
    description: z.string().optional().describe("Workflow description"),
    version: z.string().describe("Version number"),
    status: z.enum(["draft", "published"]),
  }),
  inputs: z.object({}).catchall(ioSchema).describe("Workflow-level inputs"),
  outputs: z.object({}).catchall(ioSchema).describe("Workflow-level outputs"),
  secrets: z
    .array(
      z.object({
        key: z.string(),
        env: z.string().optional(),
      })
    )
    .describe("Required secrets"),
  nodes: z.array(workflowNodeSchema).describe("Workflow nodes"),
  edges: z.array(workflowEdgeSchema).describe("Workflow edges"),
});

// Tool definitions
const listAvailableNodesTool = tool({
  description:
    "List all available node types that can be used in a workflow. Returns node IDs, names, descriptions, categories, and input/output counts.",
  inputSchema: z.object({
    category: z
      .string()
      .optional()
      .describe(
        "Optional filter by category: input, output, ai, transform, control, integration, utility"
      ),
  }),
  execute: async ({ category }) => {
    if (category) {
      const grouped = getGroupedCatalog();
      const cat = category as keyof typeof grouped;
      if (grouped[cat]) {
        return grouped[cat];
      }
      return { error: `Unknown category: ${category}` };
    }
    return getNodeCatalog();
  },
});

const getNodeDetailsTool = tool({
  description:
    "Get detailed information about a specific node type including its parameters, inputs, and outputs schema. Use the defaultParams as a starting point for configuring the node.",
  inputSchema: z.object({
    nodeType: z.string().describe("The node type ID to get details for"),
  }),
  execute: async ({ nodeType }) => {
    const node = getNode(nodeType);
    if (!node) {
      return { error: `Node type not found: ${nodeType}` };
    }
    return {
      id: node.id,
      displayName: node.displayName,
      description: node.description,
      category: node.display.category,
      inputs: node.inputs,
      outputs: node.outputs,
      paramsSchema: node.paramsSchema,
      defaultParams: node.getDefaultParams(),
    };
  },
});

const validateWorkflowTool = tool({
  description:
    "Validate a workflow DSL to check for errors before completing. You MUST call this tool before finishing to ensure the workflow is valid. Returns validation errors if any, or confirms the workflow is valid.",
  inputSchema: z.object({
    workflow: workflowDSLSchema.describe("The workflow DSL to validate"),
  }),
  execute: async ({ workflow }) => {
    const errors = validateWorkflow(workflow as WorkflowDSL);
    if (errors.length === 0) {
      return { valid: true, message: "Workflow is valid" };
    }
    return { valid: false, errors };
  },
});

// Define agent tools
const agentTools = {
  listAvailableNodes: listAvailableNodesTool,
  getNodeDetails: getNodeDetailsTool,
  validateWorkflow: validateWorkflowTool,
};

// Create the workflow builder agent with a given API key
function createWorkflowBuilderAgent(apiKey: string) {
  const anthropic = createAnthropic({ apiKey });

  return new ToolLoopAgent({
    model: anthropic("claude-sonnet-4-5"),
    instructions: SYSTEM_PROMPT,
    tools: agentTools,
    output: Output.object({
      schema: workflowDSLSchema,
    }),
    stopWhen: [hasToolCall("validateWorkflow")],
  });
}

export function createAgentRoutes() {
  return new Hono<{ Variables: AuthVariables }>().post(
    "/chat",
    zValidator("json", agentRequestSchema),
    async (c) => {
      // Get API key from database
      const rows = await db.select().from(appConfig);
      const configs = rows.map(appConfigFromDb);
      const apiKey = getAnthropicApiKey(configs);

      if (!apiKey) {
        return c.json(
          {
            error:
              "API key not found. Please set the Anthropic API key in admin settings.",
          },
          400
        );
      }

      const { messages } = c.req.valid("json");
      const agent = createWorkflowBuilderAgent(apiKey);

      return createAgentUIStreamResponse({
        agent,
        uiMessages: messages,
      });
    }
  );
}
