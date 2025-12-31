import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import type { ExecuteWorkflowResponse } from "@flowit/shared";
import { runWorkflow, validateWorkflow, type WriteLogFn } from "@flowit/sdk";
import type { AuthVariables } from "../middleware/auth";
import {
  workflowRepository,
  workflowVersionRepository,
  executionLogRepository,
  userTokenRepository,
  executionRepository,
} from "../db/repository";
import {
  validateWorkflowSchema,
  createWorkflowSchema,
  updateWorkflowSchema,
  publishWorkflowSchema,
  executeWorkflowSchema,
  executeQuerySchema,
  logsQuerySchema,
} from "./schemas";
import {
  createWorkflowInputFromRequest,
  updateWorkflowInputFromRequest,
  publishWorkflowInputFromRequest,
} from "../models";

export function createWorkflowRoutes(writeLog: WriteLogFn) {
  return (
    new Hono<{ Variables: AuthVariables }>()
      // Validate a workflow without executing
      .post(
        "/validate",
        zValidator("json", validateWorkflowSchema),
        async (c) => {
          const { workflow } = c.req.valid("json");
          const errors = validateWorkflow(workflow);

          return c.json({
            valid: errors.length === 0,
            errors,
          });
        }
      )
      // List all workflows
      .get("/workflows", async (c) => {
        const workflows = await workflowRepository.findAll();
        return c.json({ workflows });
      })
      // Get a single workflow with versions
      .get("/workflows/:id", async (c) => {
        const id = c.req.param("id");
        const workflow = await workflowRepository.findByIdWithVersions(id);

        if (!workflow) {
          return c.json({ error: "Workflow not found" }, 404);
        }

        return c.json({ workflow });
      })
      // Create a new workflow
      .post(
        "/workflows",
        zValidator("json", createWorkflowSchema),
        async (c) => {
          const body = c.req.valid("json");
          const input = createWorkflowInputFromRequest(body);

          const workflow = await workflowRepository.create({
            name: input.name,
            description: input.description,
          });

          // Create initial version if DSL provided
          if (input.dsl) {
            await workflowVersionRepository.create(workflow.id, input.dsl);
          }

          return c.json({ workflow }, 201);
        }
      )
      // Update a workflow
      .put(
        "/workflows/:id",
        zValidator("json", updateWorkflowSchema),
        async (c) => {
          const id = c.req.param("id");
          const body = c.req.valid("json");
          const input = updateWorkflowInputFromRequest(body);

          const existing = await workflowRepository.findById(id);
          if (!existing) {
            return c.json({ error: "Workflow not found" }, 404);
          }

          // Update workflow metadata
          const workflow = await workflowRepository.update(id, {
            name: input.name,
            description: input.description,
          });

          // Create new version if DSL provided
          if (input.dsl) {
            await workflowVersionRepository.create(id, input.dsl);
          }

          return c.json({ workflow });
        }
      )
      // Publish a workflow (create a new version and set it as current)
      .post(
        "/workflows/:id/publish",
        zValidator("json", publishWorkflowSchema),
        async (c) => {
          const id = c.req.param("id");
          const body = c.req.valid("json");
          const input = publishWorkflowInputFromRequest(body);

          const existing = await workflowRepository.findById(id);
          if (!existing) {
            return c.json({ error: "Workflow not found" }, 404);
          }

          // Create a new version (this also sets it as current)
          const version = await workflowVersionRepository.create(
            id,
            input.dsl,
            input.changelog
          );

          return c.json({ version });
        }
      )
      // Delete a workflow
      .delete("/workflows/:id", async (c) => {
        const id = c.req.param("id");
        const deleted = await workflowRepository.delete(id);

        if (!deleted) {
          return c.json({ error: "Workflow not found" }, 404);
        }

        return c.json({ success: true });
      })
      // Get execution logs for a workflow
      .get(
        "/workflows/:id/logs",
        zValidator("query", logsQuerySchema),
        async (c) => {
          const id = c.req.param("id");
          const { limit, offset } = c.req.valid("query");

          const workflow = await workflowRepository.findById(id);
          if (!workflow) {
            return c.json({ error: "Workflow not found" }, 404);
          }

          const logs = await executionLogRepository.findByWorkflowId(
            id,
            limit,
            offset
          );
          return c.json({ logs });
        }
      )
      // Delete execution logs for a workflow
      .delete("/workflows/:id/logs", async (c) => {
        const id = c.req.param("id");

        const workflow = await workflowRepository.findById(id);
        if (!workflow) {
          return c.json({ error: "Workflow not found" }, 404);
        }

        const count = await executionLogRepository.deleteByWorkflowId(id);
        return c.json({ deleted: count });
      })
      // Execute a workflow
      .post(
        "/execute",
        zValidator("query", executeQuerySchema),
        zValidator("json", executeWorkflowSchema),
        async (c) => {
          const { sse } = c.req.valid("query");
          const body = c.req.valid("json");
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

          // Create run record if this is a saved workflow
          let runId: string | undefined;
          if (workflowId) {
            const latestVersion =
              await workflowVersionRepository.getLatestVersion(workflowId);
            if (latestVersion) {
              // Create run record with pending status
              const run = await executionRepository.create({
                workflowId,
                versionId: latestVersion.id,
                status: "pending",
                inputs: body.inputs as unknown as string,
              });
              runId = run.id;

              // Mark as running since we're executing immediately
              await executionRepository.markStarted(run.id, "api-direct");
            }
          }

          // SSE mode: stream node start/completion events
          if (sse) {
            return streamSSE(c, async (stream) => {
              let eventId = 0;

              const result = await runWorkflow({
                workflow: body.workflow,
                inputs: body.inputs,
                secrets,
                workflowId,
                writeLog: workflowId ? writeLog : undefined,
                onNodeStart: (nodeId, nodeType) => {
                  stream.writeSSE({
                    data: JSON.stringify({ nodeId, nodeType }),
                    event: "node-started",
                    id: String(eventId++),
                  });
                },
                onNodeComplete: (nodeId, nodeType) => {
                  stream.writeSSE({
                    data: JSON.stringify({ nodeId, nodeType }),
                    event: "node-complete",
                    id: String(eventId++),
                  });
                },
              });

              // Update run record
              if (runId) {
                if (result.status === "success") {
                  await executionRepository.markCompleted(runId, result.outputs);
                } else {
                  await executionRepository.markFailed(runId, result.error ?? "Unknown error");
                }
              }

              // Send final result
              const response: ExecuteWorkflowResponse = {
                outputs: result.outputs,
                executionId: runId ?? result.executionId,
                status: result.status,
                error: result.error,
              };

              await stream.writeSSE({
                data: JSON.stringify(response),
                event: "complete",
                id: String(eventId++),
              });
            });
          }

          // Normal mode: return JSON response
          const result = await runWorkflow({
            workflow: body.workflow,
            inputs: body.inputs,
            secrets,
            workflowId,
            writeLog: workflowId ? writeLog : undefined,
          });

          // Update run record
          if (runId) {
            if (result.status === "success") {
              await executionRepository.markCompleted(runId, result.outputs);
            } else {
              await executionRepository.markFailed(runId, result.error ?? "Unknown error");
            }
          }

          const response: ExecuteWorkflowResponse = {
            outputs: result.outputs,
            executionId: runId ?? result.executionId,
            status: result.status,
            error: result.error,
          };

          return c.json(response, result.status === "error" ? 500 : 200);
        }
      )
  );
}
