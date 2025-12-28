import { Hono } from "hono";
import type {
  ExecuteWorkflowRequest,
  ExecuteWorkflowResponse,
} from "@flowit/shared";
import { runWorkflow, validateWorkflow, type WriteLogFn } from "@flowit/sdk";
import type { AuthVariables } from "../auth";
import {
  workflowRepository,
  workflowVersionRepository,
  executionLogRepository,
  userTokenRepository,
} from "../db/repository";

export function createWorkflowRoutes(writeLog: WriteLogFn) {
  const router = new Hono<{ Variables: AuthVariables }>();

  // Validate a workflow without executing
  router.post("/validate", async (c) => {
    const body = await c.req.json<{
      workflow: ExecuteWorkflowRequest["workflow"];
    }>();
    const errors = validateWorkflow(body.workflow);

    return c.json({
      valid: errors.length === 0,
      errors,
    });
  });

  // List all workflows
  router.get("/workflows", async (c) => {
    const workflows = await workflowRepository.findAll();
    return c.json({ workflows });
  });

  // Get a single workflow with versions
  router.get("/workflows/:id", async (c) => {
    const id = c.req.param("id");
    const workflow = await workflowRepository.findByIdWithVersions(id);

    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    return c.json({ workflow });
  });

  // Create a new workflow
  router.post("/workflows", async (c) => {
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
  router.put("/workflows/:id", async (c) => {
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
  router.post("/workflows/:id/publish", async (c) => {
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
  router.delete("/workflows/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await workflowRepository.delete(id);

    if (!deleted) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    return c.json({ success: true });
  });

  // Get execution logs for a workflow
  router.get("/workflows/:id/logs", async (c) => {
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
  router.delete("/workflows/:id/logs", async (c) => {
    const id = c.req.param("id");

    const workflow = await workflowRepository.findById(id);
    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    const count = await executionLogRepository.deleteByWorkflowId(id);
    return c.json({ deleted: count });
  });

  // Execute a workflow
  router.post("/execute", async (c) => {
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

  return router;
}
