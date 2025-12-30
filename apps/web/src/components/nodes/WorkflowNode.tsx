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
  isExecuting?: boolean;
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

export const WorkflowNode = ({ data, selected }: WorkflowNodeProps) => {
  const { language } = useI18n();
  const inputKeys = Object.keys(data.inputs || {});
  const outputKeys = Object.keys(data.outputs || {});
  const displayName = getNodeDisplayName(data.nodeType, language, data.label);

  const getBorderColor = () => {
    if (data.isExecuting) return "#3b82f6"; // blue-500
    if (selected) return "#1a192b";
    return data.color || "#ccc";
  };

  return (
    <div
      className={`bg-white border-2 rounded-lg min-w-[150px] text-xs ${
        selected ? "shadow-[0_0_0_2px_rgba(0,0,0,0.1)]" : ""
      } ${data.isExecuting ? "animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.5)]" : ""}`}
      style={{ borderColor: getBorderColor() }}
    >
      {/* Header */}
      <div
        className="py-1.5 px-2.5 rounded-t-md flex items-center gap-1.5"
        style={{ background: data.color || "#f0f0f0" }}
      >
        {data.icon && <span>{data.icon}</span>}
        <span className="font-semibold text-gray-800">{displayName}</span>
      </div>

      {/* Body */}
      <div className="py-2">
        {/* Input handles */}
        {inputKeys.map((key) => (
          <div
            key={`input-${key}`}
            className="relative py-1 px-2.5 flex items-center"
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
            <span className="text-gray-500 ml-1">{key}</span>
          </div>
        ))}

        {/* Divider if both inputs and outputs exist */}
        {inputKeys.length > 0 && outputKeys.length > 0 && (
          <div className="border-t border-gray-100 my-1" />
        )}

        {/* Output handles */}
        {outputKeys.map((key) => (
          <div
            key={`output-${key}`}
            className="relative py-1 px-2.5 flex items-center justify-end"
          >
            <span className="text-gray-500 mr-1">{key}</span>
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
          <div className="py-1 px-2.5 text-gray-400 italic">No I/O</div>
        )}
      </div>

      {/* Footer with node type */}
      <div className="border-t border-gray-100 py-1 px-2.5 text-[10px] text-gray-400">
        {data.nodeType}
      </div>
    </div>
  );
};
