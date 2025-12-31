import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq, desc } from "drizzle-orm";
import * as schema from "./schema";
import type { WorkflowDSL } from "@flowit/shared";

// Create a test database (in-memory)
const testClient = createClient({
  url: ":memory:",
});
const testDb = drizzle(testClient, { schema });

// Create test-specific repository functions
const createTestRepositories = (db: typeof testDb) => {
  const { workflows, workflowVersions, executions } = schema;

  return {
    workflow: {
      async create(data: { name: string; description?: string }) {
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
      async findById(id: string) {
        return db.query.workflows.findFirst({
          where: eq(workflows.id, id),
        });
      },
      async findAll() {
        return db.query.workflows.findMany();
      },
      async update(id: string, data: { name?: string; description?: string }) {
        const [result] = await db
          .update(workflows)
          .set({ ...data, updatedAt: new Date().toISOString() })
          .where(eq(workflows.id, id))
          .returning();
        return result;
      },
      async delete(id: string) {
        const result = await db.delete(workflows).where(eq(workflows.id, id));
        return result.rowsAffected > 0;
      },
    },
    version: {
      async create(workflowId: string, dsl: WorkflowDSL, changelog?: string) {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
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
        await db
          .update(workflows)
          .set({ currentVersionId: id, updatedAt: now })
          .where(eq(workflows.id, workflowId));
        return result;
      },
      async findByWorkflowId(workflowId: string) {
        return db.query.workflowVersions.findMany({
          where: eq(workflowVersions.workflowId, workflowId),
          orderBy: [desc(workflowVersions.version)],
        });
      },
    },
    run: {
      async create(data: {
        workflowId: string;
        versionId: string;
        status: "pending" | "running" | "success" | "error" | "cancelled";
        inputs?: unknown;
        scheduledAt?: Date;
      }) {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const [result] = await db
          .insert(executions)
          .values({
            id,
            workflowId: data.workflowId,
            versionId: data.versionId,
            status: data.status,
            inputs: data.inputs as string,
            scheduledAt: (data.scheduledAt ?? new Date()).toISOString(),
            createdAt: now,
          })
          .returning();
        return result;
      },
      async findById(id: string) {
        return db.query.executions.findFirst({
          where: eq(executions.id, id),
        });
      },
      async update(
        id: string,
        data: { status?: string; outputs?: unknown; error?: string }
      ) {
        const [result] = await db
          .update(executions)
          .set(data as Record<string, unknown>)
          .where(eq(executions.id, id))
          .returning();
        return result;
      },
    },
  };
};

describe("Repository", () => {
  let repos: ReturnType<typeof createTestRepositories>;

  beforeAll(async () => {
    // Create tables manually for in-memory testing
    await testClient.execute(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        current_version_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    await testClient.execute(`
      CREATE TABLE IF NOT EXISTS workflow_versions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        dsl TEXT NOT NULL,
        changelog TEXT,
        created_at TEXT NOT NULL
      )
    `);
    await testClient.execute(`
      CREATE TABLE IF NOT EXISTS executions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        version_id TEXT NOT NULL REFERENCES workflow_versions(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        inputs TEXT,
        outputs TEXT,
        error TEXT,
        worker_id TEXT,
        scheduled_at TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL
      )
    `);
  });

  beforeEach(async () => {
    repos = createTestRepositories(testDb);
    // Clean up tables before each test
    await testClient.execute("DELETE FROM executions");
    await testClient.execute("DELETE FROM workflow_versions");
    await testClient.execute("DELETE FROM workflows");
  });

  describe("workflowRepository", () => {
    it("should create a workflow", async () => {
      const workflow = await repos.workflow.create({
        name: "Test Workflow",
        description: "A test workflow",
      });

      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe("Test Workflow");
      expect(workflow.description).toBe("A test workflow");
      expect(workflow.createdAt).toBeDefined();
    });

    it("should find a workflow by id", async () => {
      const created = await repos.workflow.create({ name: "Find Me" });
      const found = await repos.workflow.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe("Find Me");
    });

    it("should update a workflow", async () => {
      const created = await repos.workflow.create({ name: "Original" });
      const updated = await repos.workflow.update(created.id, {
        name: "Updated",
      });

      expect(updated?.name).toBe("Updated");
    });

    it("should delete a workflow", async () => {
      const created = await repos.workflow.create({ name: "Delete Me" });
      const deleted = await repos.workflow.delete(created.id);
      const found = await repos.workflow.findById(created.id);

      expect(deleted).toBe(true);
      expect(found).toBeUndefined();
    });
  });

  describe("workflowVersionRepository", () => {
    it("should create versions with incrementing version numbers", async () => {
      const workflow = await repos.workflow.create({ name: "Versioned" });

      const mockDsl: WorkflowDSL = {
        dslVersion: "0.1.0",
        meta: { name: "Test", version: "1.0.0", status: "draft" },
        inputs: {},
        outputs: {},
        secrets: [],
        nodes: [],
        edges: [],
      };

      const v1 = await repos.version.create(workflow.id, mockDsl, "Initial");
      const v2 = await repos.version.create(workflow.id, mockDsl, "Update 1");
      const v3 = await repos.version.create(workflow.id, mockDsl, "Update 2");

      expect(v1.version).toBe(1);
      expect(v2.version).toBe(2);
      expect(v3.version).toBe(3);
    });

    it("should find versions by workflow id", async () => {
      const workflow = await repos.workflow.create({ name: "With Versions" });
      const mockDsl: WorkflowDSL = {
        dslVersion: "0.1.0",
        meta: { name: "Test", version: "1.0.0", status: "draft" },
        inputs: {},
        outputs: {},
        secrets: [],
        nodes: [],
        edges: [],
      };

      await repos.version.create(workflow.id, mockDsl);
      await repos.version.create(workflow.id, mockDsl);

      const versions = await repos.version.findByWorkflowId(workflow.id);
      expect(versions).toHaveLength(2);
      // Should be ordered by version desc
      expect(versions[0].version).toBe(2);
      expect(versions[1].version).toBe(1);
    });
  });

  describe("runRepository", () => {
    it("should create and update a run", async () => {
      const workflow = await repos.workflow.create({ name: "Run Test" });
      const mockDsl: WorkflowDSL = {
        dslVersion: "0.1.0",
        meta: { name: "Test", version: "1.0.0", status: "draft" },
        inputs: {},
        outputs: {},
        secrets: [],
        nodes: [],
        edges: [],
      };
      const version = await repos.version.create(workflow.id, mockDsl);

      const run = await repos.run.create({
        workflowId: workflow.id,
        versionId: version.id,
        status: "pending",
        inputs: { test: true },
      });

      expect(run.status).toBe("pending");

      const updated = await repos.run.update(run.id, { status: "running" });
      expect(updated?.status).toBe("running");
    });
  });

});
