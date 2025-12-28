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
