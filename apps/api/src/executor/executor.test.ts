import { describe, it, expect, beforeEach } from "vitest";
import type { WorkflowDSL, WorkflowNode, WorkflowEdge } from "@flowit/shared";
import { clearRegistry, registerBuiltinNodes } from "@flowit/sdk";
import { runWorkflow, validateWorkflow } from "./runner";
import {
  resolveParams,
  resolveNodeInputs,
  buildExecutionOrder,
  findDependentNodes,
  findDependencies,
} from "./resolver";
import type { ExecutionState } from "./types";

// Helper to create a minimal WorkflowNode
function createNode(
  id: string,
  type: string,
  params: Record<string, unknown> = {}
): WorkflowNode {
  const paramValues: Record<string, { type: "static"; value: unknown }> = {};
  for (const [key, value] of Object.entries(params)) {
    paramValues[key] = { type: "static", value };
  }
  return {
    id,
    type,
    params: paramValues,
    inputs: {},
    outputs: {},
  };
}

// Helper to create a minimal WorkflowEdge
function createEdge(
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string
): WorkflowEdge {
  return {
    id: `${source}-${target}`,
    source,
    sourceHandle,
    target,
    targetHandle,
  };
}

// Helper to create a minimal WorkflowDSL
function createWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[] = []
): WorkflowDSL {
  return {
    dslVersion: "0.1.0",
    meta: {
      name: "Test Workflow",
      version: "1.0.0",
      status: "draft",
    },
    inputs: {},
    outputs: {},
    secrets: [],
    nodes,
    edges,
  };
}

describe("resolver", () => {
  describe("resolveParams", () => {
    const mockState: ExecutionState = {
      outputs: {},
      inputs: { user: { name: "Alice", age: 30 } },
      secrets: { API_KEY: "secret123" },
      executionId: "test-exec",
      logs: [],
    };

    it("should resolve static params", () => {
      const params = {
        text: { type: "static" as const, value: "hello" },
        count: { type: "static" as const, value: 42 },
      };

      const resolved = resolveParams(params, mockState);

      expect(resolved.text).toBe("hello");
      expect(resolved.count).toBe(42);
    });

    it("should resolve secret params", () => {
      const params = {
        apiKey: { type: "secret" as const, ref: "API_KEY" },
      };

      const resolved = resolveParams(params, mockState);

      expect(resolved.apiKey).toBe("secret123");
    });

    it("should throw for missing secret", () => {
      const params = {
        apiKey: { type: "secret" as const, ref: "MISSING_KEY" },
      };

      expect(() => resolveParams(params, mockState)).toThrow(
        "Secret not found: MISSING_KEY"
      );
    });

    it("should resolve input params with dot notation", () => {
      const params = {
        userName: { type: "input" as const, path: "user.name" },
        userAge: { type: "input" as const, path: "user.age" },
      };

      const resolved = resolveParams(params, mockState);

      expect(resolved.userName).toBe("Alice");
      expect(resolved.userAge).toBe(30);
    });
  });

  describe("resolveNodeInputs", () => {
    it("should resolve inputs from connected edges", () => {
      const node = createNode("node2", "template");

      const edges: WorkflowEdge[] = [
        createEdge("node1", "value", "node2", "variables"),
      ];

      const state: ExecutionState = {
        outputs: {
          node1: { value: "hello world" },
        },
        inputs: {},
        secrets: {},
        executionId: "test",
        logs: [],
      };

      const inputs = resolveNodeInputs(node, edges, state);

      expect(inputs.variables).toBe("hello world");
    });

    it("should handle multiple input connections", () => {
      const node = createNode("node3", "js-transform");

      const edges: WorkflowEdge[] = [
        createEdge("node1", "result", "node3", "data"),
        createEdge("node2", "output", "node3", "context"),
      ];

      const state: ExecutionState = {
        outputs: {
          node1: { result: { items: [1, 2, 3] } },
          node2: { output: { multiplier: 2 } },
        },
        inputs: {},
        secrets: {},
        executionId: "test",
        logs: [],
      };

      const inputs = resolveNodeInputs(node, edges, state);

      expect(inputs.data).toEqual({ items: [1, 2, 3] });
      expect(inputs.context).toEqual({ multiplier: 2 });
    });
  });

  describe("buildExecutionOrder", () => {
    it("should return correct order for linear workflow", () => {
      const nodes: WorkflowNode[] = [
        createNode("a", "text-input"),
        createNode("b", "template"),
        createNode("c", "output"),
      ];

      const edges: WorkflowEdge[] = [
        createEdge("a", "value", "b", "variables"),
        createEdge("b", "result", "c", "value"),
      ];

      const order = buildExecutionOrder(nodes, edges);

      expect(order).toEqual(["a", "b", "c"]);
    });

    it("should handle parallel nodes", () => {
      const nodes: WorkflowNode[] = [
        createNode("start", "text-input"),
        createNode("branch1", "template"),
        createNode("branch2", "template"),
        createNode("end", "output"),
      ];

      const edges: WorkflowEdge[] = [
        createEdge("start", "value", "branch1", "variables"),
        createEdge("start", "value", "branch2", "variables"),
        createEdge("branch1", "result", "end", "value1"),
        createEdge("branch2", "result", "end", "value2"),
      ];

      const order = buildExecutionOrder(nodes, edges);

      // start must be first, end must be last
      expect(order[0]).toBe("start");
      expect(order[order.length - 1]).toBe("end");
      // branch1 and branch2 must be in between
      expect(order.indexOf("branch1")).toBeGreaterThan(order.indexOf("start"));
      expect(order.indexOf("branch2")).toBeGreaterThan(order.indexOf("start"));
      expect(order.indexOf("branch1")).toBeLessThan(order.indexOf("end"));
      expect(order.indexOf("branch2")).toBeLessThan(order.indexOf("end"));
    });

    it("should throw on circular dependency", () => {
      const nodes: WorkflowNode[] = [
        createNode("a", "template"),
        createNode("b", "template"),
      ];

      const edges: WorkflowEdge[] = [
        createEdge("a", "result", "b", "variables"),
        createEdge("b", "result", "a", "variables"),
      ];

      expect(() => buildExecutionOrder(nodes, edges)).toThrow(
        "Workflow contains cycles"
      );
    });
  });

  describe("findDependentNodes", () => {
    it("should find all dependent nodes", () => {
      const edges: WorkflowEdge[] = [
        createEdge("a", "out", "b", "in"),
        createEdge("a", "out", "c", "in"),
        createEdge("b", "out", "d", "in"),
      ];

      const dependents = findDependentNodes("a", edges);

      expect(dependents).toContain("b");
      expect(dependents).toContain("c");
      expect(dependents).not.toContain("d");
    });
  });

  describe("findDependencies", () => {
    it("should find all dependencies", () => {
      const edges: WorkflowEdge[] = [
        createEdge("a", "out", "c", "in1"),
        createEdge("b", "out", "c", "in2"),
        createEdge("c", "out", "d", "in"),
      ];

      const dependencies = findDependencies("c", edges);

      expect(dependencies).toContain("a");
      expect(dependencies).toContain("b");
      expect(dependencies).not.toContain("d");
    });
  });
});

describe("validateWorkflow", () => {
  beforeEach(() => {
    clearRegistry();
    registerBuiltinNodes();
  });

  it("should return no errors for valid workflow", () => {
    const workflow = createWorkflow(
      [
        createNode("input1", "text-input", { text: "Hello" }),
        createNode("output1", "output", { label: "Result" }),
      ],
      [createEdge("input1", "value", "output1", "value")]
    );

    const errors = validateWorkflow(workflow);

    expect(errors).toHaveLength(0);
  });

  it("should detect empty workflow", () => {
    const workflow = createWorkflow([]);

    const errors = validateWorkflow(workflow);

    expect(errors).toContain("Workflow has no nodes");
  });

  it("should detect unknown node types", () => {
    const workflow = createWorkflow([
      createNode("n1", "unknown-node-type"),
    ]);

    const errors = validateWorkflow(workflow);

    expect(errors.some((e) => e.includes("Unknown node type"))).toBe(true);
  });

  it("should detect dangling edge references", () => {
    const workflow = createWorkflow(
      [createNode("n1", "text-input")],
      [createEdge("n1", "value", "nonexistent", "input")]
    );

    const errors = validateWorkflow(workflow);

    expect(errors.some((e) => e.includes("unknown target node"))).toBe(true);
  });

  it("should detect cycles", () => {
    const workflow = createWorkflow(
      [
        createNode("a", "template"),
        createNode("b", "template"),
      ],
      [
        createEdge("a", "result", "b", "variables"),
        createEdge("b", "result", "a", "variables"),
      ]
    );

    const errors = validateWorkflow(workflow);

    expect(errors).toContain("Workflow contains cycles");
  });
});

describe("runWorkflow", () => {
  beforeEach(() => {
    clearRegistry();
    registerBuiltinNodes();
  });

  it("should execute simple text input workflow", async () => {
    const workflow = createWorkflow([
      createNode("input1", "text-input", { text: "Hello, World!" }),
    ]);

    const result = await runWorkflow({
      workflow,
      inputs: {},
    });

    expect(result.status).toBe("success");
    expect(result.outputs.input1).toBeDefined();
    expect((result.outputs.input1 as { value: string }).value).toBe("Hello, World!");
  });

  it("should execute template workflow with inputs", async () => {
    const workflow = createWorkflow(
      [
        createNode("input1", "json-input", { json: { name: "Alice", age: 30 } }),
        createNode("template1", "template", {
          template: "Hello, {{name}}! You are {{age}} years old.",
        }),
      ],
      [createEdge("input1", "value", "template1", "variables")]
    );

    const result = await runWorkflow({
      workflow,
      inputs: {},
    });

    expect(result.status).toBe("success");
    expect((result.outputs.template1 as { result: string }).result).toBe(
      "Hello, Alice! You are 30 years old."
    );
  });

  it("should execute js-transform node", async () => {
    const workflow = createWorkflow(
      [
        createNode("input1", "json-input", { json: { items: [1, 2, 3, 4, 5] } }),
        createNode("transform1", "js-transform", {
          expression: "data.items.filter(x => x > 2)",
        }),
      ],
      [createEdge("input1", "value", "transform1", "data")]
    );

    const result = await runWorkflow({
      workflow,
      inputs: {},
    });

    expect(result.status).toBe("success");
    expect((result.outputs.transform1 as { result: number[] }).result).toEqual([
      3, 4, 5,
    ]);
  });

  it("should execute map node", async () => {
    const workflow = createWorkflow(
      [
        createNode("input1", "json-input", {
          json: [{ name: "Alice" }, { name: "Bob" }],
        }),
        createNode("map1", "map", { expression: "item.name.toUpperCase()" }),
      ],
      [createEdge("input1", "value", "map1", "array")]
    );

    const result = await runWorkflow({
      workflow,
      inputs: {},
    });

    expect(result.status).toBe("success");
    expect((result.outputs.map1 as { result: string[] }).result).toEqual([
      "ALICE",
      "BOB",
    ]);
  });

  it("should execute filter node", async () => {
    const workflow = createWorkflow(
      [
        createNode("input1", "json-input", { json: [1, 2, 3, 4, 5, 6] }),
        createNode("filter1", "filter", { condition: "item % 2 === 0" }),
      ],
      [createEdge("input1", "value", "filter1", "array")]
    );

    const result = await runWorkflow({
      workflow,
      inputs: {},
    });

    expect(result.status).toBe("success");
    expect((result.outputs.filter1 as { result: number[]; count: number }).result).toEqual([
      2, 4, 6,
    ]);
    expect((result.outputs.filter1 as { count: number }).count).toBe(3);
  });

  it("should execute number input workflow", async () => {
    const workflow = createWorkflow([
      createNode("input1", "number-input", { number: 42 }),
    ]);

    const result = await runWorkflow({
      workflow,
      inputs: {},
    });

    expect(result.status).toBe("success");
    expect((result.outputs.input1 as { value: number }).value).toBe(42);
  });

  it("should resolve secrets", async () => {
    const nodes: WorkflowNode[] = [
      {
        id: "input1",
        type: "text-input",
        params: { text: { type: "secret", ref: "MY_SECRET" } },
        inputs: {},
        outputs: {},
      },
    ];
    const workflow = createWorkflow(nodes);

    const result = await runWorkflow({
      workflow,
      inputs: {},
      secrets: { MY_SECRET: "secret-value" },
    });

    expect(result.status).toBe("success");
    expect((result.outputs.input1 as { value: string }).value).toBe("secret-value");
  });

  it("should chain multiple nodes", async () => {
    const workflow = createWorkflow(
      [
        createNode("input1", "text-input", { text: "hello" }),
        createNode("input2", "json-input", { json: { suffix: "world" } }),
        createNode("transform1", "js-transform", {
          expression: "data + ' ' + ctx.suffix",
        }),
      ],
      [
        createEdge("input1", "value", "transform1", "data"),
        createEdge("input2", "value", "transform1", "context"),
      ]
    );

    const result = await runWorkflow({
      workflow,
      inputs: {},
    });

    expect(result.status).toBe("success");
    expect((result.outputs.transform1 as { result: string }).result).toBe("hello world");
  });

  it("should pass workflowInputs to webhook trigger node", async () => {
    // Webhook with no downstream nodes to test its direct output
    const workflow = createWorkflow([
      createNode("webhook1", "webhook-trigger", { method: "POST" }),
    ]);

    const result = await runWorkflow({
      workflow,
      inputs: {
        _webhook: {
          body: { message: "Hello from webhook!", userId: 123 },
          headers: { "content-type": "application/json" },
          query: { format: "json" },
          method: "POST",
        },
      },
    });

    expect(result.status).toBe("success");
    const webhookOutput = result.outputs.webhook1 as {
      body: unknown;
      headers: Record<string, string>;
      query: Record<string, string>;
      method: string;
    };
    expect(webhookOutput.body).toEqual({ message: "Hello from webhook!", userId: 123 });
    expect(webhookOutput.headers).toEqual({ "content-type": "application/json" });
    expect(webhookOutput.query).toEqual({ format: "json" });
    expect(webhookOutput.method).toBe("POST");
  });

  it("should pass webhook body through to downstream nodes", async () => {
    const workflow = createWorkflow(
      [
        createNode("webhook1", "webhook-trigger", { method: "POST" }),
        createNode("transform1", "js-transform", {
          expression: "data.message.toUpperCase()",
        }),
      ],
      [createEdge("webhook1", "body", "transform1", "data")]
    );

    const result = await runWorkflow({
      workflow,
      inputs: {
        _webhook: {
          body: { message: "hello world" },
          method: "POST",
        },
      },
    });

    expect(result.status).toBe("success");
    expect((result.outputs.transform1 as { result: string }).result).toBe("HELLO WORLD");
  });
});
