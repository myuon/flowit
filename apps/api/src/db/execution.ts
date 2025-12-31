import { eq, desc } from "drizzle-orm";
import { db } from "./index";
import { executions, executionLogs } from "./schema";
import type { ExecutionLog } from "../models";

// ============================================
// Type exports
// ============================================
export type Execution = typeof executions.$inferSelect;
export type NewExecution = typeof executions.$inferInsert;

export type DbExecutionLog = typeof executionLogs.$inferSelect;
export type NewExecutionLog = typeof executionLogs.$inferInsert;

// ============================================
// Converters
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
// Execution Repository (also serves as task queue)
// ============================================
export const executionRepository = {
  async create(
    data: Omit<NewExecution, "id" | "createdAt" | "scheduledAt"> & {
      scheduledAt?: Date;
    }
  ): Promise<Execution> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { scheduledAt, ...rest } = data;
    const [result] = await db
      .insert(executions)
      .values({
        id,
        ...rest,
        scheduledAt: (scheduledAt ?? new Date()).toISOString(),
        createdAt: now,
      })
      .returning();
    return result;
  },

  async findById(id: string): Promise<Execution | undefined> {
    return db.query.executions.findFirst({
      where: eq(executions.id, id),
    });
  },

  async findByWorkflowId(
    workflowId: string,
    limit = 50,
    offset = 0
  ): Promise<Execution[]> {
    return db.query.executions.findMany({
      where: eq(executions.workflowId, workflowId),
      orderBy: [desc(executions.createdAt)],
      limit,
      offset,
    });
  },

  // Queue-related methods
  async findPendingExecutions(limit = 10): Promise<Execution[]> {
    return db.query.executions.findMany({
      where: eq(executions.status, "pending"),
      orderBy: [executions.scheduledAt],
      limit,
    });
  },

  async update(
    id: string,
    data: Partial<Omit<Execution, "id" | "createdAt">>
  ): Promise<Execution | undefined> {
    const [result] = await db
      .update(executions)
      .set(data)
      .where(eq(executions.id, id))
      .returning();
    return result;
  },

  async markStarted(id: string, workerId?: string): Promise<Execution | undefined> {
    return this.update(id, {
      status: "running",
      workerId,
      startedAt: new Date().toISOString(),
    });
  },

  async markCompleted(
    id: string,
    outputs: Record<string, unknown>
  ): Promise<Execution | undefined> {
    return this.update(id, {
      status: "success",
      outputs: outputs as unknown as string,
      completedAt: new Date().toISOString(),
    });
  },

  async markFailed(id: string, error: string): Promise<Execution | undefined> {
    const execution = await this.findById(id);
    if (!execution) return undefined;

    return this.update(id, {
      status: "error",
      error,
      retryCount: execution.retryCount + 1,
      completedAt: new Date().toISOString(),
    });
  },
};

// ============================================
// Execution Log Repository
// ============================================
export const executionLogRepository = {
  async create(
    data: Omit<NewExecutionLog, "id" | "createdAt">
  ): Promise<ExecutionLog> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const [result] = await db
      .insert(executionLogs)
      .values({
        id,
        ...data,
        createdAt: now,
      })
      .returning();
    return executionLogFromDb(result);
  },

  async findByWorkflowId(
    workflowId: string,
    limit = 100,
    offset = 0
  ): Promise<ExecutionLog[]> {
    const results = await db.query.executionLogs.findMany({
      where: eq(executionLogs.workflowId, workflowId),
      orderBy: [desc(executionLogs.createdAt)],
      limit,
      offset,
    });
    return results.map(executionLogFromDb);
  },

  async findByExecutionId(executionId: string): Promise<ExecutionLog[]> {
    const results = await db.query.executionLogs.findMany({
      where: eq(executionLogs.executionId, executionId),
      orderBy: [desc(executionLogs.createdAt)],
    });
    return results.map(executionLogFromDb);
  },

  async deleteByWorkflowId(workflowId: string): Promise<number> {
    const result = await db
      .delete(executionLogs)
      .where(eq(executionLogs.workflowId, workflowId));
    return result.rowsAffected;
  },
};
