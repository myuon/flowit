import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { WriteLogFn } from "@flowit/sdk";
import { jwtAuth, getAuthConfig, type AuthVariables } from "./auth";
import { createOAuthRoutes, getOAuthConfig } from "./auth/oauth";
import { executionLogRepository } from "./db/repository";
import {
  createWorkflowRoutes,
  createWebhookRoutes,
  createGasRoutes,
  createAdminRoutes,
  createConfigRoutes,
  isAdmin,
} from "./routes";

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

// Auth info endpoint (returns current user if authenticated)
app.get("/auth/me", requireAuth, (c) => {
  const user = c.get("user");
  return c.json({ user, isAdmin: isAdmin(user.sub) });
});

// Protected API routes
const api = new Hono<{ Variables: AuthVariables }>();
api.use("*", requireAuth);

// Mount workflow routes (includes /validate, /execute, /workflows/*)
api.route("/", createWorkflowRoutes(writeLog));

// Mount GAS routes
api.route("/gas", createGasRoutes());

// Mount protected API routes
app.route("/api", api);

// Public config routes
app.route("/config", createConfigRoutes());

// Admin routes (protected + admin check)
const adminApp = new Hono<{ Variables: AuthVariables }>();
adminApp.use("*", requireAuth);
adminApp.route("/", createAdminRoutes());
app.route("/admin", adminApp);

// Webhook endpoints (public - no auth required)
app.route("/webhooks", createWebhookRoutes(writeLog));

const port = parseInt(process.env.PORT || "3001");

console.log(`Flowit API running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
