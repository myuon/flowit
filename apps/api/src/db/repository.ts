import { eq, desc, and } from "drizzle-orm";
import { db } from "./index";
import {
  workflows,
  workflowVersions,
  runs,
  runSteps,
  nodeCatalogCache,
  executionLogs,
  userTokens,
  type Workflow,
  type NewWorkflow,
  type WorkflowVersion,
  type Run,
  type NewRun,
  type RunStep,
  type NewRunStep,
  type NodeCatalogCacheEntry,
  type NewNodeCatalogCacheEntry,
  type ExecutionLog,
  type NewExecutionLog,
  type UserToken,
  type NewUserToken,
} from "./schema";
import type { WorkflowDSL } from "@flowit/shared";

// ============================================
// Workflow Repository
// ============================================
export const workflowRepository = {
  async create(data: Omit<NewWorkflow, "id" | "createdAt" | "updatedAt">): Promise<Workflow> {
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
    return result;
  },

  async findById(id: string): Promise<Workflow | undefined> {
    return db.query.workflows.findFirst({
      where: eq(workflows.id, id),
    });
  },

  async findByIdWithVersions(id: string) {
    return db.query.workflows.findFirst({
      where: eq(workflows.id, id),
      with: {
        versions: {
          orderBy: [desc(workflowVersions.version)],
        },
      },
    });
  },

  async findAll(limit = 50, offset = 0): Promise<Workflow[]> {
    return db.query.workflows.findMany({
      limit,
      offset,
      orderBy: [desc(workflows.updatedAt)],
    });
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
    return result;
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

    return result;
  },

  async findById(id: string): Promise<WorkflowVersion | undefined> {
    return db.query.workflowVersions.findFirst({
      where: eq(workflowVersions.id, id),
    });
  },

  async findByWorkflowId(
    workflowId: string,
    limit = 50
  ): Promise<WorkflowVersion[]> {
    return db.query.workflowVersions.findMany({
      where: eq(workflowVersions.workflowId, workflowId),
      orderBy: [desc(workflowVersions.version)],
      limit,
    });
  },

  async findByWorkflowAndVersion(
    workflowId: string,
    version: number
  ): Promise<WorkflowVersion | undefined> {
    return db.query.workflowVersions.findFirst({
      where: and(
        eq(workflowVersions.workflowId, workflowId),
        eq(workflowVersions.version, version)
      ),
    });
  },

  async getLatestVersion(workflowId: string): Promise<WorkflowVersion | undefined> {
    return db.query.workflowVersions.findFirst({
      where: eq(workflowVersions.workflowId, workflowId),
      orderBy: [desc(workflowVersions.version)],
    });
  },
};

// ============================================
// Run Repository
// ============================================
export const runRepository = {
  async create(
    data: Omit<NewRun, "id" | "createdAt">
  ): Promise<Run> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const [result] = await db
      .insert(runs)
      .values({
        id,
        ...data,
        createdAt: now,
      })
      .returning();
    return result;
  },

  async findById(id: string): Promise<Run | undefined> {
    return db.query.runs.findFirst({
      where: eq(runs.id, id),
    });
  },

  async findByIdWithSteps(id: string) {
    return db.query.runs.findFirst({
      where: eq(runs.id, id),
      with: {
        steps: {
          orderBy: [runSteps.stepOrder],
        },
      },
    });
  },

  async findByWorkflowId(
    workflowId: string,
    limit = 50,
    offset = 0
  ): Promise<Run[]> {
    return db.query.runs.findMany({
      where: eq(runs.workflowId, workflowId),
      orderBy: [desc(runs.createdAt)],
      limit,
      offset,
    });
  },

  async update(
    id: string,
    data: Partial<Omit<Run, "id" | "createdAt">>
  ): Promise<Run | undefined> {
    const [result] = await db
      .update(runs)
      .set(data)
      .where(eq(runs.id, id))
      .returning();
    return result;
  },

  async markStarted(id: string): Promise<Run | undefined> {
    return this.update(id, {
      status: "running",
      startedAt: new Date().toISOString(),
    });
  },

  async markCompleted(
    id: string,
    outputs: Record<string, unknown>
  ): Promise<Run | undefined> {
    return this.update(id, {
      status: "success",
      outputs: outputs as unknown as string,
      completedAt: new Date().toISOString(),
    });
  },

  async markFailed(id: string, error: string): Promise<Run | undefined> {
    return this.update(id, {
      status: "error",
      error,
      completedAt: new Date().toISOString(),
    });
  },
};

// ============================================
// Run Step Repository
// ============================================
export const runStepRepository = {
  async create(data: Omit<NewRunStep, "id">): Promise<RunStep> {
    const id = crypto.randomUUID();
    const [result] = await db
      .insert(runSteps)
      .values({
        id,
        ...data,
      })
      .returning();
    return result;
  },

  async createMany(
    steps: Omit<NewRunStep, "id">[]
  ): Promise<RunStep[]> {
    if (steps.length === 0) return [];
    const stepsWithIds = steps.map((step) => ({
      id: crypto.randomUUID(),
      ...step,
    }));
    return db.insert(runSteps).values(stepsWithIds).returning();
  },

  async findByRunId(runId: string): Promise<RunStep[]> {
    return db.query.runSteps.findMany({
      where: eq(runSteps.runId, runId),
      orderBy: [runSteps.stepOrder],
    });
  },

  async update(
    id: string,
    data: Partial<Omit<RunStep, "id">>
  ): Promise<RunStep | undefined> {
    const [result] = await db
      .update(runSteps)
      .set(data)
      .where(eq(runSteps.id, id))
      .returning();
    return result;
  },

  async markStarted(id: string): Promise<RunStep | undefined> {
    return this.update(id, {
      status: "running",
      startedAt: new Date().toISOString(),
    });
  },

  async markCompleted(
    id: string,
    outputs: Record<string, unknown>,
    logs: string[]
  ): Promise<RunStep | undefined> {
    return this.update(id, {
      status: "success",
      outputs: outputs as unknown as string,
      logs: logs as unknown as string,
      completedAt: new Date().toISOString(),
    });
  },

  async markFailed(
    id: string,
    error: string,
    logs: string[]
  ): Promise<RunStep | undefined> {
    return this.update(id, {
      status: "error",
      error,
      logs: logs as unknown as string,
      completedAt: new Date().toISOString(),
    });
  },

  async markSkipped(id: string): Promise<RunStep | undefined> {
    return this.update(id, {
      status: "skipped",
      completedAt: new Date().toISOString(),
    });
  },
};

// ============================================
// Node Catalog Cache Repository
// ============================================
export const nodeCatalogCacheRepository = {
  async upsert(
    data: Omit<NewNodeCatalogCacheEntry, "id" | "cachedAt">
  ): Promise<NodeCatalogCacheEntry> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const [result] = await db
      .insert(nodeCatalogCache)
      .values({
        id,
        ...data,
        cachedAt: now,
      })
      .onConflictDoUpdate({
        target: nodeCatalogCache.nodeType,
        set: {
          displayName: data.displayName,
          description: data.description,
          category: data.category,
          icon: data.icon,
          inputsSchema: data.inputsSchema,
          outputsSchema: data.outputsSchema,
          paramsSchema: data.paramsSchema,
          tags: data.tags,
          cachedAt: now,
        },
      })
      .returning();

    return result;
  },

  async findByNodeType(
    nodeType: string
  ): Promise<NodeCatalogCacheEntry | undefined> {
    return db.query.nodeCatalogCache.findFirst({
      where: eq(nodeCatalogCache.nodeType, nodeType),
    });
  },

  async findByCategory(category: string): Promise<NodeCatalogCacheEntry[]> {
    return db.query.nodeCatalogCache.findMany({
      where: eq(nodeCatalogCache.category, category),
    });
  },

  async findAll(): Promise<NodeCatalogCacheEntry[]> {
    return db.query.nodeCatalogCache.findMany();
  },

  async refreshFromRegistry(
    nodes: Array<{
      id: string;
      displayName: string;
      description?: string;
      category: string;
      icon?: string;
      inputs: Record<string, unknown>;
      outputs: Record<string, unknown>;
      paramsSchema: Record<string, unknown>;
      tags?: string[];
    }>
  ): Promise<void> {
    for (const node of nodes) {
      await this.upsert({
        nodeType: node.id,
        displayName: node.displayName,
        description: node.description,
        category: node.category,
        icon: node.icon,
        inputsSchema: node.inputs as unknown as string,
        outputsSchema: node.outputs as unknown as string,
        paramsSchema: node.paramsSchema as unknown as string,
        tags: node.tags as unknown as string,
      });
    }
  },

  async clear(): Promise<void> {
    await db.delete(nodeCatalogCache);
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
    return result;
  },

  async findByWorkflowId(
    workflowId: string,
    limit = 100,
    offset = 0
  ): Promise<ExecutionLog[]> {
    return db.query.executionLogs.findMany({
      where: eq(executionLogs.workflowId, workflowId),
      orderBy: [desc(executionLogs.createdAt)],
      limit,
      offset,
    });
  },

  async findByExecutionId(executionId: string): Promise<ExecutionLog[]> {
    return db.query.executionLogs.findMany({
      where: eq(executionLogs.executionId, executionId),
      orderBy: [desc(executionLogs.createdAt)],
    });
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
    const existing = await this.findByUserAndProvider(data.userId, data.provider);

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
      return result;
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
    return result;
  },

  async findByUserAndProvider(
    userId: string,
    provider: string
  ): Promise<UserToken | undefined> {
    return db.query.userTokens.findFirst({
      where: and(
        eq(userTokens.userId, userId),
        eq(userTokens.provider, provider)
      ),
    });
  },

  async findByUserId(userId: string): Promise<UserToken[]> {
    return db.query.userTokens.findMany({
      where: eq(userTokens.userId, userId),
    });
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
