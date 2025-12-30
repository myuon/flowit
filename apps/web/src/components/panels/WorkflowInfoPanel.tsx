import { memo, useCallback, useState, useMemo } from "react";
import type { Node } from "@xyflow/react";
import type { WorkflowDSL } from "@flowit/shared";
import { getNode, validateWorkflow } from "@flowit/sdk";
import type { WorkflowNodeData } from "../nodes";
import { useI18n, getNodeDisplayName } from "../../i18n";

interface WorkflowInfoPanelProps {
  workflowId?: string;
  nodes: Node<WorkflowNodeData>[];
  edges: Array<{ source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }>;
}

function WorkflowInfoPanelComponent({
  workflowId,
  nodes,
  edges,
}: WorkflowInfoPanelProps) {
  const { t, language } = useI18n();
  const [validationResult, setValidationResult] = useState<{
    status: "idle" | "valid" | "invalid";
    errors: string[];
  }>({ status: "idle", errors: [] });

  // Categorize nodes into input and output
  const { inputNodes, outputNodes } = useMemo(() => {
    const inputs: Node<WorkflowNodeData>[] = [];
    const outputs: Node<WorkflowNodeData>[] = [];

    for (const node of nodes) {
      const nodeDefinition = getNode(node.data.nodeType);
      if (nodeDefinition?.display?.category === "input") {
        inputs.push(node);
      } else if (nodeDefinition?.display?.category === "output") {
        outputs.push(node);
      }
    }

    return { inputNodes: inputs, outputNodes: outputs };
  }, [nodes]);

  // Build webhook URL for webhook-trigger nodes
  const getWebhookUrl = useCallback(
    (node: Node<WorkflowNodeData>): string | null => {
      if (node.data.nodeType !== "webhook-trigger" || !workflowId) {
        return null;
      }
      const nameParam = node.data.params.name;
      const webhookName =
        typeof nameParam === "object" &&
        nameParam !== null &&
        "value" in nameParam
          ? String((nameParam as { value: unknown }).value)
          : "";
      if (!webhookName) return null;

      const baseUrl = window.location.origin.replace(/:\d+$/, ":3001");
      return `${baseUrl}/webhooks/${workflowId}/${webhookName}`;
    },
    [workflowId]
  );

  // Validate workflow
  const handleValidate = useCallback(() => {
    // Build WorkflowDSL from current nodes and edges
    // Use type assertion since validateWorkflow only needs id/type for nodes and source/target for edges
    const workflowDSL = {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.data.nodeType,
        params: node.data.params,
        inputs: node.data.inputs,
        outputs: node.data.outputs,
      })),
      edges: edges.map((edge, index) => ({
        id: `edge-${index}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? "",
        targetHandle: edge.targetHandle ?? "",
      })),
    } as WorkflowDSL;

    const errors = validateWorkflow(workflowDSL);
    if (errors.length === 0) {
      setValidationResult({ status: "valid", errors: [] });
    } else {
      setValidationResult({ status: "invalid", errors });
    }
  }, [nodes, edges]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  return (
    <div
      style={{
        borderBottom: "1px solid #e0e0e0",
        background: "#fafafa",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #e0e0e0",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {t.workflowInfo}
      </div>

      {/* Content */}
      <div style={{ padding: "12px" }}>
        {/* Workflow ID */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#666",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {t.workflowId}
          </div>
          <div
            style={{
              fontSize: 12,
              fontFamily: "monospace",
              color: "#333",
              background: "#f0f0f0",
              padding: "6px 8px",
              borderRadius: 4,
              wordBreak: "break-all",
            }}
          >
            {workflowId || t.notSavedYet}
          </div>
        </div>

        {/* Input Nodes */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#666",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {t.inputNodes} ({inputNodes.length})
          </div>
          {inputNodes.length === 0 ? (
            <div style={{ fontSize: 12, color: "#888" }}>{t.noInputNodes}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {inputNodes.map((node) => {
                const webhookUrl = getWebhookUrl(node);
                return (
                  <div
                    key={node.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #e0e0e0",
                      borderRadius: 4,
                      padding: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>
                        {node.data.icon || "📥"}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>
                        {getNodeDisplayName(
                          node.data.nodeType,
                          language,
                          node.data.label
                        )}
                      </span>
                    </div>
                    {webhookUrl && (
                      <div style={{ marginTop: 8 }}>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#666",
                            marginBottom: 4,
                          }}
                        >
                          {t.webhookUrl}:
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            fontFamily: "monospace",
                            background: "#f0f0f0",
                            padding: "4px 6px",
                            borderRadius: 3,
                            wordBreak: "break-all",
                            marginBottom: 4,
                          }}
                        >
                          {webhookUrl}
                        </div>
                        <button
                          onClick={() => copyToClipboard(webhookUrl)}
                          style={{
                            padding: "4px 8px",
                            background: "#333",
                            color: "white",
                            border: "none",
                            borderRadius: 3,
                            cursor: "pointer",
                            fontSize: 10,
                          }}
                        >
                          {t.copyUrl}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Output Nodes */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#666",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {t.outputNodes} ({outputNodes.length})
          </div>
          {outputNodes.length === 0 ? (
            <div style={{ fontSize: 12, color: "#888" }}>{t.noOutputNodes}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {outputNodes.map((node) => (
                <div
                  key={node.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #e0e0e0",
                    borderRadius: 4,
                    padding: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 14 }}>
                    {node.data.icon || "📤"}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>
                    {getNodeDisplayName(
                      node.data.nodeType,
                      language,
                      node.data.label
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Validate Button */}
        <div>
          <button
            onClick={handleValidate}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "#333",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {t.validateWorkflow}
          </button>
          {validationResult.status === "valid" && (
            <div
              style={{
                marginTop: 8,
                padding: 8,
                background: "#dcfce7",
                borderRadius: 4,
                fontSize: 12,
                color: "#166534",
              }}
            >
              {t.workflowValid}
            </div>
          )}
          {validationResult.status === "invalid" && (
            <div
              style={{
                marginTop: 8,
                padding: 8,
                background: "#fef2f2",
                borderRadius: 4,
                fontSize: 12,
                color: "#dc2626",
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                {t.workflowInvalid}
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 16,
                  fontSize: 11,
                }}
              >
                {validationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const WorkflowInfoPanel = memo(WorkflowInfoPanelComponent);
