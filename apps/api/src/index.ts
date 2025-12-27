import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type {
  ExecuteWorkflowRequest,
  ExecuteWorkflowResponse,
} from "@flowit/shared";

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => {
  return c.json({ message: "Flowit API" });
});

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.post("/execute", async (c) => {
  const _body = await c.req.json<ExecuteWorkflowRequest>();

  // TODO: Implement LangGraph execution
  const response: ExecuteWorkflowResponse = {
    outputs: {},
    executionId: crypto.randomUUID(),
    status: "success",
  };

  return c.json(response);
});

const port = parseInt(process.env.PORT || "3001");

console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
