import { eq, desc, and, lt } from "drizzle-orm";
import { db } from "./index";
import {
  workflows,
  workflowVersions,
  executions,
  executionLogs,
  userTokens,
  users,
  sessions,
  type NewWorkflow,
  type Execution,
  type NewExecution,
  type NewExecutionLog,
  type NewUserToken,
} from "./schema";
import type { WorkflowDSL } from "@flowit/shared";
import {
  type Workflow,
  type WorkflowVersion,
  type WorkflowWithVersions,
  type UserToken,
  type ExecutionLog,
  type Session,
  type User,
} from "../models";
import {
  workflowFromDb,
  workflowVersionFromDb,
  workflowWithVersionsFromDb,
  userTokenFromDb,
  executionLogFromDb,
  sessionFromDb,
  userFromDb,
} from "./schema";

// ============================================
// Workflow Repository
// ============================================
export const workflowRepository = {
  async create(
    data: Omit<NewWorkflow, "id" | "createdAt" | "updatedAt">
  ): Promise<Workflow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const [result] = await db
      .insert(workflows)
      .values({
        id,
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return workflowFromDb(result);
  },

  async findById(id: string): Promise<Workflow | undefined> {
    const result = await db.query.workflows.findFirst({
      where: eq(workflows.id, id),
    });
    return result ? workflowFromDb(result) : undefined;
  },

  async findByIdWithVersions(
    id: string
  ): Promise<WorkflowWithVersions | undefined> {
    const result = await db.query.workflows.findFirst({
      where: eq(workflows.id, id),
      with: {
        versions: {
          orderBy: [desc(workflowVersions.version)],
        },
      },
    });
    if (!result) return undefined;
    return workflowWithVersionsFromDb(result, result.versions);
  },

  async findAll(limit = 50, offset = 0): Promise<Workflow[]> {
    const results = await db.query.workflows.findMany({
      limit,
      offset,
      orderBy: [desc(workflows.updatedAt)],
    });
    return results.map(workflowFromDb);
  },

  async update(
    id: string,
    data: Partial<Omit<Workflow, "id" | "createdAt">>
  ): Promise<Workflow | undefined> {
    const [result] = await db
      .update(workflows)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(workflows.id, id))
      .returning();
    return result ? workflowFromDb(result) : undefined;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(workflows).where(eq(workflows.id, id));
    return result.rowsAffected > 0;
  },
};

// ============================================
// Workflow Version Repository
// ============================================
export const workflowVersionRepository = {
  async create(
    workflowId: string,
    dsl: WorkflowDSL,
    changelog?: string
  ): Promise<WorkflowVersion> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Get the next version number
    const latestVersion = await db.query.workflowVersions.findFirst({
      where: eq(workflowVersions.workflowId, workflowId),
      orderBy: [desc(workflowVersions.version)],
    });
    const nextVersion = (latestVersion?.version ?? 0) + 1;

    const [result] = await db
      .insert(workflowVersions)
      .values({
        id,
        workflowId,
        version: nextVersion,
        dsl: dsl as unknown as string,
        changelog,
        createdAt: now,
      })
      .returning();

    // Update the workflow's current version
    await db
      .update(workflows)
      .set({
        currentVersionId: id,
        updatedAt: now,
      })
      .where(eq(workflows.id, workflowId));

    return workflowVersionFromDb(result);
  },

  async findById(id: string): Promise<WorkflowVersion | undefined> {
    const result = await db.query.workflowVersions.findFirst({
      where: eq(workflowVersions.id, id),
    });
    return result ? workflowVersionFromDb(result) : undefined;
  },

  async findByWorkflowId(
    workflowId: string,
    limit = 50
  ): Promise<WorkflowVersion[]> {
    const results = await db.query.workflowVersions.findMany({
      where: eq(workflowVersions.workflowId, workflowId),
      orderBy: [desc(workflowVersions.version)],
      limit,
    });
    return results.map(workflowVersionFromDb);
  },

  async findByWorkflowAndVersion(
    workflowId: string,
    version: number
  ): Promise<WorkflowVersion | undefined> {
    const result = await db.query.workflowVersions.findFirst({
      where: and(
        eq(workflowVersions.workflowId, workflowId),
        eq(workflowVersions.version, version)
      ),
    });
    return result ? workflowVersionFromDb(result) : undefined;
  },

  async getLatestVersion(
    workflowId: string
  ): Promise<WorkflowVersion | undefined> {
    const result = await db.query.workflowVersions.findFirst({
      where: eq(workflowVersions.workflowId, workflowId),
      orderBy: [desc(workflowVersions.version)],
    });
    return result ? workflowVersionFromDb(result) : undefined;
  },
};

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

// ============================================
// User Token Repository
// ============================================
export const userTokenRepository = {
  async upsert(
    data: Omit<NewUserToken, "id" | "createdAt" | "updatedAt">
  ): Promise<UserToken> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Check if token already exists for this user/provider
    const existing = await this.findByUserAndProvider(
      data.userId,
      data.provider
    );

    if (existing) {
      // Update existing token
      const [result] = await db
        .update(userTokens)
        .set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
          updatedAt: now,
        })
        .where(eq(userTokens.id, existing.id))
        .returning();
      return userTokenFromDb(result);
    }

    // Create new token
    const [result] = await db
      .insert(userTokens)
      .values({
        id,
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return userTokenFromDb(result);
  },

  async findByUserAndProvider(
    userId: string,
    provider: string
  ): Promise<UserToken | undefined> {
    const result = await db.query.userTokens.findFirst({
      where: and(
        eq(userTokens.userId, userId),
        eq(userTokens.provider, provider)
      ),
    });
    return result ? userTokenFromDb(result) : undefined;
  },

  async findByUserId(userId: string): Promise<UserToken[]> {
    const results = await db.query.userTokens.findMany({
      where: eq(userTokens.userId, userId),
    });
    return results.map(userTokenFromDb);
  },

  async delete(userId: string, provider: string): Promise<boolean> {
    const result = await db
      .delete(userTokens)
      .where(
        and(eq(userTokens.userId, userId), eq(userTokens.provider, provider))
      );
    return result.rowsAffected > 0;
  },
};

// ============================================
// Session Repository
// ============================================
export const sessionRepository = {
  async create(userId: string, expiresAt: Date): Promise<Session> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const [result] = await db
      .insert(sessions)
      .values({
        id,
        userId,
        expiresAt: expiresAt.toISOString(),
        createdAt: now,
      })
      .returning();
    return sessionFromDb(result);
  },

  async findById(id: string): Promise<Session | undefined> {
    const result = await db.query.sessions.findFirst({
      where: eq(sessions.id, id),
    });
    return result ? sessionFromDb(result) : undefined;
  },

  async findValidById(id: string): Promise<Session | undefined> {
    const now = new Date().toISOString();
    const result = await db.query.sessions.findFirst({
      where: eq(sessions.id, id),
    });
    if (!result) return undefined;
    // Check if session is expired
    if (result.expiresAt < now) {
      return undefined;
    }
    return sessionFromDb(result);
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(sessions).where(eq(sessions.id, id));
    return result.rowsAffected > 0;
  },

  async deleteByUserId(userId: string): Promise<number> {
    const result = await db.delete(sessions).where(eq(sessions.userId, userId));
    return result.rowsAffected;
  },

  async deleteExpired(): Promise<number> {
    const now = new Date().toISOString();
    const result = await db.delete(sessions).where(lt(sessions.expiresAt, now));
    return result.rowsAffected;
  },
};

// ============================================
// User Repository
// ============================================
export const userRepository = {
  async upsert(data: {
    id: string;
    email: string;
    name?: string | null;
    picture?: string | null;
  }): Promise<User> {
    const now = new Date().toISOString();
    const existing = await db.query.users.findFirst({
      where: eq(users.id, data.id),
    });

    if (existing) {
      // Update existing user
      const [result] = await db
        .update(users)
        .set({
          email: data.email,
          name: data.name ?? existing.name,
          picture: data.picture ?? existing.picture,
          updatedAt: now,
        })
        .where(eq(users.id, data.id))
        .returning();
      return userFromDb(result);
    } else {
      // Create new user
      const [result] = await db
        .insert(users)
        .values({
          id: data.id,
          email: data.email,
          name: data.name,
          picture: data.picture,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return userFromDb(result);
    }
  },

  async findById(id: string): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    return result ? userFromDb(result) : undefined;
  },
};

