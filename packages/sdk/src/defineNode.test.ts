import { describe, it, expect, beforeEach } from "vitest";
import { defineNode, io, param } from "./defineNode";
import {
  registerNode,
  getNode,
  getAllNodes,
  getNodesByCategory,
  clearRegistry,
  createNodeData,
  getNodeCatalog,
  getGroupedCatalog,
} from "./registry";
import {
  textInputNode,
  templateNode,
  llmNode,
  jsTransformNode,
  mapNode,
  filterNode,
  httpRequestNode,
  slackMessageNode,
  webhookTriggerNode,
} from "./nodes";

describe("defineNode", () => {
  it("should create a node definition with correct structure", () => {
    const node = defineNode({
      id: "test-node",
      displayName: "Test Node",
      description: "A test node",
      inputs: {
        input1: io.string({ required: true }),
      },
      outputs: {
        output1: io.string(),
      },
      paramsSchema: {
        param1: param.string("Param 1", { default: "default" }),
      },
      display: {
        icon: "🧪",
        category: "utility",
      },
      async run({ inputs, params }) {
        return { output1: `${inputs.input1} - ${params.param1}` };
      },
    });

    expect(node.id).toBe("test-node");
    expect(node.displayName).toBe("Test Node");
    expect(node.inputs.input1.type).toBe("string");
    expect(node.outputs.output1.type).toBe("string");
    expect(node.display.category).toBe("utility");
  });

  it("should execute run function with typed inputs/outputs", async () => {
    const node = defineNode({
      id: "adder",
      displayName: "Adder",
      inputs: {
        a: io.number({ required: true }),
        b: io.number({ required: true }),
      },
      outputs: {
        sum: io.number(),
      },
      paramsSchema: {},
      display: { category: "transform" },
      async run({ inputs }) {
        return { sum: inputs.a + inputs.b };
      },
    });

    const result = await node.run({
      inputs: { a: 5, b: 3 },
      params: {},
      context: {
        nodeId: "test",
        executionId: "exec-1",
        log: () => {},
      },
    });

    expect(result.sum).toBe(8);
  });

  it("should generate default params", () => {
    const node = defineNode({
      id: "with-defaults",
      displayName: "With Defaults",
      inputs: {},
      outputs: {},
      paramsSchema: {
        text: param.string("Text", { default: "hello" }),
        count: param.number("Count", { default: 5 }),
        enabled: param.boolean("Enabled", { default: true }),
        apiKey: param.secret("API Key"),
      },
      display: { category: "utility" },
      async run() {
        return {};
      },
    });

    const defaults = node.getDefaultParams();

    expect(defaults.text).toEqual({ type: "static", value: "hello" });
    expect(defaults.count).toEqual({ type: "static", value: 5 });
    expect(defaults.enabled).toEqual({ type: "static", value: true });
    expect(defaults.apiKey).toEqual({ type: "secret", ref: "" });
  });
});

describe("io helpers", () => {
  it("should create string schema", () => {
    const schema = io.string({ description: "test", required: true });
    expect(schema.type).toBe("string");
    expect(schema.description).toBe("test");
    expect(schema.required).toBe(true);
  });

  it("should create array schema", () => {
    const schema = io.array(io.string(), { description: "list" });
    expect(schema.type).toBe("array");
    expect(schema.items?.type).toBe("string");
  });

  it("should create object schema", () => {
    const schema = io.object(
      { name: io.string(), age: io.number() },
      { description: "person" }
    );
    expect(schema.type).toBe("object");
    expect(schema.properties?.name.type).toBe("string");
  });
});

describe("param helpers", () => {
  it("should create select param", () => {
    const schema = param.select(
      "Choose",
      [
        { label: "A", value: "a" },
        { label: "B", value: "b" },
      ],
      { default: "a" }
    );
    expect(schema.type).toBe("select");
    expect(schema.options).toHaveLength(2);
    expect(schema.default).toBe("a");
  });

  it("should create number param with constraints", () => {
    const schema = param.number("Count", { min: 0, max: 100, step: 1 });
    expect(schema.type).toBe("number");
    expect(schema.min).toBe(0);
    expect(schema.max).toBe(100);
  });
});

describe("registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("should register and retrieve nodes", () => {
    registerNode(textInputNode);
    registerNode(templateNode);

    expect(getNode("text-input")).toBe(textInputNode);
    expect(getNode("template")).toBe(templateNode);
    expect(getAllNodes()).toHaveLength(2);
  });

  it("should filter nodes by category", () => {
    registerNode(textInputNode);
    registerNode(templateNode);
    registerNode(llmNode);

    const inputNodes = getNodesByCategory("input");
    expect(inputNodes).toContain(textInputNode);
    expect(inputNodes).not.toContain(templateNode);

    const aiNodes = getNodesByCategory("ai");
    expect(aiNodes).toContain(llmNode);
  });

  it("should create node catalog", () => {
    registerNode(textInputNode);
    registerNode(llmNode);

    const catalog = getNodeCatalog();
    expect(catalog).toHaveLength(2);

    const llmItem = catalog.find((item) => item.id === "llm");
    expect(llmItem?.displayName).toBe("LLM");
    expect(llmItem?.category).toBe("ai");
    expect(llmItem?.icon).toBe("🤖");
  });

  it("should group catalog by category", () => {
    registerNode(textInputNode);
    registerNode(templateNode);
    registerNode(llmNode);

    const grouped = getGroupedCatalog();
    expect(grouped.input).toHaveLength(1);
    expect(grouped.transform).toHaveLength(1);
    expect(grouped.ai).toHaveLength(1);
  });

  it("should create node data for React Flow", () => {
    const data = createNodeData(textInputNode);
    expect(data.label).toBe("Text Input");
    expect(data.nodeType).toBe("text-input");
    expect(data.outputs.value).toBeDefined();
  });
});

describe("built-in nodes", () => {
  const mockContext = { nodeId: "1", executionId: "e1", log: () => {} };

  it("should execute textInputNode", async () => {
    const result = await textInputNode.run({
      inputs: {},
      params: { text: "Hello, World!" },
      context: mockContext,
    });
    expect(result.value).toBe("Hello, World!");
  });

  it("should execute templateNode", async () => {
    const result = await templateNode.run({
      inputs: { variables: { name: "Alice", age: 30 } },
      params: { template: "Hello, {{name}}! You are {{age}} years old." },
      context: mockContext,
    });
    expect(result.result).toBe("Hello, Alice! You are 30 years old.");
  });
});

describe("transform nodes", () => {
  const mockContext = { nodeId: "1", executionId: "e1", log: () => {} };

  it("should execute jsTransformNode with expression", async () => {
    const result = await jsTransformNode.run({
      inputs: {
        data: { items: [1, 2, 3, 4, 5] },
        context: {},
      },
      params: { expression: "data.items.filter(x => x > 2)" },
      context: mockContext,
    });
    expect(result.result).toEqual([3, 4, 5]);
  });

  it("should execute jsTransformNode with object manipulation", async () => {
    const result = await jsTransformNode.run({
      inputs: {
        data: { user: { name: "John", age: 30 } },
        context: {},
      },
      params: { expression: "({ ...data.user, isAdult: data.user.age >= 18 })" },
      context: mockContext,
    });
    expect(result.result).toEqual({ name: "John", age: 30, isAdult: true });
  });

  it("should execute mapNode", async () => {
    const result = await mapNode.run({
      inputs: { array: [{ name: "Alice" }, { name: "Bob" }] },
      params: { expression: "item.name.toUpperCase()" },
      context: mockContext,
    });
    expect(result.result).toEqual(["ALICE", "BOB"]);
  });

  it("should execute filterNode", async () => {
    const result = await filterNode.run({
      inputs: { array: [1, 2, 3, 4, 5, 6] },
      params: { condition: "item % 2 === 0" },
      context: mockContext,
    });
    expect(result.result).toEqual([2, 4, 6]);
    expect(result.count).toBe(3);
  });
});

describe("integration nodes structure", () => {
  it("should have httpRequestNode with correct structure", () => {
    expect(httpRequestNode.id).toBe("http-request");
    expect(httpRequestNode.display.category).toBe("integration");
    expect(httpRequestNode.paramsSchema.url).toBeDefined();
    expect(httpRequestNode.paramsSchema.method).toBeDefined();
    expect(httpRequestNode.outputs.data).toBeDefined();
    expect(httpRequestNode.outputs.status).toBeDefined();
  });

  it("should have slackMessageNode with correct structure", () => {
    expect(slackMessageNode.id).toBe("slack-message");
    expect(slackMessageNode.display.category).toBe("integration");
    expect(slackMessageNode.inputs.text).toBeDefined();
    expect(slackMessageNode.paramsSchema.webhookUrl).toBeDefined();
    expect(slackMessageNode.outputs.success).toBeDefined();
  });
});

describe("webhookTriggerNode", () => {
  const mockContext = {
    nodeId: "webhook-1",
    executionId: "exec-1",
    log: () => {},
  };

  it("should have correct structure", () => {
    expect(webhookTriggerNode.id).toBe("webhook-trigger");
    expect(webhookTriggerNode.display.category).toBe("input");
    expect(webhookTriggerNode.outputs.body).toBeDefined();
    expect(webhookTriggerNode.outputs.headers).toBeDefined();
    expect(webhookTriggerNode.outputs.query).toBeDefined();
    expect(webhookTriggerNode.outputs.method).toBeDefined();
    expect(webhookTriggerNode.paramsSchema.method).toBeDefined();
  });

  it("should return placeholder data when no workflowInputs provided", async () => {
    const result = await webhookTriggerNode.run({
      inputs: {},
      params: { method: "POST" },
      context: mockContext,
    });

    expect(result.body).toEqual({});
    expect(result.headers).toEqual({});
    expect(result.query).toEqual({});
    expect(result.method).toBe("POST");
  });

  it("should return data from workflowInputs._webhook when available", async () => {
    const webhookData = {
      body: { message: "Hello from webhook" },
      headers: { "content-type": "application/json" },
      query: { id: "123" },
      method: "POST",
    };

    const result = await webhookTriggerNode.run({
      inputs: {},
      params: { method: "POST" },
      context: {
        ...mockContext,
        workflowInputs: { _webhook: webhookData },
      },
    });

    expect(result.body).toEqual({ message: "Hello from webhook" });
    expect(result.headers).toEqual({ "content-type": "application/json" });
    expect(result.query).toEqual({ id: "123" });
    expect(result.method).toBe("POST");
  });

  it("should handle partial webhook data", async () => {
    const result = await webhookTriggerNode.run({
      inputs: {},
      params: { method: "GET" },
      context: {
        ...mockContext,
        workflowInputs: {
          _webhook: {
            body: { data: "test" },
            method: "GET",
          },
        },
      },
    });

    expect(result.body).toEqual({ data: "test" });
    expect(result.headers).toEqual({});
    expect(result.query).toEqual({});
    expect(result.method).toBe("GET");
  });

  it("should use method from webhook data over params", async () => {
    const result = await webhookTriggerNode.run({
      inputs: {},
      params: { method: "POST" },
      context: {
        ...mockContext,
        workflowInputs: {
          _webhook: {
            method: "PUT",
          },
        },
      },
    });

    expect(result.method).toBe("PUT");
  });
});
