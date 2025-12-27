import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ExecuteFlowRequest, ExecuteFlowResponse } from "@flowit/shared";

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => {
  return c.json({ message: "Flowit API" });
});

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.post("/execute", async (c) => {
  const _body = await c.req.json<ExecuteFlowRequest>();

  // TODO: Implement LangGraph execution
  const response: ExecuteFlowResponse = {
    outputs: {},
    executionId: crypto.randomUUID(),
  };

  return c.json(response);
});

const port = parseInt(process.env.PORT || "3001");

console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
