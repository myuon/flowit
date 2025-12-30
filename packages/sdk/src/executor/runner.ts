import type { WorkflowDSL } from "@flowit/shared";
import { registerBuiltinNodes, getNode } from "../index";
import { executeWorkflow } from "./graph-builder";
import { buildExecutionOrder } from "./resolver";
import type { WriteLogFn, OnNodeCompleteFn } from "./types";

// Register built-in nodes on module load
registerBuiltinNodes();

export interface RunWorkflowOptions {
  workflow: WorkflowDSL;
  inputs: Record<string, unknown>;
  secrets?: Record<string, string>;
  workflowId?: string;
  writeLog?: WriteLogFn;
  onNodeComplete?: OnNodeCompleteFn;
}

export interface RunWorkflowResult {
  executionId: string;
  outputs: Record<string, unknown>;
  logs: string[];
  status: "success" | "error";
  error?: string;
}

/**
 * Run a workflow and return the results
 */
export async function runWorkflow(
  options: RunWorkflowOptions
): Promise<RunWorkflowResult> {
  const {
    workflow,
    inputs,
    secrets = {},
    workflowId,
    writeLog,
    onNodeComplete,
  } = options;
  const executionId = crypto.randomUUID();

  try {
    // Execute the workflow
    const finalState = await executeWorkflow(
      workflow,
      inputs,
      secrets,
      executionId,
      workflowId,
      writeLog,
      onNodeComplete
    );

    // Extract outputs from the final state
    // Find output nodes and collect their results
    const outputs: Record<string, unknown> = {};

    for (const node of workflow.nodes) {
      // Check if this is an output node or has no dependents
      const hasNoDependents = !workflow.edges.some((e) => e.source === node.id);
      if (node.type === "output" || hasNoDependents) {
        const nodeOutputs = finalState.outputs[node.id];
        if (nodeOutputs) {
          // Use node label or id as the output key
          const outputKey = node.label || node.id;
          outputs[outputKey] = nodeOutputs;
        }
      }
    }

    // Check for errors
    if (finalState.error) {
      return {
        executionId,
        outputs,
        logs: finalState.logs,
        status: "error",
        error: finalState.error,
      };
    }

    return {
      executionId,
      outputs,
      logs: finalState.logs,
      status: "success",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      executionId,
      outputs: {},
      logs: [`Execution failed: ${message}`],
      status: "error",
      error: message,
    };
  }
}

/**
 * Validate a workflow before execution
 */
export function validateWorkflow(workflow: WorkflowDSL): string[] {
  const errors: string[] = [];

  // Check for empty workflow
  if (workflow.nodes.length === 0) {
    errors.push("Workflow has no nodes");
  }

  // Check for unknown node types
  for (const node of workflow.nodes) {
    if (!getNode(node.type)) {
      errors.push(`Unknown node type: ${node.type} (node: ${node.id})`);
    }
  }

  // Check for dangling edge references
  const nodeIds = new Set(workflow.nodes.map((n) => n.id));
  for (const edge of workflow.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge references unknown source node: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge references unknown target node: ${edge.target}`);
    }
  }

  // Check for cycles
  try {
    buildExecutionOrder(workflow.nodes, workflow.edges);
  } catch {
    errors.push("Workflow contains cycles");
  }

  return errors;
}
