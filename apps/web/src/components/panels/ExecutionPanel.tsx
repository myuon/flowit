import { memo } from "react";
import { useI18n } from "../../i18n";

export interface ExecutionLog {
  type: "info" | "success" | "error" | "node";
  message: string;
  timestamp: Date;
  nodeId?: string;
}

export interface ExecutionResult {
  status: "idle" | "running" | "success" | "error";
  executionId?: string;
  outputs?: Record<string, unknown>;
  error?: string;
  logs: ExecutionLog[];
}

interface ExecutionPanelProps {
  execution: ExecutionResult;
  onExecute: () => void;
  onClear: () => void;
}

function ExecutionPanelComponent({
  execution,
  onExecute,
  onClear,
}: ExecutionPanelProps) {
  const { t } = useI18n();
  const isRunning = execution.status === "running";

  return (
    <div
      style={{
        height: 200,
        borderTop: "1px solid #e0e0e0",
        background: "#1e1e1e",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid #333",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          onClick={onExecute}
          disabled={isRunning}
          style={{
            padding: "6px 16px",
            background: isRunning ? "#555" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: isRunning ? "not-allowed" : "pointer",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {isRunning ? (
            <>
              <span
                style={{
                  width: 12,
                  height: 12,
                  border: "2px solid #fff",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              {t.running}
            </>
          ) : (
            <>
              <span>▶</span>
              {t.execute}
            </>
          )}
        </button>

        <button
          onClick={onClear}
          style={{
            padding: "6px 12px",
            background: "#333",
            color: "#ccc",
            border: "1px solid #555",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          {t.clear}
        </button>

        <div style={{ flex: 1 }} />

        {execution.executionId && (
          <span style={{ color: "#888", fontSize: 11 }}>
            ID: {execution.executionId.slice(0, 8)}...
          </span>
        )}

        {execution.status === "success" && (
          <span style={{ color: "#4CAF50", fontSize: 12, fontWeight: 500 }}>
            ✓ {t.success}
          </span>
        )}
        {execution.status === "error" && (
          <span style={{ color: "#f44336", fontSize: 12, fontWeight: 500 }}>
            ✗ {t.error}
          </span>
        )}
      </div>

      {/* Log Output */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "8px 12px",
          fontFamily: "monospace",
          fontSize: 12,
        }}
      >
        {execution.logs.length === 0 ? (
          <div style={{ color: "#666" }}>
            {t.runWorkflow}
          </div>
        ) : (
          execution.logs.map((log, index) => (
            <div
              key={index}
              style={{
                marginBottom: 4,
                display: "flex",
                gap: 8,
              }}
            >
              <span style={{ color: "#666" }}>
                {log.timestamp.toLocaleTimeString()}
              </span>
              <span
                style={{
                  color:
                    log.type === "error"
                      ? "#f44336"
                      : log.type === "success"
                        ? "#4CAF50"
                        : log.type === "node"
                          ? "#2196F3"
                          : "#ccc",
                }}
              >
                {log.type === "node" && log.nodeId && (
                  <span style={{ color: "#888" }}>[{log.nodeId}] </span>
                )}
                {log.message}
              </span>
            </div>
          ))
        )}

        {/* Show outputs if success */}
        {execution.status === "success" && execution.outputs && (
          <div style={{ marginTop: 12 }}>
            <div style={{ color: "#4CAF50", marginBottom: 4 }}>
              {t.output}
            </div>
            <pre
              style={{
                background: "#2d2d2d",
                padding: 8,
                borderRadius: 4,
                color: "#ccc",
                overflow: "auto",
                margin: 0,
              }}
            >
              {JSON.stringify(execution.outputs, null, 2)}
            </pre>
          </div>
        )}

        {/* Show error if failed */}
        {execution.status === "error" && execution.error && (
          <div style={{ marginTop: 8 }}>
            <div style={{ color: "#f44336" }}>Error: {execution.error}</div>
          </div>
        )}
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export const ExecutionPanel = memo(ExecutionPanelComponent);
