import type { ExecutionLog as DbExecutionLog } from "../db/schema";

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
// Conversion Functions from DB Entity
// ============================================

export function executionLogFromDb(dbLog: DbExecutionLog): ExecutionLog {
  return {
    id: dbLog.id,
    workflowId: dbLog.workflowId,
    executionId: dbLog.executionId,
    nodeId: dbLog.nodeId,
    data: dbLog.data,
    createdAt: dbLog.createdAt,
  };
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
