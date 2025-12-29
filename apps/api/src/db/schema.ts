import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import type { WorkflowDSL } from "@flowit/shared";

// ============================================
// Workflows - The main workflow definition
// ============================================
export const workflows = sqliteTable(
  "workflows",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    // Current active version ID
    currentVersionId: text("current_version_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("workflows_name_idx").on(table.name),
    index("workflows_updated_at_idx").on(table.updatedAt),
  ]
);

export const workflowsRelations = relations(workflows, ({ many, one }) => ({
  versions: many(workflowVersions),
  runs: many(runs),
  currentVersion: one(workflowVersions, {
    fields: [workflows.currentVersionId],
    references: [workflowVersions.id],
  }),
}));

// ============================================
// Workflow Versions - Versioned workflow DSL
// ============================================
export const workflowVersions = sqliteTable(
  "workflow_versions",
  {
    id: text("id").primaryKey(),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    // The complete DSL JSON
    dsl: text("dsl", { mode: "json" }).notNull(),
    // Optional changelog/description for this version
    changelog: text("changelog"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("versions_workflow_id_idx").on(table.workflowId),
    index("versions_workflow_version_idx").on(table.workflowId, table.version),
  ]
);

export const workflowVersionsRelations = relations(
  workflowVersions,
  ({ one, many }) => ({
    workflow: one(workflows, {
      fields: [workflowVersions.workflowId],
      references: [workflows.id],
    }),
    runs: many(runs),
  })
);

// ============================================
// Runs - Workflow execution instances
// ============================================
export const runs = sqliteTable(
  "runs",
  {
    id: text("id").primaryKey(),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    versionId: text("version_id")
      .notNull()
      .references(() => workflowVersions.id, { onDelete: "cascade" }),
    // Execution status
    status: text("status", {
      enum: ["pending", "running", "success", "error", "cancelled"],
    }).notNull(),
    // Input data for this run
    inputs: text("inputs", { mode: "json" }),
    // Final outputs
    outputs: text("outputs", { mode: "json" }),
    // Error message if failed
    error: text("error"),
    // Timing
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("runs_workflow_id_idx").on(table.workflowId),
    index("runs_version_id_idx").on(table.versionId),
    index("runs_status_idx").on(table.status),
    index("runs_created_at_idx").on(table.createdAt),
  ]
);

export const runsRelations = relations(runs, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [runs.workflowId],
    references: [workflows.id],
  }),
  version: one(workflowVersions, {
    fields: [runs.versionId],
    references: [workflowVersions.id],
  }),
  steps: many(runSteps),
}));

// ============================================
// Run Steps - Individual node executions within a run
// ============================================
export const runSteps = sqliteTable(
  "run_steps",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    // Node info
    nodeId: text("node_id").notNull(),
    nodeType: text("node_type").notNull(),
    // Execution order
    stepOrder: integer("step_order").notNull(),
    // Step status
    status: text("status", {
      enum: ["pending", "running", "success", "error", "skipped"],
    }).notNull(),
    // Inputs received by this node
    inputs: text("inputs", { mode: "json" }),
    // Outputs produced by this node
    outputs: text("outputs", { mode: "json" }),
    // Error message if failed
    error: text("error"),
    // Logs from this step
    logs: text("logs", { mode: "json" }),
    // Timing
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
  },
  (table) => [
    index("run_steps_run_id_idx").on(table.runId),
    index("run_steps_node_id_idx").on(table.nodeId),
    index("run_steps_order_idx").on(table.runId, table.stepOrder),
  ]
);

export const runStepsRelations = relations(runSteps, ({ one }) => ({
  run: one(runs, {
    fields: [runSteps.runId],
    references: [runs.id],
  }),
}));

// ============================================
// Node Catalog Cache - Cached node definitions
// ============================================
export const nodeCatalogCache = sqliteTable(
  "node_catalog_cache",
  {
    id: text("id").primaryKey(),
    // Node type identifier (e.g., "text-input", "llm", "http-request")
    nodeType: text("node_type").notNull().unique(),
    // Display info
    displayName: text("display_name").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    icon: text("icon"),
    // Schema definitions
    inputsSchema: text("inputs_schema", { mode: "json" }),
    outputsSchema: text("outputs_schema", { mode: "json" }),
    paramsSchema: text("params_schema", { mode: "json" }),
    // Tags for search
    tags: text("tags", { mode: "json" }),
    // Cache metadata
    cachedAt: text("cached_at").notNull(),
  },
  (table) => [
    index("node_catalog_category_idx").on(table.category),
    index("node_catalog_cached_at_idx").on(table.cachedAt),
  ]
);

// ============================================
// Execution Logs - Logs from log nodes
// ============================================
export const executionLogs = sqliteTable(
  "execution_logs",
  {
    id: text("id").primaryKey(),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    executionId: text("execution_id").notNull(),
    nodeId: text("node_id").notNull(),
    // Serialized log data
    data: text("data", { mode: "json" }).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("execution_logs_workflow_id_idx").on(table.workflowId),
    index("execution_logs_execution_id_idx").on(table.executionId),
    index("execution_logs_created_at_idx").on(table.createdAt),
  ]
);

export const executionLogsRelations = relations(executionLogs, ({ one }) => ({
  workflow: one(workflows, {
    fields: [executionLogs.workflowId],
    references: [workflows.id],
  }),
}));

// ============================================
// User Tokens - OAuth tokens for external APIs
// ============================================
export const userTokens = sqliteTable(
  "user_tokens",
  {
    id: text("id").primaryKey(),
    // User identifier (sub from OIDC)
    userId: text("user_id").notNull(),
    // Token provider (e.g., "google")
    provider: text("provider").notNull(),
    // OAuth tokens (encrypted in production)
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    // Token expiry
    expiresAt: text("expires_at"),
    // Metadata
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("user_tokens_user_id_idx").on(table.userId),
    index("user_tokens_user_provider_idx").on(table.userId, table.provider),
  ]
);

// ============================================
// Users - User profile information
// ============================================
export const users = sqliteTable("users", {
  // User identifier (sub from OIDC)
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  picture: text("picture"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ============================================
// Sessions - User session management
// ============================================
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ]
);

// ============================================
// App Configuration - Key-value settings
// ============================================
export const appConfig = sqliteTable("app_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ============================================
// Type exports for use in application
// ============================================
export type AppConfig = typeof appConfig.$inferSelect;
export type NewAppConfig = typeof appConfig.$inferInsert;

export function appConfigFromDb(dbConfig: AppConfig) {
  return {
    key: dbConfig.key,
    value: dbConfig.value,
    updatedAt: dbConfig.updatedAt,
  };
}

export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;

export function workflowFromDb(dbWorkflow: Workflow) {
  return {
    id: dbWorkflow.id,
    name: dbWorkflow.name,
    description: dbWorkflow.description,
    createdAt: dbWorkflow.createdAt,
    updatedAt: dbWorkflow.updatedAt,
  };
}

export type WorkflowVersion = typeof workflowVersions.$inferSelect;
export type NewWorkflowVersion = typeof workflowVersions.$inferInsert;

export function workflowVersionFromDb(dbVersion: WorkflowVersion) {
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
  dbWorkflow: Workflow,
  dbVersions: WorkflowVersion[]
) {
  const versions = dbVersions.map(workflowVersionFromDb);
  const currentVersion =
    versions.length > 0
      ? versions.reduce((latest, v) => (v.version > latest.version ? v : latest))
      : null;

  return {
    ...workflowFromDb(dbWorkflow),
    versions,
    currentVersion,
  };
}

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;

export type RunStep = typeof runSteps.$inferSelect;
export type NewRunStep = typeof runSteps.$inferInsert;

export type NodeCatalogCacheEntry = typeof nodeCatalogCache.$inferSelect;
export type NewNodeCatalogCacheEntry = typeof nodeCatalogCache.$inferInsert;

export type ExecutionLog = typeof executionLogs.$inferSelect;
export type NewExecutionLog = typeof executionLogs.$inferInsert;

export function executionLogFromDb(dbLog: ExecutionLog) {
  return {
    id: dbLog.id,
    workflowId: dbLog.workflowId,
    executionId: dbLog.executionId,
    nodeId: dbLog.nodeId,
    data: dbLog.data,
    createdAt: dbLog.createdAt,
  };
}

export type UserToken = typeof userTokens.$inferSelect;
export type NewUserToken = typeof userTokens.$inferInsert;

export function userTokenFromDb(dbToken: UserToken) {
  return {
    id: dbToken.id,
    userId: dbToken.userId,
    provider: dbToken.provider,
    accessToken: dbToken.accessToken,
    refreshToken: dbToken.refreshToken,
    expiresAt: dbToken.expiresAt,
    createdAt: dbToken.createdAt,
    updatedAt: dbToken.updatedAt,
  };
}

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export function sessionFromDb(dbSession: Session) {
  return {
    id: dbSession.id,
    userId: dbSession.userId,
    expiresAt: dbSession.expiresAt,
    createdAt: dbSession.createdAt,
  };
}

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export function userFromDb(dbUser: User) {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    picture: dbUser.picture,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
  };
}
