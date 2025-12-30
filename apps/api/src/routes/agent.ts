import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { ToolLoopAgent, createAgentUIStreamResponse, tool } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { eq } from "drizzle-orm";
import {
  getNodeCatalog,
  getGroupedCatalog,
  getNode,
  registerBuiltinNodes,
  validateWorkflow,
} from "@flowit/sdk";
import type { WorkflowDSL } from "@flowit/shared";
import type { AuthVariables } from "../middleware/auth";
import { db, appConfig, workflows, workflowVersions } from "../db";
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
  workflowId: z.string().describe("The workflow ID to edit"),
  messages: z.array(
    z.object({
      id: z.string().optional(),
      role: z.enum(["user", "assistant", "system"]),
      parts: z.array(messagePartSchema),
    })
  ),
});

const SYSTEM_PROMPT = `You are a workflow builder assistant that helps users create and edit automation workflows through conversation.

You have access to tools to:
1. Get the current workflow (getCurrentWorkflow) - Retrieve the workflow currently being edited
2. Edit the current workflow (editCurrentWorkflow) - Save changes to the workflow
3. List available node types (listAvailableNodes) - Discover what nodes can be used
4. Get detailed information about specific nodes (getNodeDetails) - Understand node parameters and I/O
5. Validate a workflow (validateWorkflow) - Check for errors before saving

When helping users build workflows:
1. First get the current workflow to understand what exists
2. Understand what the user wants to accomplish
3. List and explore available nodes to find the right ones
4. Get details about specific nodes to understand their parameters
5. Make changes using editCurrentWorkflow
6. IMPORTANT: Before saving with editCurrentWorkflow, call validateWorkflow to verify it's valid

Key concepts:
- Nodes are connected via edges
- Each node has inputs and outputs with specific handles (e.g., "value", "result", "text")
- Parameters can be static values or reference secrets
- Workflows flow from input/trigger nodes to output nodes

WorkflowDSL structure:
- dslVersion: "0.1.0"
- meta: { name, description, version: "1", status: "draft" }
- inputs: {}
- outputs: {}
- secrets: []
- nodes: array of node definitions
- edges: array of edge definitions connecting nodes

Always be conversational and explain what you're doing. When making changes, describe the modifications clearly.`;

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
    "Validate a workflow DSL to check for errors before saving. Call this before editCurrentWorkflow to ensure the workflow is valid. Returns validation errors if any, or confirms the workflow is valid.",
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

// Tools that need workflowId context - created dynamically per request
function createWorkflowTools(workflowId: string) {
  const getCurrentWorkflowTool = tool({
    description:
      "Get the current workflow being edited. Returns the workflow DSL including nodes, edges, and metadata.",
    inputSchema: z.object({}),
    execute: async () => {
      const workflow = await db.query.workflows.findFirst({
        where: eq(workflows.id, workflowId),
        with: { currentVersion: true },
      });

      if (!workflow) {
        return { error: `Workflow not found: ${workflowId}` };
      }

      if (!workflow.currentVersion) {
        // Return empty workflow structure if no version exists
        return {
          dslVersion: "0.1.0",
          meta: {
            name: workflow.name,
            description: workflow.description || "",
            version: "1",
            status: "draft",
          },
          inputs: {},
          outputs: {},
          secrets: [],
          nodes: [],
          edges: [],
        };
      }

      return workflow.currentVersion.dsl;
    },
  });

  const editCurrentWorkflowTool = tool({
    description:
      "Save changes to the current workflow. Pass the complete workflow DSL to overwrite the current version. Always validate before calling this.",
    inputSchema: z.object({
      workflow: workflowDSLSchema.describe("The complete workflow DSL to save"),
    }),
    needsApproval: true,
    execute: async ({ workflow }) => {
      // First validate
      const errors = validateWorkflow(workflow as WorkflowDSL);
      if (errors.length > 0) {
        return { success: false, errors, message: "Workflow validation failed" };
      }

      const now = new Date().toISOString();

      // Get current workflow to find the latest version number
      const existingWorkflow = await db.query.workflows.findFirst({
        where: eq(workflows.id, workflowId),
        with: { versions: true },
      });

      if (!existingWorkflow) {
        return { success: false, error: `Workflow not found: ${workflowId}` };
      }

      // Determine next version number
      const latestVersion = existingWorkflow.versions.reduce(
        (max, v) => Math.max(max, v.version),
        0
      );
      const nextVersion = latestVersion + 1;
      const versionId = crypto.randomUUID();

      // Create new version
      await db.insert(workflowVersions).values({
        id: versionId,
        workflowId,
        version: nextVersion,
        dsl: workflow,
        createdAt: now,
      });

      // Update workflow to point to new version
      await db
        .update(workflows)
        .set({
          currentVersionId: versionId,
          name: workflow.meta.name,
          description: workflow.meta.description,
          updatedAt: now,
        })
        .where(eq(workflows.id, workflowId));

      return {
        success: true,
        message: `Workflow saved as version ${nextVersion}`,
        version: nextVersion,
      };
    },
  });

  return {
    getCurrentWorkflow: getCurrentWorkflowTool,
    editCurrentWorkflow: editCurrentWorkflowTool,
  };
}

// Static tools that don't need context
const staticTools = {
  listAvailableNodes: listAvailableNodesTool,
  getNodeDetails: getNodeDetailsTool,
  validateWorkflow: validateWorkflowTool,
};

// Create the workflow builder agent with a given API key and workflowId
function createWorkflowBuilderAgent(apiKey: string, workflowId: string) {
  const anthropic = createAnthropic({ apiKey });
  const workflowTools = createWorkflowTools(workflowId);

  return new ToolLoopAgent({
    model: anthropic("claude-sonnet-4-5"),
    instructions: SYSTEM_PROMPT,
    tools: {
      ...staticTools,
      ...workflowTools,
    },
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

      const { workflowId, messages } = c.req.valid("json");
      const agent = createWorkflowBuilderAgent(apiKey, workflowId);

      return createAgentUIStreamResponse({
        agent,
        uiMessages: messages,
      });
    }
  );
}
