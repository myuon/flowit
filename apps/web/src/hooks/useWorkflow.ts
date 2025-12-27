import { useCallback, useState } from "react";
import type { Edge } from "@xyflow/react";
import { getNode, registerBuiltinNodes } from "@flowit/sdk";
import type { WorkflowDSL, WorkflowNode, WorkflowEdge } from "@flowit/shared";
import type { WorkflowNodeType } from "../components/nodes";
import { executeWorkflow as executeWorkflowApi } from "../api/client";
import type { ExecutionResult, ExecutionLog } from "../components/panels/ExecutionPanel";

// Register builtin nodes on module load
registerBuiltinNodes();

const STORAGE_KEY = "flowit-workflow";

export function useWorkflow() {
  const [nodes, setNodes] = useState<WorkflowNodeType[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNodeType | null>(null);
  const [execution, setExecution] = useState<ExecutionResult>({
    status: "idle",
    logs: [],
  });

  // Add a new node to the canvas
  const addNode = useCallback((nodeType: string) => {
    const nodeDef = getNode(nodeType);
    if (!nodeDef) {
      console.error(`Node type not found: ${nodeType}`);
      return;
    }

    const newNode: WorkflowNodeType = {
      id: `${nodeType}-${Date.now()}`,
      type: "workflow",
      position: {
        x: 250 + Math.random() * 100,
        y: 150 + Math.random() * 100,
      },
      data: {
        label: nodeDef.displayName,
        nodeType: nodeDef.id,
        icon: nodeDef.display?.icon,
        color: nodeDef.display?.color,
        inputs: nodeDef.inputs,
        outputs: nodeDef.outputs,
        params: {},
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, []);

  // Update node parameters
  const updateNodeParams = useCallback(
    (nodeId: string, params: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, params } }
            : node
        )
      );
      // Also update selected node if it's the one being edited
      setSelectedNode((selected) =>
        selected?.id === nodeId
          ? { ...selected, data: { ...selected.data, params } }
          : selected
      );
    },
    []
  );

  // Convert to WorkflowDSL
  const toDSL = useCallback((): WorkflowDSL => {
    const dslNodes: WorkflowNode[] = nodes.map((node) => ({
      id: node.id,
      type: node.data.nodeType,
      label: node.data.label,
      params: node.data.params as Record<string, { type: "static"; value: unknown }>,
      inputs: node.data.inputs,
      outputs: node.data.outputs,
    }));

    const dslEdges: WorkflowEdge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || "value",
      targetHandle: edge.targetHandle || "value",
    }));

    return {
      dslVersion: "0.1.0",
      meta: {
        name: "Untitled Workflow",
        version: "1.0.0",
      },
      inputs: {},
      outputs: {},
      secrets: [],
      nodes: dslNodes,
      edges: dslEdges,
    };
  }, [nodes, edges]);

  // Load from WorkflowDSL
  const fromDSL = useCallback((dsl: WorkflowDSL) => {
    const loadedNodes: WorkflowNodeType[] = dsl.nodes.map((node, index) => {
      const nodeDef = getNode(node.type);
      return {
        id: node.id,
        type: "workflow",
        position: { x: 100 + (index % 3) * 200, y: 100 + Math.floor(index / 3) * 150 },
        data: {
          label: node.label || nodeDef?.displayName || node.type,
          nodeType: node.type,
          icon: nodeDef?.display?.icon,
          color: nodeDef?.display?.color,
          inputs: nodeDef?.inputs || {},
          outputs: nodeDef?.outputs || {},
          params: node.params,
        },
      };
    });

    const loadedEdges: Edge[] = dsl.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    }));

    setNodes(loadedNodes);
    setEdges(loadedEdges);
    setSelectedNode(null);
  }, []);

  // Save to localStorage
  const save = useCallback(() => {
    const dsl = toDSL();
    const data = {
      dsl,
      positions: nodes.map((n) => ({ id: n.id, position: n.position })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    addLog("info", "Workflow saved to browser storage");
  }, [toDSL, nodes]);

  // Load from localStorage
  const load = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      addLog("info", "No saved workflow found");
      return;
    }

    try {
      const data = JSON.parse(stored);
      fromDSL(data.dsl);

      // Apply saved positions
      if (data.positions) {
        setNodes((nds) =>
          nds.map((node) => {
            const savedPos = data.positions.find(
              (p: { id: string }) => p.id === node.id
            );
            return savedPos ? { ...node, position: savedPos.position } : node;
          })
        );
      }

      addLog("success", "Workflow loaded from browser storage");
    } catch (e) {
      addLog("error", `Failed to load workflow: ${e}`);
    }
  }, [fromDSL]);

  // Add log entry
  const addLog = useCallback((type: ExecutionLog["type"], message: string, nodeId?: string) => {
    setExecution((prev) => ({
      ...prev,
      logs: [...prev.logs, { type, message, timestamp: new Date(), nodeId }],
    }));
  }, []);

  // Clear logs
  const clearLogs = useCallback(() => {
    setExecution({ status: "idle", logs: [] });
  }, []);

  // Execute workflow
  const execute = useCallback(async () => {
    if (nodes.length === 0) {
      addLog("error", "No nodes in workflow");
      return;
    }

    setExecution({ status: "running", logs: [] });
    addLog("info", "Starting workflow execution...");

    try {
      const dsl = toDSL();
      addLog("info", `Executing ${dsl.nodes.length} nodes...`);

      const result = await executeWorkflowApi({
        workflow: dsl,
        inputs: {},
        secrets: {},
      });

      if (result.status === "success") {
        setExecution((prev) => ({
          ...prev,
          status: "success",
          executionId: result.executionId,
          outputs: result.outputs,
        }));
        addLog("success", "Workflow completed successfully");
      } else {
        setExecution((prev) => ({
          ...prev,
          status: "error",
          executionId: result.executionId,
          error: result.error,
        }));
        addLog("error", result.error || "Unknown error occurred");
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setExecution((prev) => ({
        ...prev,
        status: "error",
        error: errorMessage,
      }));
      addLog("error", `Execution failed: ${errorMessage}`);
    }
  }, [nodes, toDSL, addLog]);

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    selectedNode,
    setSelectedNode,
    addNode,
    updateNodeParams,
    execution,
    execute,
    clearLogs,
    save,
    load,
    toDSL,
    fromDSL,
  };
}
