import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type {
  ExecuteWorkflowRequest,
  ExecuteWorkflowResponse,
} from "@flowit/shared";
import { runWorkflow, validateWorkflow } from "./executor";

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => {
  return c.json({ message: "Flowit API", version: "0.1.0" });
});

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Validate a workflow without executing
app.post("/validate", async (c) => {
  const body = await c.req.json<{ workflow: ExecuteWorkflowRequest["workflow"] }>();
  const errors = validateWorkflow(body.workflow);

  return c.json({
    valid: errors.length === 0,
    errors,
  });
});

// Execute a workflow
app.post("/execute", async (c) => {
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

const port = parseInt(process.env.PORT || "3001");

console.log(`Flowit API running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
