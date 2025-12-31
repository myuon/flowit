import { eq, desc, and } from "drizzle-orm";
import { db } from "../connection";
import { workflows, workflowVersions } from "../schema";
import type { WorkflowDSL } from "@flowit/shared";
import type { Workflow, WorkflowVersion, WorkflowWithVersions } from "../types";

// ============================================
// Type exports
// ============================================
export type DbWorkflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;

export type DbWorkflowVersion = typeof workflowVersions.$inferSelect;
export type NewWorkflowVersion = typeof workflowVersions.$inferInsert;

// ============================================
// Converters
// ============================================
export function workflowFromDb(dbWorkflow: DbWorkflow): Workflow {
  return {
    id: dbWorkflow.id,
    name: dbWorkflow.name,
    description: dbWorkflow.description,
    createdAt: dbWorkflow.createdAt,
    updatedAt: dbWorkflow.updatedAt,
  };
}

export function workflowVersionFromDb(dbVersion: DbWorkflowVersion): WorkflowVersion {
  return {
    id: dbVersion.id,
    workflowId: dbVersion.workflowId,
    version: dbVersion.version,
    dsl: dbVersion.dsl as WorkflowDSL,
    changelog: dbVersion.changelog,
    createdAt: dbVersion.createdAt,
  };
}

export function workflowWithVersionsFromDb(
  dbWorkflow: DbWorkflow,
  dbVersions: DbWorkflowVersion[]
): WorkflowWithVersions {
  const versions = dbVersions.map(workflowVersionFromDb);
  const currentVersion =
    versions.length > 0
      ? versions.reduce((latest, v) =>
          v.version > latest.version ? v : latest
        )
      : null;

  return {
    ...workflowFromDb(dbWorkflow),
    versions,
    currentVersion,
  };
}

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
