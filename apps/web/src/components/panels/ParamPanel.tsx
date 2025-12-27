import { memo, useCallback } from "react";
import type { Node } from "@xyflow/react";
import { getNode } from "@flowit/sdk";
import type { WorkflowNodeData } from "../nodes";
import {
  useI18n,
  getNodeDisplayName,
  getParamLabel,
  getParamDescription,
  getParamOptionLabel,
} from "../../i18n";

interface ParamPanelProps {
  selectedNode: Node<WorkflowNodeData> | null;
  onUpdateParams: (nodeId: string, params: Record<string, unknown>) => void;
}

function ParamPanelComponent({ selectedNode, onUpdateParams }: ParamPanelProps) {
  const { t, language } = useI18n();

  if (!selectedNode) {
    return (
      <div
        style={{
          width: 280,
          borderLeft: "1px solid #e0e0e0",
          background: "#fafafa",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <div
          style={{
            padding: "12px",
            borderBottom: "1px solid #e0e0e0",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {t.properties}
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#888",
            fontSize: 13,
          }}
        >
          {t.selectNode}
        </div>
      </div>
    );
  }

  const nodeDefinition = getNode(selectedNode.data.nodeType);
  const paramsSchema = nodeDefinition?.paramsSchema || {};

  const handleParamChange = useCallback(
    (key: string, value: unknown) => {
      onUpdateParams(selectedNode.id, {
        ...selectedNode.data.params,
        [key]: { type: "static", value },
      });
    },
    [selectedNode, onUpdateParams]
  );

  const getParamValue = (key: string): unknown => {
    const param = selectedNode.data.params[key];
    if (!param) return "";
    if (typeof param === "object" && param !== null && "value" in param) {
      return (param as { value: unknown }).value;
    }
    return param;
  };

  return (
    <div
      style={{
        width: 280,
        borderLeft: "1px solid #e0e0e0",
        background: "#fafafa",
        display: "flex",
        flexDirection: "column",
        height: "100%",
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
        {t.properties}
      </div>

      {/* Node Info */}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{selectedNode.data.icon || "📦"}</span>
          <div>
            <div style={{ fontWeight: 500 }}>
              {getNodeDisplayName(
                selectedNode.data.nodeType,
                language,
                selectedNode.data.label
              )}
            </div>
            <div style={{ fontSize: 11, color: "#888" }}>
              {selectedNode.data.nodeType}
            </div>
          </div>
        </div>
      </div>

      {/* Parameters */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#666",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          {t.parameters}
        </div>

        {Object.entries(paramsSchema).map(([key, schema]) => {
          const paramSchema = schema as {
            type: string;
            label?: string;
            description?: string;
            options?: Array<{ value: string; label: string }>;
            multiline?: boolean;
          };
          const nodeType = selectedNode.data.nodeType;
          const label = getParamLabel(nodeType, key, language, paramSchema.label || key);
          const description = getParamDescription(
            nodeType,
            key,
            language,
            paramSchema.description
          );

          return (
            <div key={key} style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                {label}
              </label>
              {description && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#888",
                    marginBottom: 6,
                  }}
                >
                  {description}
                </div>
              )}

              {/* Render input based on type */}
              {paramSchema.type === "select" && paramSchema.options ? (
                <select
                  value={String(getParamValue(key) || "")}
                  onChange={(e) => handleParamChange(key, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 13,
                  }}
                >
                  <option value="">{t.selectOption}</option>
                  {paramSchema.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {getParamOptionLabel(nodeType, key, opt.value, language, opt.label)}
                    </option>
                  ))}
                </select>
              ) : paramSchema.type === "boolean" ? (
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(getParamValue(key))}
                    onChange={(e) => handleParamChange(key, e.target.checked)}
                  />
                  <span style={{ fontSize: 13 }}>{t.enabled}</span>
                </label>
              ) : paramSchema.type === "number" ? (
                <input
                  type="number"
                  value={String(getParamValue(key) || "")}
                  onChange={(e) =>
                    handleParamChange(key, parseFloat(e.target.value) || 0)
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 13,
                  }}
                />
              ) : paramSchema.type === "json" ? (
                <textarea
                  value={
                    typeof getParamValue(key) === "string"
                      ? String(getParamValue(key))
                      : JSON.stringify(getParamValue(key) || {}, null, 2)
                  }
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleParamChange(key, parsed);
                    } catch {
                      handleParamChange(key, e.target.value);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: "monospace",
                    minHeight: 100,
                    resize: "vertical",
                  }}
                />
              ) : paramSchema.multiline ? (
                <textarea
                  value={String(getParamValue(key) || "")}
                  onChange={(e) => handleParamChange(key, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 13,
                    minHeight: 80,
                    resize: "vertical",
                  }}
                />
              ) : (
                <input
                  type="text"
                  value={String(getParamValue(key) || "")}
                  onChange={(e) => handleParamChange(key, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 13,
                  }}
                />
              )}
            </div>
          );
        })}

        {Object.keys(paramsSchema).length === 0 && (
          <div style={{ color: "#888", fontSize: 13 }}>
            {t.noParameters}
          </div>
        )}
      </div>
    </div>
  );
}

export const ParamPanel = memo(ParamPanelComponent);
