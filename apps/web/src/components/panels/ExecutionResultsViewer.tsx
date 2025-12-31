import { useEffect, useState, useCallback } from "react";
import { useI18n } from "../../i18n";
import { client } from "../../api/client";

interface Execution {
  id: string;
  workflowId: string;
  versionId: string;
  status: "pending" | "running" | "success" | "error" | "cancelled";
  inputs: unknown;
  outputs: unknown;
  error: string | null;
  workerId: string | null;
  scheduledAt: string;
  retryCount: number;
  maxRetries: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface ExecutionResultsViewerProps {
  workflowId: string;
}

export const ExecutionResultsViewer = ({
  workflowId,
}: ExecutionResultsViewerProps) => {
  const { t } = useI18n();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadExecutions = useCallback(async () => {
    if (!workflowId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await client.api.workflows[":id"].executions.$get({
        param: { id: workflowId },
        query: { limit: "50", offset: "0" },
      });
      if (!res.ok) {
        throw new Error(`Failed to load executions: ${res.statusText}`);
      }
      const result = await res.json();
      setExecutions(result.executions as Execution[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load executions"
      );
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    loadExecutions();
  }, [loadExecutions]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt || !completedAt) return "-";
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    const duration = end - start;
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  };

  const getStatusBadge = (status: Execution["status"]) => {
    const statusConfig = {
      pending: { bg: "bg-gray-100", text: "text-gray-700", label: t.statusPending },
      running: { bg: "bg-blue-100", text: "text-blue-700", label: t.statusRunning },
      success: { bg: "bg-green-100", text: "text-green-700", label: t.statusSuccess },
      error: { bg: "bg-red-100", text: "text-red-700", label: t.statusError },
      cancelled: { bg: "bg-yellow-100", text: "text-yellow-700", label: t.statusCancelled },
    };
    const config = statusConfig[status];
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    );
  };

  const formatJson = (data: unknown) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="py-3 px-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <h2 className="m-0 text-base font-semibold">{t.executionResults}</h2>
        <div className="flex gap-2">
          <button
            onClick={loadExecutions}
            className="py-1.5 px-3 bg-gray-100 border border-gray-300 rounded cursor-pointer text-sm"
          >
            {t.refresh}
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
        ) : executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
            <p className="mb-2 text-sm">{t.noExecutions}</p>
            <p className="text-xs text-gray-400">{t.noExecutionsDescription}</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_100px_140px_140px_80px] gap-2 py-2.5 px-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
              <div>{t.executionId}</div>
              <div>{t.status}</div>
              <div>{t.startedAt}</div>
              <div>{t.completedAt}</div>
              <div>{t.duration}</div>
            </div>

            {/* Table Body */}
            <div>
              {executions.map((execution) => {
                const isExpanded = expandedId === execution.id;
                return (
                  <div
                    key={execution.id}
                    className="border-b border-gray-100 last:border-b-0"
                  >
                    <div
                      onClick={() =>
                        setExpandedId(isExpanded ? null : execution.id)
                      }
                      className="grid grid-cols-[1fr_100px_140px_140px_80px] gap-2 py-2.5 px-4 cursor-pointer hover:bg-gray-50 items-center"
                    >
                      <div className="font-mono text-xs text-gray-700 flex items-center gap-2">
                        <span
                          className={`text-xs text-gray-400 transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        >
                          ▶
                        </span>
                        {execution.id.slice(0, 8)}...
                      </div>
                      <div>{getStatusBadge(execution.status)}</div>
                      <div className="text-xs text-gray-600">
                        {formatDate(execution.startedAt)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatDate(execution.completedAt)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatDuration(execution.startedAt, execution.completedAt)}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="py-3 px-4 bg-gray-50 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Inputs */}
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                              {t.inputs}
                            </div>
                            <pre className="m-0 font-mono text-xs whitespace-pre-wrap break-all bg-white p-2 rounded border border-gray-200 max-h-48 overflow-auto">
                              {formatJson(execution.inputs) || "-"}
                            </pre>
                          </div>

                          {/* Outputs or Error */}
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                              {execution.status === "error"
                                ? t.error
                                : t.outputs}
                            </div>
                            <pre
                              className={`m-0 font-mono text-xs whitespace-pre-wrap break-all p-2 rounded border max-h-48 overflow-auto ${
                                execution.status === "error"
                                  ? "bg-red-50 border-red-200 text-red-700"
                                  : "bg-white border-gray-200"
                              }`}
                            >
                              {execution.status === "error"
                                ? execution.error || "-"
                                : formatJson(execution.outputs) || "-"}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
