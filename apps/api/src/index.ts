import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { WriteLogFn } from "@flowit/sdk";
import { sessionAuth, type AuthVariables } from "./middleware/auth";
import { createOAuthRoutes, getOAuthConfig } from "./routes/oauth";
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
    data: data ?? {},
  });
};

// Session-based authentication
const requireAuth = sessionAuth();

// OAuth routes
const oauthRoutes = createOAuthRoutes(getOAuthConfig());

// Protected API routes
const apiRoutes = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .route("/", createWorkflowRoutes(writeLog))
  .route("/gas", createGasRoutes());

// Admin routes (protected + admin check)
const adminRoutes = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .route("/", createAdminRoutes());

// Main app with middleware
const app = new Hono();
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// Build routes with type preservation
const routes = app
  .get("/", (c) => c.json({ message: "Flowit API", version: "0.1.0" }))
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/auth", oauthRoutes)
  .get("/auth/me", requireAuth, (c) => {
    const user = c.get("user");
    return c.json({ user, isAdmin: isAdmin(user.sub) });
  })
  .route("/api", apiRoutes)
  .route("/config", createConfigRoutes())
  .route("/admin", adminRoutes)
  .route("/webhooks", createWebhookRoutes(writeLog));

export type AppType = typeof routes;

const port = parseInt(process.env.PORT || "3001");

console.log(`Flowit API running on http://localhost:${port}`);

serve({
  fetch: routes.fetch,
  port,
});
