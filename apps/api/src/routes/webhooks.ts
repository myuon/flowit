import { Hono } from "hono";
import type {
  ExecuteWorkflowRequest,
  ExecuteWorkflowResponse,
} from "@flowit/shared";
import { runWorkflow, type WriteLogFn } from "@flowit/sdk";
import { workflowRepository, executionRepository } from "../db/repository";

export function createWebhookRoutes(writeLog: WriteLogFn) {
  return (
    new Hono()
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

        // Create execution record
        const execution = await executionRepository.create({
          workflowId,
          versionId: workflow.currentVersion.id,
          status: "pending",
          inputs: { _webhook: { body, headers, query, method } } as unknown as string,
        });

        // Mark as running
        await executionRepository.markStarted(execution.id, "webhook");

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

        // Update execution record based on result
        if (result.status === "success") {
          await executionRepository.markCompleted(execution.id, result.outputs);
        } else {
          await executionRepository.markFailed(execution.id, result.error ?? "Unknown error");
        }

        const response: ExecuteWorkflowResponse = {
          outputs: result.outputs,
          executionId: execution.id,
          status: result.status,
          error: result.error,
        };

        return c.json(response, result.status === "error" ? 500 : 200);
      })
  );
}
