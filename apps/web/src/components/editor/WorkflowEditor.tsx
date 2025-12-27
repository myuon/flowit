import { useCallback, useState } from "react";
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
import { TemplateSelector } from "../panels/TemplateSelector";
import { UserMenu } from "../UserMenu";
import { useWorkflow } from "../../hooks/useWorkflow";
import { useAuth } from "../../auth";
import { useI18n } from "../../i18n";
import type { WorkflowTemplate } from "../../data/templates";

export function WorkflowEditor() {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const [showTemplateSelector, setShowTemplateSelector] = useState(true);

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
    loadFromTemplate,
    workflowMeta,
    resetWorkflow,
  } = useWorkflow();

  const handleSelectTemplate = useCallback(
    (template: WorkflowTemplate) => {
      loadFromTemplate(template);
      setShowTemplateSelector(false);
    },
    [loadFromTemplate]
  );

  const handleStartBlank = useCallback(() => {
    setShowTemplateSelector(false);
  }, []);

  const handleNewWorkflow = useCallback(() => {
    resetWorkflow();
    setShowTemplateSelector(true);
  }, [resetWorkflow]);

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
        <div style={{ fontWeight: 600, fontSize: 16 }}>{t.appName}</div>
        {isAdmin && (
          <a
            href="/admin"
            style={{
              padding: "4px 10px",
              background: "#fef3c7",
              color: "#92400e",
              borderRadius: 4,
              fontSize: 12,
              textDecoration: "none",
            }}
          >
            {t.admin}
          </a>
        )}
        <div style={{ width: 1, height: 24, background: "#e0e0e0" }} />
        {/* Workflow Info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontWeight: 500, color: "#333" }}>
            {workflowMeta.name || t.untitledWorkflow}
          </span>
          <span
            style={{
              padding: "2px 8px",
              background:
                workflowMeta.status === "published" ? "#dcfce7" : "#fef3c7",
              color:
                workflowMeta.status === "published" ? "#166534" : "#92400e",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {workflowMeta.status === "published" ? t.published : t.draft}
          </span>
          <span
            style={{
              padding: "2px 8px",
              background: "#f3f4f6",
              color: "#6b7280",
              borderRadius: 4,
              fontSize: 11,
            }}
          >
            {t.version}
            {workflowMeta.version}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleNewWorkflow}
          style={{
            padding: "6px 12px",
            background: "#333",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          {t.new}
        </button>
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
          {t.save}
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
          {t.load}
        </button>
        <div style={{ width: 1, height: 24, background: "#e0e0e0" }} />
        <UserMenu />
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
          workflowId={workflowMeta.id}
        />
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <TemplateSelector
          onSelectTemplate={handleSelectTemplate}
          onStartBlank={handleStartBlank}
        />
      )}
    </div>
  );
}
