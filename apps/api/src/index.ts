import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type {
  ExecuteWorkflowRequest,
  ExecuteWorkflowResponse,
  AppSettings,
  Language,
} from "@flowit/shared";
import { DEFAULT_APP_SETTINGS } from "@flowit/shared";
import { runWorkflow, validateWorkflow } from "./executor";
import { jwtAuth, getAuthConfig, type AuthVariables } from "./auth";
import { createOAuthRoutes, getOAuthConfig } from "./auth/oauth";
import { db, appConfig } from "./db";
import {
  workflowRepository,
  workflowVersionRepository,
  executionLogRepository,
  userTokenRepository,
} from "./db/repository";
import type { WriteLogFn } from "./executor";

// Create writeLog function for execution logs
const writeLog: WriteLogFn = async (workflowId, executionId, nodeId, data) => {
  await executionLogRepository.create({
    workflowId,
    executionId,
    nodeId,
    data: data as string,
  });
};

const app = new Hono();

// Logger middleware
app.use("*", logger());

// CORS configuration
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// Auth configuration
const authConfig = getAuthConfig();
const requireAuth = jwtAuth(authConfig);

// OAuth routes (login, callback, logout)
const oauthConfig = getOAuthConfig();
const oauthRoutes = createOAuthRoutes(oauthConfig);
app.route("/auth", oauthRoutes);

// Public endpoints
app.get("/", (c) => {
  return c.json({ message: "Flowit API", version: "0.1.0" });
});

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Check if user is admin
function isAdmin(userId: string): boolean {
  const adminIds = process.env.ADMIN_USER_IDS || "";
  const adminList = adminIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return adminList.includes(userId);
}

// Auth info endpoint (returns current user if authenticated)
app.get("/auth/me", requireAuth, (c) => {
  const user = c.get("user");
  return c.json({ user, isAdmin: isAdmin(user.sub) });
});

// Protected API routes
const api = new Hono<{ Variables: AuthVariables }>();
api.use("*", requireAuth);

// Validate a workflow without executing
api.post("/validate", async (c) => {
  const body = await c.req.json<{
    workflow: ExecuteWorkflowRequest["workflow"];
  }>();
  const errors = validateWorkflow(body.workflow);

  return c.json({
    valid: errors.length === 0,
    errors,
  });
});

// ============================================
// Workflow CRUD endpoints
// ============================================

// List all workflows
api.get("/workflows", async (c) => {
  const workflows = await workflowRepository.findAll();
  return c.json({ workflows });
});

// Get a single workflow with versions
api.get("/workflows/:id", async (c) => {
  const id = c.req.param("id");
  const workflow = await workflowRepository.findByIdWithVersions(id);

  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  return c.json({ workflow });
});

// Create a new workflow
api.post("/workflows", async (c) => {
  const body = await c.req.json<{
    name: string;
    description?: string;
    dsl?: ExecuteWorkflowRequest["workflow"];
  }>();

  const workflow = await workflowRepository.create({
    name: body.name || "Untitled Workflow",
    description: body.description,
  });

  // Create initial version if DSL provided
  if (body.dsl) {
    await workflowVersionRepository.create(workflow.id, body.dsl);
  }

  return c.json({ workflow }, 201);
});

// Update a workflow
api.put("/workflows/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    name?: string;
    description?: string;
    dsl?: ExecuteWorkflowRequest["workflow"];
  }>();

  const existing = await workflowRepository.findById(id);
  if (!existing) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  // Update workflow metadata
  const workflow = await workflowRepository.update(id, {
    name: body.name,
    description: body.description,
  });

  // Create new version if DSL provided
  if (body.dsl) {
    await workflowVersionRepository.create(id, body.dsl);
  }

  return c.json({ workflow });
});

// Publish a workflow (create a new version and set it as current)
api.post("/workflows/:id/publish", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    dsl: ExecuteWorkflowRequest["workflow"];
    changelog?: string;
  }>();

  const existing = await workflowRepository.findById(id);
  if (!existing) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  if (!body.dsl) {
    return c.json({ error: "DSL is required" }, 400);
  }

  // Create a new version (this also sets it as current)
  const version = await workflowVersionRepository.create(
    id,
    body.dsl,
    body.changelog
  );

  return c.json({ version });
});

// Delete a workflow
api.delete("/workflows/:id", async (c) => {
  const id = c.req.param("id");
  const deleted = await workflowRepository.delete(id);

  if (!deleted) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  return c.json({ success: true });
});

// Get execution logs for a workflow
api.get("/workflows/:id/logs", async (c) => {
  const id = c.req.param("id");
  const limit = parseInt(c.req.query("limit") || "100");
  const offset = parseInt(c.req.query("offset") || "0");

  const workflow = await workflowRepository.findById(id);
  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const logs = await executionLogRepository.findByWorkflowId(id, limit, offset);
  return c.json({ logs });
});

// Delete execution logs for a workflow
api.delete("/workflows/:id/logs", async (c) => {
  const id = c.req.param("id");

  const workflow = await workflowRepository.findById(id);
  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const count = await executionLogRepository.deleteByWorkflowId(id);
  return c.json({ deleted: count });
});

// Execute a workflow
api.post("/execute", async (c) => {
  const body = await c.req.json<ExecuteWorkflowRequest>();
  const user = c.get("user");

  // Validate first
  const validationErrors = validateWorkflow(body.workflow);
  if (validationErrors.length > 0) {
    const response: ExecuteWorkflowResponse = {
      outputs: {},
      executionId: crypto.randomUUID(),
      status: "error",
      error: `Validation failed: ${validationErrors.join(", ")}`,
    };
    return c.json(response, 400);
  }

  // Get workflowId from the request body if available
  const workflowId = body.workflow.meta?.id;

  // Build secrets with user's stored OAuth tokens
  const secrets: Record<string, string> = { ...body.secrets };

  // Inject Google access token if available
  const googleToken = await userTokenRepository.findByUserAndProvider(
    user.sub,
    "google"
  );
  if (googleToken) {
    secrets._google_access_token = googleToken.accessToken;
  }

  // Run the workflow
  const result = await runWorkflow({
    workflow: body.workflow,
    inputs: body.inputs,
    secrets,
    workflowId,
    writeLog: workflowId ? writeLog : undefined,
  });

  const response: ExecuteWorkflowResponse = {
    outputs: result.outputs,
    executionId: result.executionId,
    status: result.status,
    error: result.error,
  };

  return c.json(response, result.status === "error" ? 500 : 200);
});

// Mount protected API routes
app.route("/api", api);

// ============================================
// Configuration endpoints
// ============================================

// Get app settings (public - needed for i18n before login)
app.get("/config/settings", async (c) => {
  const settings: AppSettings = { ...DEFAULT_APP_SETTINGS };

  const rows = await db.select().from(appConfig);
  for (const row of rows) {
    if (row.key === "language" && (row.value === "en" || row.value === "ja")) {
      settings.language = row.value as Language;
    }
  }

  return c.json(settings);
});

// Admin routes for configuration
const admin = new Hono<{ Variables: AuthVariables }>();
admin.use("*", requireAuth);

// Middleware to check admin status
admin.use("*", async (c, next) => {
  const user = c.get("user");
  if (!isAdmin(user.sub)) {
    return c.json({ error: "Admin access required" }, 403);
  }
  await next();
});

// Update app settings
admin.put("/settings", async (c) => {
  const body = await c.req.json<Partial<AppSettings>>();
  const now = new Date().toISOString();

  if (body.language) {
    if (body.language !== "en" && body.language !== "ja") {
      return c.json({ error: "Invalid language" }, 400);
    }

    await db
      .insert(appConfig)
      .values({ key: "language", value: body.language, updatedAt: now })
      .onConflictDoUpdate({
        target: appConfig.key,
        set: { value: body.language, updatedAt: now },
      });
  }

  // Return updated settings
  const settings: AppSettings = { ...DEFAULT_APP_SETTINGS };
  const rows = await db.select().from(appConfig);
  for (const row of rows) {
    if (row.key === "language" && (row.value === "en" || row.value === "ja")) {
      settings.language = row.value as Language;
    }
  }

  return c.json(settings);
});

// Mount admin routes
app.route("/admin", admin);

// ============================================
// Webhook endpoints (public - no auth required)
// ============================================

// Webhook trigger endpoint
app.all("/webhooks/:workflowId", async (c) => {
  const workflowId = c.req.param("workflowId");
  const method = c.req.method;

  // Find the workflow
  const workflow = await workflowRepository.findByIdWithVersions(workflowId);
  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  // Get the current version
  if (!workflow.currentVersionId) {
    return c.json({ error: "Workflow has no published version" }, 400);
  }

  const version = workflow.versions.find(
    (v) => v.id === workflow.currentVersionId
  );
  if (!version) {
    return c.json({ error: "Workflow version not found" }, 404);
  }

  const dsl = version.dsl as ExecuteWorkflowRequest["workflow"];

  // Check if workflow has a webhook trigger node
  const webhookNode = dsl.nodes.find((n) => n.type === "webhook-trigger");
  if (!webhookNode) {
    return c.json({ error: "Workflow does not have a webhook trigger" }, 400);
  }

  // Check if method matches
  const allowedMethod =
    (webhookNode.params?.method as { value: string })?.value || "POST";
  if (method !== allowedMethod && method !== "OPTIONS") {
    return c.json(
      { error: `Method ${method} not allowed. Expected ${allowedMethod}` },
      405
    );
  }

  // Handle OPTIONS for CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  // Get webhook input data
  let body = {};
  if (method === "POST") {
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }
  }

  const query = Object.fromEntries(new URL(c.req.url).searchParams);
  const headers = Object.fromEntries(c.req.raw.headers);

  // Run the workflow with webhook data as context
  const result = await runWorkflow({
    workflow: dsl,
    inputs: {
      _webhook: {
        body,
        headers,
        query,
        method,
      },
    },
    secrets: {},
    workflowId,
    writeLog,
  });

  const response: ExecuteWorkflowResponse = {
    outputs: result.outputs,
    executionId: result.executionId,
    status: result.status,
    error: result.error,
  };

  return c.json(response, result.status === "error" ? 500 : 200);
});

const port = parseInt(process.env.PORT || "3001");

console.log(`Flowit API running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
