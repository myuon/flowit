import { useCallback, useState } from "react";
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
import { validateGasDeployment } from "../../api/client";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";

interface ParamPanelProps {
  selectedNode: Node<WorkflowNodeData> | null;
  onUpdateParams: (nodeId: string, params: Record<string, unknown>) => void;
  workflowId?: string;
}

export const ParamPanel = ({
  selectedNode,
  onUpdateParams,
  workflowId,
}: ParamPanelProps) => {
  const { t, language } = useI18n();
  const [validationState, setValidationState] = useState<{
    status: "idle" | "validating" | "success" | "error";
    message?: string;
    scriptName?: string;
  }>({ status: "idle" });

  const handleValidateGasDeployment = useCallback(async () => {
    if (!selectedNode) return;

    const deploymentIdParam = selectedNode.data.params.deploymentId;
    const deploymentId =
      typeof deploymentIdParam === "object" &&
      deploymentIdParam !== null &&
      "value" in deploymentIdParam
        ? String((deploymentIdParam as { value: unknown }).value)
        : "";

    if (!deploymentId) {
      setValidationState({
        status: "error",
        message: t.deploymentIdRequired || "Deployment ID is required",
      });
      return;
    }

    setValidationState({ status: "validating" });

    try {
      const result = await validateGasDeployment(deploymentId);
      if (result.valid) {
        setValidationState({
          status: "success",
          message: t.deploymentValid || "Deployment is valid",
          scriptName: result.scriptName,
        });
      } else {
        setValidationState({
          status: "error",
          message:
            result.error || t.deploymentInvalid || "Deployment is invalid",
        });
      }
    } catch (error) {
      setValidationState({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [selectedNode, t]);

  const handleParamChange = useCallback(
    (key: string, value: unknown) => {
      if (!selectedNode) return;
      onUpdateParams(selectedNode.id, {
        ...selectedNode.data.params,
        [key]: { type: "static", value },
      });
    },
    [selectedNode, onUpdateParams]
  );

  if (!selectedNode) {
    return (
      <Panel header={t.properties}>
        <div className="py-7 text-center text-gray-500 text-sm">
          {t.selectNode}
        </div>
      </Panel>
    );
  }

  const nodeDefinition = getNode(selectedNode.data.nodeType);
  const paramsSchema = nodeDefinition?.paramsSchema || {};

  const getParamValue = (key: string): unknown => {
    const param = selectedNode.data.params[key];
    if (!param) return "";
    if (typeof param === "object" && param !== null && "value" in param) {
      return (param as { value: unknown }).value;
    }
    return param;
  };

  return (
    <div>
      <Panel header={t.properties}>
        {/* Node Info */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
          <span className="text-xl">{selectedNode.data.icon || "📦"}</span>
          <div>
            <div className="font-medium">
              {getNodeDisplayName(
                selectedNode.data.nodeType,
                language,
                selectedNode.data.label
              )}
            </div>
            <div className="text-xs text-gray-500">
              {selectedNode.data.nodeType}
            </div>
          </div>
        </div>

        {/* Parameters */}
        <div className="text-xs font-semibold text-gray-500 uppercase mb-3">
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
          const label = getParamLabel(
            nodeType,
            key,
            language,
            paramSchema.label || key
          );
          const description = getParamDescription(
            nodeType,
            key,
            language,
            paramSchema.description
          );

          return (
            <div key={key} className="mb-4">
              <label className="block text-xs font-medium mb-1">{label}</label>
              {description && (
                <div className="text-xs text-gray-500 mb-1.5">{description}</div>
              )}

              {/* Render input based on type */}
              {paramSchema.type === "select" && paramSchema.options ? (
                <select
                  value={String(getParamValue(key) || "")}
                  onChange={(e) => handleParamChange(key, e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">{t.selectOption}</option>
                  {paramSchema.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {getParamOptionLabel(
                        nodeType,
                        key,
                        opt.value,
                        language,
                        opt.label
                      )}
                    </option>
                  ))}
                </select>
              ) : paramSchema.type === "boolean" ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(getParamValue(key))}
                    onChange={(e) => handleParamChange(key, e.target.checked)}
                  />
                  <span className="text-sm">{t.enabled}</span>
                </label>
              ) : paramSchema.type === "number" ? (
                <input
                  type="number"
                  value={String(getParamValue(key) || "")}
                  onChange={(e) =>
                    handleParamChange(key, parseFloat(e.target.value) || 0)
                  }
                  className="w-full p-2 border border-gray-300 rounded text-sm"
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
                  className="w-full p-2 border border-gray-300 rounded text-xs font-mono min-h-[100px] resize-y"
                />
              ) : paramSchema.multiline ? (
                <textarea
                  value={String(getParamValue(key) || "")}
                  onChange={(e) => handleParamChange(key, e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm min-h-[80px] resize-y"
                />
              ) : (
                <input
                  type="text"
                  value={String(getParamValue(key) || "")}
                  onChange={(e) => handleParamChange(key, e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              )}
            </div>
          );
        })}

        {Object.keys(paramsSchema).length === 0 && (
          <div className="text-gray-500 text-sm">{t.noParameters}</div>
        )}

        {/* Webhook URL for webhook-trigger nodes */}
        {selectedNode.data.nodeType === "webhook-trigger" &&
          (() => {
            const webhookName = String(getParamValue("name") || "");
            const baseUrl = window.location.origin.replace(/:\d+$/, ":3001");
            const webhookUrl = webhookName
              ? `${baseUrl}/webhooks/${workflowId}/${webhookName}`
              : null;

            return (
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  {t.webhookUrl}
                </div>
                {!workflowId ? (
                  <div className="text-gray-500 text-xs">
                    {t.saveWorkflowFirst}
                  </div>
                ) : !webhookName ? (
                  <div className="text-gray-500 text-xs">
                    {t.setWebhookName}
                  </div>
                ) : (
                  <>
                    <div className="p-2 bg-gray-100 rounded text-xs font-mono break-all mb-2">
                      {webhookUrl}
                    </div>
                    <Button
                      color="primary"
                      onClick={() => {
                        if (webhookUrl) {
                          navigator.clipboard.writeText(webhookUrl);
                        }
                      }}
                      className="text-xs"
                    >
                      {t.copyUrl}
                    </Button>
                    <div className="text-xs text-gray-500 mt-2">
                      {t.webhookNote}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

        {/* Validate deployment for GAS nodes */}
        {selectedNode.data.nodeType === "gas" && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
              {t.validateDeployment || "Validate Deployment"}
            </div>
            <Button
              color="primary"
              onClick={handleValidateGasDeployment}
              disabled={validationState.status === "validating"}
              className={`w-full text-xs ${
                validationState.status === "validating" ? "bg-gray-300" : ""
              }`}
            >
              {validationState.status === "validating"
                ? t.validating || "Validating..."
                : t.validate || "Validate"}
            </Button>
            {validationState.status === "success" && (
              <div className="mt-2 p-2 bg-green-100 rounded text-xs text-green-800">
                <div className="font-medium">{validationState.message}</div>
                {validationState.scriptName && (
                  <div className="mt-1 text-xs">
                    {t.scriptName || "Script"}: {validationState.scriptName}
                  </div>
                )}
              </div>
            )}
            {validationState.status === "error" && (
              <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">
                {validationState.message}
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
};
