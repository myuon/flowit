import { useCallback, useState, useEffect } from "react";
import type { Edge } from "@xyflow/react";
import { getNode, registerBuiltinNodes } from "@flowit/sdk";
import type {
  WorkflowDSL,
  WorkflowNode,
  WorkflowEdge,
  WorkflowMeta,
  ExecuteWorkflowResponse,
} from "@flowit/shared";
import type { WorkflowNodeType } from "../components/nodes";
import { client } from "../api/client";
import type {
  ExecutionResult,
  ExecutionLog,
} from "../components/panels/ExecutionPanel";
import type { WorkflowTemplate } from "../data/templates";

// Register builtin nodes on module load
registerBuiltinNodes();

const STORAGE_KEY = "flowit-workflow";

function generateWorkflowId(): string {
  return crypto.randomUUID();
}

function createDefaultWorkflowMeta(): WorkflowMeta {
  return {
    id: generateWorkflowId(),
    name: "",
    version: "1",
    status: "draft",
  };
}

interface UseWorkflowOptions {
  workflowId?: string;
}

export function useWorkflow(options: UseWorkflowOptions = {}) {
  const { workflowId } = options;
  const [nodes, setNodes] = useState<WorkflowNodeType[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNodeType | null>(
    null
  );
  const [workflowMeta, setWorkflowMeta] = useState<WorkflowMeta>(
    createDefaultWorkflowMeta
  );
  const [execution, setExecution] = useState<ExecutionResult>({
    status: "idle",
    logs: [],
  });
  const [isLoading, setIsLoading] = useState(!!workflowId);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      params: node.data.params as Record<
        string,
        { type: "static"; value: unknown }
      >,
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
      meta: workflowMeta,
      inputs: {},
      outputs: {},
      secrets: [],
      nodes: dslNodes,
      edges: dslEdges,
    };
  }, [nodes, edges, workflowMeta]);

  // Load from WorkflowDSL
  const fromDSL = useCallback((dsl: WorkflowDSL) => {
    const loadedNodes: WorkflowNodeType[] = dsl.nodes.map((node, index) => {
      const nodeDef = getNode(node.type);
      return {
        id: node.id,
        type: "workflow",
        position: {
          x: 100 + (index % 3) * 200,
          y: 100 + Math.floor(index / 3) * 150,
        },
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
    setWorkflowMeta({
      id: dsl.meta.id || generateWorkflowId(),
      name: dsl.meta.name,
      version: dsl.meta.version,
      status: dsl.meta.status ?? "draft",
      description: dsl.meta.description,
    });
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
  const addLog = useCallback(
    (type: ExecutionLog["type"], message: string, nodeId?: string) => {
      setExecution((prev) => ({
        ...prev,
        logs: [...prev.logs, { type, message, timestamp: new Date(), nodeId }],
      }));
    },
    []
  );

  // Clear logs
  const clearLogs = useCallback(() => {
    setExecution({ status: "idle", logs: [] });
  }, []);

  // Load from template
  const loadFromTemplate = useCallback(
    (template: WorkflowTemplate) => {
      fromDSL(template.dsl);

      // Apply template positions
      if (template.positions) {
        setNodes((nds) =>
          nds.map((node) => {
            const pos = template.positions.find((p) => p.id === node.id);
            return pos ? { ...node, position: pos.position } : node;
          })
        );
      }

      addLog("info", `Loaded template: ${template.name}`);
    },
    [fromDSL, addLog]
  );

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

      const res = await client.api.execute.$post({
        query: {},
        json: { workflow: dsl, inputs: {}, secrets: {} },
      });
      const result = (await res.json()) as ExecuteWorkflowResponse;

      if (res.ok && result.status === "success") {
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

  // Reset workflow to default state
  const resetWorkflow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setWorkflowMeta(createDefaultWorkflowMeta());
    clearLogs();
  }, [clearLogs]);

  // Save workflow to API
  const saveToApi = useCallback(async () => {
    if (!workflowId) {
      addLog("error", "No workflow ID - cannot save to API");
      return;
    }

    try {
      const dsl = toDSL();
      // Include positions in a custom field for persistence
      const positions = nodes.map((n) => ({ id: n.id, position: n.position }));
      const dslWithPositions = {
        ...dsl,
        _positions: positions,
      };

      const res = await client.api.workflows[":id"].$put({
        param: { id: workflowId },
        json: {
          name: workflowMeta.name,
          description: workflowMeta.description,
          dsl: dslWithPositions,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to save workflow: ${res.statusText}`);
      }
      addLog("success", "Workflow saved to server");
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      addLog("error", `Failed to save workflow: ${errorMessage}`);
    }
  }, [workflowId, toDSL, nodes, workflowMeta, addLog]);

  // Publish workflow to API (create a new version)
  const publish = useCallback(async () => {
    if (!workflowId) {
      addLog("error", "No workflow ID - cannot publish");
      return;
    }

    try {
      const dsl = toDSL();
      // Include positions in a custom field for persistence
      const positions = nodes.map((n) => ({ id: n.id, position: n.position }));
      const dslWithPositions = {
        ...dsl,
        _positions: positions,
      };

      const res = await client.api.workflows[":id"].publish.$post({
        param: { id: workflowId },
        json: { dsl: dslWithPositions },
      });
      if (!res.ok) {
        throw new Error(`Failed to publish workflow: ${res.statusText}`);
      }
      const result = await res.json();

      // Update workflow meta to reflect published status
      setWorkflowMeta((prev) => ({
        ...prev,
        version: String(result.version.version),
        status: "published",
      }));

      addLog(
        "success",
        `Workflow published as version ${result.version.version}`
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      addLog("error", `Failed to publish workflow: ${errorMessage}`);
    }
  }, [workflowId, toDSL, nodes, addLog]);

  // Load workflow from API on mount
  useEffect(() => {
    if (!workflowId) return;

    const loadWorkflow = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const res = await client.api.workflows[":id"].$get({
          param: { id: workflowId },
        });
        if (!res.ok) {
          throw new Error(`Failed to load workflow: ${res.statusText}`);
        }
        const result = await res.json();
        const workflow = result.workflow;

        // Get the current version's DSL
        const currentVersion = workflow.currentVersion;

        if (currentVersion) {
          const dsl = currentVersion.dsl as WorkflowDSL & {
            _positions?: Array<{
              id: string;
              position: { x: number; y: number };
            }>;
          };
          fromDSL(dsl);

          // Apply saved positions if available
          if (dsl._positions) {
            setNodes((nds) =>
              nds.map((node) => {
                const pos = dsl._positions?.find((p) => p.id === node.id);
                return pos ? { ...node, position: pos.position } : node;
              })
            );
          }

          // Always use the actual workflow ID from the API
          setWorkflowMeta((prev) => ({
            ...prev,
            id: workflow.id,
            name: workflow.name,
          }));
        } else {
          // No version yet, just set the workflow name
          setWorkflowMeta((prev) => ({
            ...prev,
            id: workflow.id,
            name: workflow.name,
          }));
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setLoadError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflow();
  }, [workflowId, fromDSL]);

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
    loadFromTemplate,
    toDSL,
    fromDSL,
    workflowMeta,
    resetWorkflow,
    isLoading,
    loadError,
    saveToApi,
    publish,
  };
}
