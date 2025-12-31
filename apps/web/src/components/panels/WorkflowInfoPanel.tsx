import { useCallback, useState, useMemo } from "react";
import type { Node } from "@xyflow/react";
import type { WorkflowDSL } from "@flowit/shared";
import { getNode, validateWorkflow } from "@flowit/sdk";
import type { WorkflowNodeData } from "../nodes";
import { useI18n, getNodeDisplayName } from "../../i18n";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";

interface WorkflowInfoPanelProps {
  workflowId?: string;
  nodes: Node<WorkflowNodeData>[];
  edges: Array<{ source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }>;
}

export const WorkflowInfoPanel = ({
  workflowId,
  nodes,
  edges,
}: WorkflowInfoPanelProps) => {
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

  // Build webhook info for webhook-trigger nodes
  const getWebhookInfo = useCallback(
    (node: Node<WorkflowNodeData>): { url: string; method: string } | null => {
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

      const methodParam = node.data.params.method;
      const method =
        typeof methodParam === "object" &&
        methodParam !== null &&
        "value" in methodParam
          ? String((methodParam as { value: unknown }).value)
          : "POST";

      const baseUrl = window.location.origin.replace(/:\d+$/, ":3001");
      return {
        url: `${baseUrl}/webhooks/${workflowId}/${webhookName}`,
        method,
      };
    },
    [workflowId]
  );

  // Generate curl command for webhook
  const getCurlCommand = useCallback(
    (webhookInfo: { url: string; method: string }): string => {
      if (webhookInfo.method === "GET") {
        return `curl "${webhookInfo.url}"`;
      }
      return `curl -X POST "${webhookInfo.url}" \\
  -H "Content-Type: application/json" \\
  -d '{}'`;
    },
    []
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
    <div className="border-b border-gray-200 bg-gray-50">
      <Panel header={t.workflowInfo}>
        {/* Workflow ID */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
            {t.workflowId}
          </div>
          <div className="text-xs font-mono text-gray-800 bg-gray-100 px-2 py-1.5 rounded break-all">
            {workflowId || t.notSavedYet}
          </div>
        </div>

        {/* Input Nodes */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
            {t.inputNodes} ({inputNodes.length})
          </div>
          {inputNodes.length === 0 ? (
            <div className="text-xs text-gray-500">{t.noInputNodes}</div>
          ) : (
            <div className="flex flex-col gap-2">
              {inputNodes.map((node) => {
                const webhookInfo = getWebhookInfo(node);
                return (
                  <div
                    key={node.id}
                    className="bg-white border border-gray-200 rounded p-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">
                        {node.data.icon || "📥"}
                      </span>
                      <span className="text-xs font-medium">
                        {getNodeDisplayName(
                          node.data.nodeType,
                          language,
                          node.data.label
                        )}
                      </span>
                    </div>
                    {webhookInfo && (
                      <div className="mt-2">
                        <div className="text-[10px] text-gray-500 mb-1 flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                              webhookInfo.method === "GET"
                                ? "bg-green-500"
                                : "bg-blue-500"
                            }`}
                          >
                            {webhookInfo.method}
                          </span>
                          <span>{t.webhookUrl}:</span>
                        </div>
                        <div className="text-[10px] font-mono bg-gray-100 px-1.5 py-1 rounded break-all mb-1.5">
                          {webhookInfo.url}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            color="primary"
                            onClick={() => copyToClipboard(webhookInfo.url)}
                            className="px-2 py-1 text-[10px]"
                          >
                            {t.copyUrl}
                          </Button>
                          <Button
                            color="default"
                            onClick={() =>
                              copyToClipboard(getCurlCommand(webhookInfo))
                            }
                            className="px-2 py-1 text-[10px]"
                          >
                            {t.copyCurl}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Output Nodes */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
            {t.outputNodes} ({outputNodes.length})
          </div>
          {outputNodes.length === 0 ? (
            <div className="text-xs text-gray-500">{t.noOutputNodes}</div>
          ) : (
            <div className="flex flex-col gap-2">
              {outputNodes.map((node) => (
                <div
                  key={node.id}
                  className="bg-white border border-gray-200 rounded p-2 flex items-center gap-1.5"
                >
                  <span className="text-sm">
                    {node.data.icon || "📤"}
                  </span>
                  <span className="text-xs font-medium">
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
          <Button
            color="primary"
            onClick={handleValidate}
            className="w-full text-xs font-medium"
          >
            {t.validateWorkflow}
          </Button>
          {validationResult.status === "valid" && (
            <div className="mt-2 p-2 bg-green-100 rounded text-xs text-green-800">
              {t.workflowValid}
            </div>
          )}
          {validationResult.status === "invalid" && (
            <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">
              <div className="font-medium mb-1">
                {t.workflowInvalid}
              </div>
              <ul className="m-0 pl-4 text-xs">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
};
