import { memo } from "react";
import { Handle, Position, type Node } from "@xyflow/react";
import type { IOSchema } from "@flowit/shared";
import { useI18n, getNodeDisplayName } from "../../i18n";

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: string;
  icon?: string;
  color?: string;
  inputs: Record<string, IOSchema>;
  outputs: Record<string, IOSchema>;
  params: Record<string, unknown>;
}

export type WorkflowNodeType = Node<WorkflowNodeData, "workflow">;

interface WorkflowNodeProps {
  data: WorkflowNodeData;
  selected?: boolean;
}

const handleStyle = {
  width: 10,
  height: 10,
  borderRadius: 2,
};

function WorkflowNodeComponent({ data, selected }: WorkflowNodeProps) {
  const { language } = useI18n();
  const inputKeys = Object.keys(data.inputs || {});
  const outputKeys = Object.keys(data.outputs || {});
  const displayName = getNodeDisplayName(data.nodeType, language, data.label);

  return (
    <div
      style={{
        background: "white",
        border: `2px solid ${selected ? "#1a192b" : data.color || "#ccc"}`,
        borderRadius: 8,
        minWidth: 150,
        fontSize: 12,
        boxShadow: selected ? "0 0 0 2px rgba(0,0,0,0.1)" : "none",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: data.color || "#f0f0f0",
          padding: "6px 10px",
          borderRadius: "6px 6px 0 0",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {data.icon && <span>{data.icon}</span>}
        <span style={{ fontWeight: 600, color: "#333" }}>{displayName}</span>
      </div>

      {/* Body */}
      <div style={{ padding: "8px 0" }}>
        {/* Input handles */}
        {inputKeys.map((key) => (
          <div
            key={`input-${key}`}
            style={{
              position: "relative",
              padding: "4px 10px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={key}
              style={{
                ...handleStyle,
                background: "#555",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
            <span style={{ color: "#666", marginLeft: 4 }}>{key}</span>
          </div>
        ))}

        {/* Divider if both inputs and outputs exist */}
        {inputKeys.length > 0 && outputKeys.length > 0 && (
          <div style={{ borderTop: "1px solid #eee", margin: "4px 0" }} />
        )}

        {/* Output handles */}
        {outputKeys.map((key) => (
          <div
            key={`output-${key}`}
            style={{
              position: "relative",
              padding: "4px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <span style={{ color: "#666", marginRight: 4 }}>{key}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={key}
              style={{
                ...handleStyle,
                background: "#555",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
          </div>
        ))}

        {/* Show message if no I/O */}
        {inputKeys.length === 0 && outputKeys.length === 0 && (
          <div
            style={{ padding: "4px 10px", color: "#999", fontStyle: "italic" }}
          >
            No I/O
          </div>
        )}
      </div>

      {/* Footer with node type */}
      <div
        style={{
          borderTop: "1px solid #eee",
          padding: "4px 10px",
          fontSize: 10,
          color: "#999",
        }}
      >
        {data.nodeType}
      </div>
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
