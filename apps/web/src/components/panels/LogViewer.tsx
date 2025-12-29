import { memo, useEffect, useState, useCallback } from "react";
import { useI18n } from "../../i18n";
import {
  getExecutionLogs,
  deleteExecutionLogs,
  type ExecutionLogItem,
} from "../../api/client";

interface LogViewerProps {
  workflowId: string;
}

function LogViewerComponent({ workflowId }: LogViewerProps) {
  const { t } = useI18n();
  const [logs, setLogs] = useState<ExecutionLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const loadLogs = useCallback(async () => {
    if (!workflowId) return;

    setLoading(true);
    setError(null);
    try {
      const result = await getExecutionLogs(workflowId);
      setLogs(result.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleClearLogs = async () => {
    if (!confirm(t.confirmClearLogs)) return;

    try {
      await deleteExecutionLogs(workflowId);
      setLogs([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear logs");
    }
  };

  const toggleExpand = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatData = (data: unknown) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  // Group logs by executionId
  const groupedLogs = logs.reduce(
    (acc, log) => {
      if (!acc[log.executionId]) {
        acc[log.executionId] = [];
      }
      acc[log.executionId].push(log);
      return acc;
    },
    {} as Record<string, ExecutionLogItem[]>
  );

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#fafafa",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "white",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          {t.executionLogsHistory}
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={loadLogs}
            style={{
              padding: "6px 12px",
              background: "#f0f0f0",
              border: "1px solid #ddd",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {t.refresh}
          </button>
          <button
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            style={{
              padding: "6px 12px",
              background: logs.length === 0 ? "#f0f0f0" : "#fef2f2",
              border: `1px solid ${logs.length === 0 ? "#ddd" : "#fecaca"}`,
              borderRadius: 4,
              cursor: logs.length === 0 ? "not-allowed" : "pointer",
              fontSize: 13,
              color: logs.length === 0 ? "#999" : "#dc2626",
            }}
          >
            {t.clearAllLogs}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {error && (
          <div
            style={{
              padding: 12,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 6,
              color: "#dc2626",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: 48,
              color: "#666",
            }}
          >
            {t.loading}
          </div>
        ) : logs.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 48,
              color: "#666",
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
            }}
          >
            <p style={{ marginBottom: 8, fontSize: 14 }}>{t.noExecutionLogs}</p>
            <p style={{ fontSize: 12, color: "#999" }}>
              {t.noExecutionLogsDescription}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Object.entries(groupedLogs).map(([executionId, executionLogs]) => (
              <div
                key={executionId}
                style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                {/* Execution Header */}
                <div
                  style={{
                    padding: "10px 16px",
                    background: "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "#666",
                    }}
                  >
                    {t.executionId}: {executionId.slice(0, 8)}...
                  </span>
                  <span style={{ fontSize: 12, color: "#999" }}>
                    {formatDate(executionLogs[0].createdAt)}
                  </span>
                  <span
                    style={{
                      padding: "2px 8px",
                      background: "#dbeafe",
                      color: "#1d4ed8",
                      borderRadius: 4,
                      fontSize: 11,
                    }}
                  >
                    {executionLogs.length} {t.logs}
                  </span>
                </div>

                {/* Logs */}
                <div>
                  {executionLogs.map((log) => {
                    const isExpanded = expandedLogs.has(log.id);
                    return (
                      <div
                        key={log.id}
                        style={{
                          borderBottom: "1px solid #f0f0f0",
                        }}
                      >
                        <div
                          onClick={() => toggleExpand(log.id)}
                          style={{
                            padding: "10px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f9fafb";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <span
                            style={{
                              transform: isExpanded ? "rotate(90deg)" : "none",
                              transition: "transform 0.2s",
                              fontSize: 12,
                              color: "#666",
                            }}
                          >
                            ▶
                          </span>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 12,
                              background: "#f0f0f0",
                              padding: "2px 6px",
                              borderRadius: 4,
                            }}
                          >
                            {log.nodeId}
                          </span>
                          <span
                            style={{
                              flex: 1,
                              fontSize: 13,
                              color: "#333",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatData(log.data).slice(0, 100)}
                            {formatData(log.data).length > 100 ? "..." : ""}
                          </span>
                          <span style={{ fontSize: 11, color: "#999" }}>
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        {isExpanded && (
                          <div
                            style={{
                              padding: "12px 16px",
                              background: "#f9fafb",
                              borderTop: "1px solid #f0f0f0",
                            }}
                          >
                            <pre
                              style={{
                                margin: 0,
                                fontFamily: "monospace",
                                fontSize: 12,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-all",
                              }}
                            >
                              {formatData(log.data)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const LogViewer = memo(LogViewerComponent);
