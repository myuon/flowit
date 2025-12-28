// Re-export conversion function from schema
export { executionLogFromDb } from "../db/schema";

// ============================================
// Domain Model
// ============================================

export interface ExecutionLog {
  id: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  data: unknown;
  createdAt: string;
}

// ============================================
// Input Types for Creating
// ============================================

export interface CreateExecutionLogInput {
  workflowId: string;
  executionId: string;
  nodeId: string;
  data: unknown;
}

export function createExecutionLogInputFromRequest(body: {
  workflowId: string;
  executionId: string;
  nodeId: string;
  data: unknown;
}): CreateExecutionLogInput {
  return {
    workflowId: body.workflowId,
    executionId: body.executionId,
    nodeId: body.nodeId,
    data: body.data,
  };
}
