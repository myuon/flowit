import { useCallback } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes, type WorkflowNodeType } from "../nodes";
import { NodePalette } from "../panels/NodePalette";
import { ParamPanel } from "../panels/ParamPanel";
import { ExecutionPanel } from "../panels/ExecutionPanel";
import { useWorkflow } from "../../hooks/useWorkflow";

export function WorkflowEditor() {
  const {
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
  } = useWorkflow();

  const onNodesChange = useCallback(
    (changes: NodeChange<WorkflowNodeType>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      if (selectedNodes.length === 1) {
        setSelectedNode(selectedNodes[0] as WorkflowNodeType);
      } else {
        setSelectedNode(null);
      }
    },
    [setSelectedNode]
  );

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          height: 48,
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          background: "white",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 16 }}>Flowit</div>
        <div style={{ flex: 1 }} />
        <button
          onClick={save}
          style={{
            padding: "6px 12px",
            background: "#f0f0f0",
            border: "1px solid #ddd",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Save
        </button>
        <button
          onClick={load}
          style={{
            padding: "6px 12px",
            background: "#f0f0f0",
            border: "1px solid #ddd",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Load
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Panel - Node Palette */}
        <NodePalette onAddNode={addNode} />

        {/* Center - Flow Editor */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: 1 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              nodeTypes={nodeTypes}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
              deleteKeyCode={["Backspace", "Delete"]}
            >
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  const data = node.data as { color?: string };
                  return data?.color || "#ccc";
                }}
                style={{ background: "#f0f0f0" }}
              />
              <Background gap={15} />
            </ReactFlow>
          </div>

          {/* Bottom - Execution Panel */}
          <ExecutionPanel
            execution={execution}
            onExecute={execute}
            onClear={clearLogs}
          />
        </div>

        {/* Right Panel - Properties */}
        <ParamPanel
          selectedNode={selectedNode}
          onUpdateParams={updateNodeParams}
        />
      </div>
    </div>
  );
}
