// Re-export conversion function from db
export { executionLogFromDb } from "../db/execution";

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
