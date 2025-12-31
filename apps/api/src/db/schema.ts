import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

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
  executions: many(executions),
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
    executions: many(executions),
  })
);

// ============================================
// Executions - Workflow execution instances (also serves as task queue)
// ============================================
export const executions = sqliteTable(
  "executions",
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
    // Worker that picked up this task (null if pending)
    workerId: text("worker_id"),
    // Scheduling
    scheduledAt: text("scheduled_at").notNull(),
    // Retry management
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
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
    index("runs_scheduled_at_idx").on(table.scheduledAt),
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
