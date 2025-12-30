import { useCallback, useState, useMemo } from "react";
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
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { WorkflowDSL } from "@flowit/shared";

import { nodeTypes, type WorkflowNodeType } from "../nodes";
import { NodePalette } from "../panels/NodePalette";
import { AIChatPanel } from "../panels/AIChatPanel";
import { ParamPanel } from "../panels/ParamPanel";
import { WorkflowInfoPanel } from "../panels/WorkflowInfoPanel";
import { ExecutionPanel } from "../panels/ExecutionPanel";
import { TemplateSelector } from "../panels/TemplateSelector";
import { LogViewer } from "../panels/LogViewer";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";

type ViewMode = "editor" | "logs";
type LeftPanelMode = "nodes" | "ai";
import { UserMenu } from "../UserMenu";
import { useWorkflow, dslToNodesAndEdges } from "../../hooks/useWorkflow";
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
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>("nodes");

  // Preview state for AI-generated workflows
  const [previewNodes, setPreviewNodes] = useState<WorkflowNodeType[]>([]);
  const [previewEdges, setPreviewEdges] = useState<Edge[]>([]);

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
    executingNodeId,
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

  // Callback when AI generates a workflow - show as preview
  const handlePreviewWorkflow = useCallback((dsl: WorkflowDSL) => {
    const { nodes: previewNodes, edges: previewEdges } = dslToNodesAndEdges(dsl);
    setPreviewNodes(previewNodes);
    setPreviewEdges(previewEdges);
  }, []);

  // Callback when user approves the preview workflow
  const handleApproveWorkflow = useCallback(() => {
    if (previewNodes.length > 0) {
      setNodes(previewNodes);
      setEdges(previewEdges);
      setPreviewNodes([]);
      setPreviewEdges([]);
    }
  }, [previewNodes, previewEdges, setNodes, setEdges]);

  // Callback when user rejects the preview workflow
  const handleRejectWorkflow = useCallback(() => {
    setPreviewNodes([]);
    setPreviewEdges([]);
  }, []);

  // Add isExecuting flag to nodes for visual feedback during execution
  // Also combine with preview nodes (styled with opacity)
  const nodesWithExecutionState = useMemo(() => {
    const regularNodes = nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isExecuting: node.id === executingNodeId,
      },
    }));

    // Add preview nodes with isPreview flag for semi-transparent styling
    const previewNodesWithStyle = previewNodes.map((node) => ({
      ...node,
      id: `preview-${node.id}`, // Prefix to avoid ID conflicts
      data: {
        ...node.data,
        isPreview: true,
      },
    }));

    return [...regularNodes, ...previewNodesWithStyle];
  }, [nodes, executingNodeId, previewNodes]);

  // Combine regular edges with preview edges
  const edgesWithPreview = useMemo(() => {
    const previewEdgesWithStyle = previewEdges.map((edge) => ({
      ...edge,
      id: `preview-${edge.id}`,
      source: `preview-${edge.source}`,
      target: `preview-${edge.target}`,
      style: { opacity: 0.5, strokeDasharray: "5,5" },
    }));

    return [...edges, ...previewEdgesWithStyle];
  }, [edges, previewEdges]);

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
      <div className="w-screen h-screen flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{t.loading}</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <div className="w-screen h-screen flex items-center justify-center font-sans">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            {t.error}: {loadError}
          </p>
          <a
            href="/"
            className="px-5 py-2.5 bg-gray-800 text-white rounded-md no-underline"
          >
            {t.goHome}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col">
      {/* Toolbar */}
      <div className="h-12 border-b border-gray-200 flex items-center px-4 gap-3 bg-white">
        <a
          href="/"
          className="font-semibold text-base text-gray-800 no-underline"
        >
          {t.appName}
        </a>
        {isAdmin && (
          <a
            href="/admin"
            className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded text-xs no-underline"
          >
            {t.admin}
          </a>
        )}
        <div className="w-px h-6 bg-gray-200" />
        {/* Workflow Info */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800">
            {workflowMeta.name || t.untitledWorkflow}
          </span>
          <Chip
            color={workflowMeta.status === "published" ? "success" : "warning"}
          >
            {workflowMeta.status === "published" ? t.published : t.draft}
          </Chip>
          <Chip>
            {t.version}
            {workflowMeta.version}
          </Chip>
        </div>
        <div className="w-px h-6 bg-gray-200" />
        {/* View Toggle */}
        <div className="flex bg-gray-100 rounded-md p-0.5">
          <button
            onClick={() => setViewMode("editor")}
            className={`px-3 py-1 border-none rounded cursor-pointer text-sm ${
              viewMode === "editor"
                ? "bg-white font-medium text-gray-800 shadow-sm"
                : "bg-transparent text-gray-500"
            }`}
          >
            {t.editor}
          </button>
          <button
            onClick={() => setViewMode("logs")}
            className={`px-3 py-1 border-none rounded cursor-pointer text-sm ${
              viewMode === "logs"
                ? "bg-white font-medium text-gray-800 shadow-sm"
                : "bg-transparent text-gray-500"
            }`}
          >
            {t.executionLogs}
          </button>
        </div>
        <div className="flex-1" />
        <Button color="primary" onClick={handleNewWorkflow}>
          {t.new}
        </Button>
        <Button color="default" onClick={handleSave}>
          {t.save}
        </Button>
        {workflowId && (
          <Button color="success" onClick={publish}>
            {t.publish}
          </Button>
        )}
        <Button color="default" onClick={load}>
          {t.load}
        </Button>
        <div className="w-px h-6 bg-gray-200" />
        <UserMenu />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === "editor" ? (
          <>
            {/* Left Sidebar */}
            <div className="w-12 border-r border-gray-200 bg-white flex flex-col items-center py-2 gap-1">
              <button
                onClick={() => setLeftPanelMode("nodes")}
                className={`w-9 h-9 flex items-center justify-center rounded-md border-none cursor-pointer ${
                  leftPanelMode === "nodes"
                    ? "bg-gray-100 text-gray-800"
                    : "bg-transparent text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                }`}
                title={t.nodes}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                onClick={() => setLeftPanelMode("ai")}
                className={`w-9 h-9 flex items-center justify-center rounded-md border-none cursor-pointer ${
                  leftPanelMode === "ai"
                    ? "bg-gray-100 text-gray-800"
                    : "bg-transparent text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                }`}
                title={t.aiAssistant}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 8V4H8" />
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <path d="M8 10a2 2 0 1 0 0 4" />
                  <path d="M16 10a2 2 0 1 1 0 4" />
                  <path d="M9 18h6" />
                </svg>
              </button>
            </div>

            {/* Left Panel - Node Palette or AI Chat */}
            {leftPanelMode === "nodes" ? (
              <NodePalette onAddNode={addNode} />
            ) : (
              <AIChatPanel
                onPreviewWorkflow={handlePreviewWorkflow}
                onApproveWorkflow={handleApproveWorkflow}
                onRejectWorkflow={handleRejectWorkflow}
                hasPreview={previewNodes.length > 0}
              />
            )}

            {/* Center - Flow Editor */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1">
                <ReactFlow
                  nodes={nodesWithExecutionState}
                  edges={edgesWithPreview}
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

            {/* Right Panel - Workflow Info & Properties */}
            <div className="w-70 border-l border-gray-200 bg-gray-50 h-full overflow-auto">
              <WorkflowInfoPanel
                workflowId={workflowMeta.id}
                nodes={nodes}
                edges={edges}
              />
              <ParamPanel
                selectedNode={selectedNode}
                onUpdateParams={updateNodeParams}
                workflowId={workflowMeta.id}
              />
            </div>
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
