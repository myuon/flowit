import { Hono } from "hono";
import type { ExecuteWorkflowRequest } from "@flowit/shared";
import { workflowRepository, executionRepository } from "../db/repository";

const WEBHOOK_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createWebhookRoutes() {
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

        // Create execution record (worker will pick it up)
        const execution = await executionRepository.create({
          workflowId,
          versionId: workflow.currentVersion.id,
          status: "pending",
          inputs: { _webhook: { body, headers, query, method } } as unknown as string,
        });

        // Poll for completion (up to 30 seconds)
        const startTime = Date.now();
        while (Date.now() - startTime < WEBHOOK_TIMEOUT_MS) {
          await sleep(POLL_INTERVAL_MS);

          const current = await executionRepository.findById(execution.id);
          if (!current) {
            return c.json({ error: "Execution not found" }, 500);
          }

          if (current.status === "success") {
            return c.json({
              executionId: current.id,
              status: current.status,
              outputs: current.outputs,
            });
          }

          if (current.status === "error") {
            return c.json({
              executionId: current.id,
              status: current.status,
              error: current.error,
            }, 500);
          }
        }

        // Timeout - return current status
        const current = await executionRepository.findById(execution.id);
        return c.json({
          executionId: execution.id,
          status: current?.status ?? "pending",
          message: "Execution timed out waiting for result",
          timeout: true,
        }, 202);
      })
  );
}
