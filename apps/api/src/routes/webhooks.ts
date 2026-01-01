import { Hono } from "hono";
import type { ExecuteWorkflowRequest } from "@flowit/shared";
import { runWorkflow, type WriteLogFn } from "@flowit/sdk";
import {
  workflowRepository,
  executionRepository,
  executionLogRepository,
} from "../db/repository";

// Create writeLog function for execution logs
const writeLog: WriteLogFn = async (workflowId, executionId, nodeId, data) => {
  await executionLogRepository.create({
    workflowId,
    executionId,
    nodeId,
    data: data ?? {},
  });
};

export function createWebhookRoutes() {
  return new Hono()
    // Webhook trigger endpoint
    .all("/:workflowId/:webhookName", async (c) => {
      const workflowId = c.req.param("workflowId");
      const webhookName = c.req.param("webhookName");
      const method = c.req.method;

      // Find the workflow
      const workflow =
        await workflowRepository.findByIdWithVersions(workflowId);
      if (!workflow) {
        return c.json({ error: "Workflow not found" }, 404);
      }

      // Get the current version
      if (!workflow.currentVersion) {
        return c.json({ error: "Workflow has no published version" }, 400);
      }

      const dsl = workflow.currentVersion
        .dsl as ExecuteWorkflowRequest["workflow"];

      // Check if workflow has a webhook trigger node with matching name
      const webhookNode = dsl.nodes.find(
        (n) =>
          n.type === "webhook-trigger" &&
          (n.params?.name as { value: string })?.value === webhookName
      );
      if (!webhookNode) {
        return c.json(
          { error: `Webhook trigger '${webhookName}' not found in workflow` },
          404
        );
      }

      // Check if method matches
      const allowedMethod =
        (webhookNode.params?.method as { value: string })?.value || "POST";
      if (method !== allowedMethod && method !== "OPTIONS") {
        return c.json(
          {
            error: `Method ${method} not allowed. Expected ${allowedMethod}`,
          },
          405
        );
      }

      // Handle OPTIONS for CORS preflight
      if (method === "OPTIONS") {
        return new Response(null, { status: 204 });
      }

      // Get execution type (default: sync)
      const executionType =
        (webhookNode.params?.executionType as { value: string })?.value ||
        "sync";

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

      const webhookInputs = { _webhook: { body, headers, query, method } };

      // Create execution record
      const execution = await executionRepository.create({
        workflowId,
        versionId: workflow.currentVersion.id,
        status: "pending",
        inputs: webhookInputs as unknown as string,
      });

      // Async mode: return immediately
      if (executionType === "async") {
        return c.json({
          executionId: execution.id,
          status: "pending",
          message: "Workflow execution queued",
        }, 202);
      }

      // Sync mode: run workflow directly
      await executionRepository.markStarted(execution.id, "webhook-sync");

      try {
        const result = await runWorkflow({
          workflow: dsl,
          inputs: webhookInputs,
          secrets: {},
          workflowId,
          writeLog,
        });

        if (result.status === "success") {
          await executionRepository.markCompleted(execution.id, result.outputs);
          return c.json({
            executionId: execution.id,
            status: "success",
            outputs: result.outputs,
          });
        } else {
          await executionRepository.markFailed(
            execution.id,
            result.error ?? "Unknown error"
          );
          return c.json(
            {
              executionId: execution.id,
              status: "error",
              error: result.error,
            },
            500
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await executionRepository.markFailed(execution.id, errorMessage);
        return c.json(
          {
            executionId: execution.id,
            status: "error",
            error: errorMessage,
          },
          500
        );
      }
    });
}
