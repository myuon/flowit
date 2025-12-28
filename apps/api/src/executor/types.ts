import type { WorkflowDSL } from "@flowit/shared";

// Function type for writing logs to database
export type WriteLogFn = (
  workflowId: string,
  executionId: string,
  nodeId: string,
  data: unknown
) => Promise<void>;

// Execution state passed through the graph
export interface ExecutionState {
  // Node outputs: nodeId -> outputName -> value
  outputs: Record<string, Record<string, unknown>>;
  // Workflow inputs
  inputs: Record<string, unknown>;
  // Secrets (resolved at runtime)
  secrets: Record<string, string>;
  // Execution metadata
  executionId: string;
  workflowId?: string;
  // Current node being executed (for logging)
  currentNode?: string;
  // Logs collected during execution
  logs: string[];
  // Error if any
  error?: string;
  // Optional log writer function
  writeLog?: WriteLogFn;
}

// Resolved parameter value
export type ResolvedParams = Record<string, unknown>;

// Node execution result
export interface NodeExecutionResult {
  outputs: Record<string, unknown>;
  logs: string[];
}

// Graph execution context
export interface ExecutionContext {
  workflow: WorkflowDSL;
  secrets: Record<string, string>;
  executionId: string;
}
