import { describe, it, expect } from "vitest";
import {
  reactFlowToDSL,
  dslToReactFlow,
  extractPositions,
  validateDSL,
  createEmptyWorkflow,
} from "./converter";
import type { ReactFlowGraph, WorkflowDSL } from "@flowit/shared";
import { WORKFLOW_DSL_VERSION } from "@flowit/shared";

describe("converter", () => {
  const sampleReactFlowGraph: ReactFlowGraph = {
    nodes: [
      {
        id: "node-1",
        type: "custom",
        position: { x: 100, y: 50 },
        data: {
          label: "Input Node",
          nodeType: "input",
          params: {},
          inputs: {},
          outputs: {
            output: { type: "string", description: "User input" },
          },
        },
      },
      {
        id: "node-2",
        type: "custom",
        position: { x: 300, y: 150 },
        data: {
          label: "LLM Node",
          nodeType: "llm",
          params: {
            model: { type: "static", value: "gpt-4" },
            apiKey: { type: "secret", ref: "OPENAI_API_KEY" },
          },
          inputs: {
            prompt: { type: "string", required: true },
          },
          outputs: {
            response: { type: "string" },
          },
        },
      },
    ],
    edges: [
      {
        id: "edge-1",
        source: "node-1",
        target: "node-2",
        sourceHandle: "output",
        targetHandle: "prompt",
      },
    ],
  };

  describe("reactFlowToDSL", () => {
    it("should convert React Flow graph to DSL", () => {
      const dsl = reactFlowToDSL(sampleReactFlowGraph, {
        meta: {
          name: "Test Workflow",
          version: "1.0.0",
        },
      });

      expect(dsl.dslVersion).toBe(WORKFLOW_DSL_VERSION);
      expect(dsl.meta.name).toBe("Test Workflow");
      expect(dsl.nodes).toHaveLength(2);
      expect(dsl.edges).toHaveLength(1);

      // Check node conversion
      const llmNode = dsl.nodes.find((n) => n.id === "node-2");
      expect(llmNode?.type).toBe("llm");
      expect(llmNode?.label).toBe("LLM Node");
      expect(llmNode?.params.model).toEqual({ type: "static", value: "gpt-4" });

      // Check edge conversion
      expect(dsl.edges[0].source).toBe("node-1");
      expect(dsl.edges[0].target).toBe("node-2");
      expect(dsl.edges[0].sourceHandle).toBe("output");
      expect(dsl.edges[0].targetHandle).toBe("prompt");
    });

    it("should include workflow-level inputs and outputs", () => {
      const dsl = reactFlowToDSL(sampleReactFlowGraph, {
        meta: { name: "Test", version: "1.0.0" },
        workflowInputs: {
          userMessage: { type: "string", required: true },
        },
        workflowOutputs: {
          result: { type: "string" },
        },
        secrets: [{ key: "OPENAI_API_KEY" }],
      });

      expect(dsl.inputs.userMessage).toBeDefined();
      expect(dsl.outputs.result).toBeDefined();
      expect(dsl.secrets).toHaveLength(1);
    });
  });

  describe("dslToReactFlow", () => {
    it("should convert DSL back to React Flow graph", () => {
      const dsl = reactFlowToDSL(sampleReactFlowGraph, {
        meta: { name: "Test", version: "1.0.0" },
      });

      const positions = extractPositions(sampleReactFlowGraph);
      const graph = dslToReactFlow(dsl, { positions });

      expect(graph.nodes).toHaveLength(2);
      expect(graph.edges).toHaveLength(1);

      // Check position preservation
      const node1 = graph.nodes.find((n) => n.id === "node-1");
      expect(node1?.position).toEqual({ x: 100, y: 50 });

      // Check data conversion
      const node2 = graph.nodes.find((n) => n.id === "node-2");
      expect(node2?.data.label).toBe("LLM Node");
      expect(node2?.data.nodeType).toBe("llm");
    });

    it("should use default positions when not provided", () => {
      const dsl = reactFlowToDSL(sampleReactFlowGraph, {
        meta: { name: "Test", version: "1.0.0" },
      });

      const graph = dslToReactFlow(dsl);

      // Should auto-layout nodes
      expect(graph.nodes[0].position.x).toBe(0);
      expect(graph.nodes[1].position.x).toBe(200);
    });
  });

  describe("validateDSL", () => {
    it("should return no errors for valid DSL", () => {
      const dsl = createEmptyWorkflow("Test");
      const errors = validateDSL(dsl);
      expect(errors).toHaveLength(0);
    });

    it("should detect missing workflow name", () => {
      const dsl: WorkflowDSL = {
        dslVersion: WORKFLOW_DSL_VERSION,
        meta: { name: "", version: "1.0.0" },
        inputs: {},
        outputs: {},
        secrets: [],
        nodes: [],
        edges: [],
      };

      const errors = validateDSL(dsl);
      expect(errors.some((e) => e.path === "meta.name")).toBe(true);
    });

    it("should detect duplicate node IDs", () => {
      const dsl: WorkflowDSL = {
        dslVersion: WORKFLOW_DSL_VERSION,
        meta: { name: "Test", version: "1.0.0" },
        inputs: {},
        outputs: {},
        secrets: [],
        nodes: [
          { id: "dup", type: "test", params: {}, inputs: {}, outputs: {} },
          { id: "dup", type: "test", params: {}, inputs: {}, outputs: {} },
        ],
        edges: [],
      };

      const errors = validateDSL(dsl);
      expect(errors.some((e) => e.message.includes("Duplicate"))).toBe(true);
    });

    it("should detect invalid edge references", () => {
      const dsl: WorkflowDSL = {
        dslVersion: WORKFLOW_DSL_VERSION,
        meta: { name: "Test", version: "1.0.0" },
        inputs: {},
        outputs: {},
        secrets: [],
        nodes: [
          { id: "node-1", type: "test", params: {}, inputs: {}, outputs: {} },
        ],
        edges: [
          {
            id: "edge-1",
            source: "node-1",
            target: "node-missing",
            sourceHandle: "out",
            targetHandle: "in",
          },
        ],
      };

      const errors = validateDSL(dsl);
      expect(errors.some((e) => e.message.includes("non-existent"))).toBe(true);
    });
  });

  describe("extractPositions", () => {
    it("should extract positions from graph", () => {
      const positions = extractPositions(sampleReactFlowGraph);
      expect(positions["node-1"]).toEqual({ x: 100, y: 50 });
      expect(positions["node-2"]).toEqual({ x: 300, y: 150 });
    });
  });

  describe("createEmptyWorkflow", () => {
    it("should create empty workflow with correct structure", () => {
      const workflow = createEmptyWorkflow("My Workflow");
      expect(workflow.dslVersion).toBe(WORKFLOW_DSL_VERSION);
      expect(workflow.meta.name).toBe("My Workflow");
      expect(workflow.nodes).toEqual([]);
      expect(workflow.edges).toEqual([]);
    });
  });
});
