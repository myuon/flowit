import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type {
  ExecuteWorkflowRequest,
  ExecuteWorkflowResponse,
} from "@flowit/shared";
import { runWorkflow, validateWorkflow } from "./executor";
import { jwtAuth, getAuthConfig, type AuthVariables } from "./auth";
import { createOAuthRoutes, getOAuthConfig } from "./auth/oauth";

const app = new Hono();

// CORS configuration
app.use("*", cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));

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

// Auth info endpoint (returns current user if authenticated)
app.get("/auth/me", requireAuth, (c) => {
  const user = c.get("user");
  return c.json({ user });
});

// Protected API routes
const api = new Hono<{ Variables: AuthVariables }>();
api.use("*", requireAuth);

// Validate a workflow without executing
api.post("/validate", async (c) => {
  const body = await c.req.json<{ workflow: ExecuteWorkflowRequest["workflow"] }>();
  const errors = validateWorkflow(body.workflow);

  return c.json({
    valid: errors.length === 0,
    errors,
  });
});

// Execute a workflow
api.post("/execute", async (c) => {
  const body = await c.req.json<ExecuteWorkflowRequest>();

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

  // Run the workflow
  const result = await runWorkflow({
    workflow: body.workflow,
    inputs: body.inputs,
    secrets: body.secrets,
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

const port = parseInt(process.env.PORT || "3001");

console.log(`Flowit API running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
