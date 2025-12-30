import { useI18n } from "../../i18n";
import { Button } from "../ui/Button";

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

export const ExecutionPanel = ({
  execution,
  onExecute,
  onClear,
}: ExecutionPanelProps) => {
  const { t } = useI18n();
  const isRunning = execution.status === "running";

  return (
    <div className="h-50 border-t border-gray-200 bg-[#1e1e1e] flex flex-col">
      {/* Toolbar */}
      <div className="py-2 px-3 border-b border-gray-700 flex items-center gap-2">
        <Button
          color="success"
          onClick={onExecute}
          disabled={isRunning}
          className={`font-medium flex items-center gap-1.5 ${
            isRunning ? "bg-gray-600" : ""
          }`}
        >
          {isRunning ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t.running}
            </>
          ) : (
            <>
              <span>▶</span>
              {t.execute}
            </>
          )}
        </Button>

        <Button color="dark" onClick={onClear}>
          {t.clear}
        </Button>

        <div className="flex-1" />

        {execution.executionId && (
          <span className="text-gray-500 text-xs">
            ID: {execution.executionId.slice(0, 8)}...
          </span>
        )}

        {execution.status === "success" && (
          <span className="text-green-500 text-xs font-medium">
            ✓ {t.success}
          </span>
        )}
        {execution.status === "error" && (
          <span className="text-red-500 text-xs font-medium">
            ✗ {t.error}
          </span>
        )}
      </div>

      {/* Log Output */}
      <div className="flex-1 overflow-auto py-2 px-3 font-mono text-xs">
        {execution.logs.length === 0 ? (
          <div className="text-gray-500">{t.runWorkflow}</div>
        ) : (
          execution.logs.map((log, index) => (
            <div key={index} className="mb-1 flex gap-2">
              <span className="text-gray-500">
                {log.timestamp.toLocaleTimeString()}
              </span>
              <span
                className={
                  log.type === "error"
                    ? "text-red-500"
                    : log.type === "success"
                      ? "text-green-500"
                      : log.type === "node"
                        ? "text-blue-500"
                        : "text-gray-300"
                }
              >
                {log.type === "node" && log.nodeId && (
                  <span className="text-gray-500">[{log.nodeId}] </span>
                )}
                {log.message}
              </span>
            </div>
          ))
        )}

        {/* Show outputs if success */}
        {execution.status === "success" && execution.outputs && (
          <div className="mt-3">
            <div className="text-green-500 mb-1">{t.output}</div>
            <pre className="bg-[#2d2d2d] p-2 rounded text-gray-300 overflow-auto m-0">
              {JSON.stringify(execution.outputs, null, 2)}
            </pre>
          </div>
        )}

        {/* Show error if failed */}
        {execution.status === "error" && execution.error && (
          <div className="mt-2">
            <div className="text-red-500">Error: {execution.error}</div>
          </div>
        )}
      </div>
    </div>
  );
};
