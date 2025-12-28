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
import { LogViewer } from "../panels/LogViewer";

type ViewMode = "editor" | "logs";
import { UserMenu } from "../UserMenu";
import { useWorkflow } from "../../hooks/useWorkflow";
import { useAuth } from "../../auth";
import { useI18n } from "../../i18n";
import type { WorkflowTemplate } from "../../data/templates";

interface WorkflowEditorProps {
  workflowId?: string;
}

export function WorkflowEditor({ workflowId }: WorkflowEditorProps) {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const [showTemplateSelector, setShowTemplateSelector] = useState(!workflowId);
  const [viewMode, setViewMode] = useState<ViewMode>("editor");

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
    isLoading,
    loadError,
    saveToApi,
    publish,
  } = useWorkflow({ workflowId });

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
    // Navigate to home to create new workflow
    window.location.href = "/";
  }, []);

  const handleSave = useCallback(() => {
    if (workflowId) {
      saveToApi();
    } else {
      save();
    }
  }, [workflowId, saveToApi, save]);

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

  // Show loading state
  if (isLoading) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #333",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: "#666" }}>{t.loading}</p>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#dc2626", marginBottom: 16 }}>{t.error}: {loadError}</p>
          <a
            href="/"
            style={{
              padding: "10px 20px",
              background: "#333",
              color: "white",
              borderRadius: 6,
              textDecoration: "none",
            }}
          >
            {t.goHome}
          </a>
        </div>
      </div>
    );
  }

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
        <a
          href="/"
          style={{
            fontWeight: 600,
            fontSize: 16,
            color: "#333",
            textDecoration: "none",
          }}
        >
          {t.appName}
        </a>
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
        <div style={{ width: 1, height: 24, background: "#e0e0e0" }} />
        {/* View Toggle */}
        <div
          style={{
            display: "flex",
            background: "#f3f4f6",
            borderRadius: 6,
            padding: 2,
          }}
        >
          <button
            onClick={() => setViewMode("editor")}
            style={{
              padding: "4px 12px",
              background: viewMode === "editor" ? "white" : "transparent",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: viewMode === "editor" ? 500 : 400,
              color: viewMode === "editor" ? "#333" : "#666",
              boxShadow: viewMode === "editor" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {t.editor}
          </button>
          <button
            onClick={() => setViewMode("logs")}
            style={{
              padding: "4px 12px",
              background: viewMode === "logs" ? "white" : "transparent",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: viewMode === "logs" ? 500 : 400,
              color: viewMode === "logs" ? "#333" : "#666",
              boxShadow: viewMode === "logs" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {t.executionLogs}
          </button>
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
          onClick={handleSave}
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
        {workflowId && (
          <button
            onClick={publish}
            style={{
              padding: "6px 12px",
              background: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {t.publish}
          </button>
        )}
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
        {viewMode === "editor" ? (
          <>
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
          </>
        ) : (
          <LogViewer workflowId={workflowMeta.id || workflowId || ""} />
        )}
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
