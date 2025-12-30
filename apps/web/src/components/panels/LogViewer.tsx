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
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="py-3 px-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <h2 className="m-0 text-base font-semibold">{t.executionLogsHistory}</h2>
        <div className="flex gap-2">
          <button
            onClick={loadLogs}
            className="py-1.5 px-3 bg-gray-100 border border-gray-300 rounded cursor-pointer text-sm"
          >
            {t.refresh}
          </button>
          <button
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            className={`py-1.5 px-3 rounded text-sm ${
              logs.length === 0
                ? "bg-gray-100 border border-gray-300 text-gray-400 cursor-not-allowed"
                : "bg-red-50 border border-red-200 text-red-600 cursor-pointer"
            }`}
          >
            {t.clearAllLogs}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12 text-gray-500">
            {t.loading}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
            <p className="mb-2 text-sm">{t.noExecutionLogs}</p>
            <p className="text-xs text-gray-400">
              {t.noExecutionLogsDescription}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.entries(groupedLogs).map(([executionId, executionLogs]) => (
              <div
                key={executionId}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Execution Header */}
                <div className="py-2.5 px-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                  <span className="font-mono text-xs text-gray-500">
                    {t.executionId}: {executionId.slice(0, 8)}...
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(executionLogs[0].createdAt)}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                    {executionLogs.length} {t.logs}
                  </span>
                </div>

                {/* Logs */}
                <div>
                  {executionLogs.map((log) => {
                    const isExpanded = expandedLogs.has(log.id);
                    return (
                      <div key={log.id} className="border-b border-gray-100 last:border-b-0">
                        <div
                          onClick={() => toggleExpand(log.id)}
                          className="py-2.5 px-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
                        >
                          <span
                            className={`text-xs text-gray-500 transition-transform ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          >
                            ▶
                          </span>
                          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {log.nodeId}
                          </span>
                          <span className="flex-1 text-sm text-gray-800 overflow-hidden text-ellipsis whitespace-nowrap">
                            {formatData(log.data).slice(0, 100)}
                            {formatData(log.data).length > 100 ? "..." : ""}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        {isExpanded && (
                          <div className="py-3 px-4 bg-gray-50 border-t border-gray-100">
                            <pre className="m-0 font-mono text-xs whitespace-pre-wrap break-all">
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
