import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { useI18n } from "../../i18n";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface AIChatPanelProps {
  workflowId: string;
  onWorkflowUpdated?: () => void;
}

export function AIChatPanel({
  workflowId,
  onWorkflowUpdated,
}: AIChatPanelProps) {
  const { t } = useI18n();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const transport = new DefaultChatTransport({
    api: `${API_BASE_URL}/api/agent/chat`,
    body: { workflowId },
    fetch: (url: string | URL | Request, options?: RequestInit) =>
      fetch(url, { ...options, credentials: "include" }),
  });

  const { messages, sendMessage, status, error, addToolApprovalResponse } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  const isLoading = status === "streaming" || status === "submitted";
  const [localError, setLocalError] = useState<string | null>(null);
  const [lastProcessedMessageId, setLastProcessedMessageId] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const text = input;
    setInput("");
    setLocalError(null);
    try {
      await sendMessage({
        role: "user",
        parts: [{ type: "text", text }],
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t.aiAgentError);
    }
  };

  const displayError = localError || error?.message;

  // Helper to get text content from message parts
  const getMessageText = (message: (typeof messages)[number]): string => {
    if (!message.parts) return "";
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part as { type: "text"; text: string }).text)
      .join("");
  };

  // Helper to get tool calls from message parts
  const getToolCalls = (message: (typeof messages)[number]): Array<{ toolName: string; args: unknown }> => {
    if (!message.parts || message.role !== "assistant") return [];
    return message.parts
      .filter((part) => part.type === "tool-call")
      .map((part) => {
        const toolPart = part as unknown as { type: "tool-call"; toolName: string; args: unknown };
        return { toolName: toolPart.toolName, args: toolPart.args };
      });
  };

  // Helper to get tool parts that need approval (type is "tool-{toolName}")
  interface ToolPart {
    type: string;
    toolCallId: string;
    state: "approval-requested" | "output-available" | string;
    input: unknown;
    approval?: { id: string };
    output?: unknown;
  }

  const getEditWorkflowParts = (message: (typeof messages)[number]): ToolPart[] => {
    if (!message.parts || message.role !== "assistant") return [];
    return message.parts
      .filter((part) => part.type === "tool-editCurrentWorkflow")
      .map((part) => part as unknown as ToolPart);
  };

  // Check for editCurrentWorkflow tool call and trigger refetch
  useEffect(() => {
    if (isLoading) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant" && lastMessage.id !== lastProcessedMessageId) {
      const toolCalls = getToolCalls(lastMessage);
      const hasEditWorkflow = toolCalls.some((tc) => tc.toolName === "editCurrentWorkflow");
      if (hasEditWorkflow && onWorkflowUpdated) {
        onWorkflowUpdated();
        setLastProcessedMessageId(lastMessage.id);
      }
    }
  }, [messages, isLoading, lastProcessedMessageId, onWorkflowUpdated]);

  return (
    <div className="w-60 border-r border-gray-200 bg-gray-50 h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-white">
        <h3 className="text-sm font-semibold text-gray-700">{t.aiAssistant}</h3>
        <p className="text-xs text-gray-500 mt-1">{t.aiAssistantDescription}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-xs mt-8">
            {t.aiChatEmpty}
          </div>
        )}
        {messages.map((message) => {
          const toolCalls = getToolCalls(message);
          const editWorkflowParts = getEditWorkflowParts(message);
          const textContent = getMessageText(message);
          return (
            <div
              key={message.id}
              className={`p-2 rounded-lg text-sm ${
                message.role === "user"
                  ? "bg-blue-100 text-blue-900 ml-4"
                  : "bg-white border border-gray-200 mr-4"
              }`}
            >
              {/* Text content */}
              {textContent && <div>{textContent}</div>}

              {/* Tool calls */}
              {toolCalls.length > 0 && (
                <div className="mt-2 space-y-1">
                  {toolCalls.map((tc, idx) => (
                    <div key={idx} className="text-xs bg-gray-100 p-1.5 rounded border border-gray-200">
                      <span className="font-medium text-purple-700">{tc.toolName}</span>
                      {tc.toolName !== "editCurrentWorkflow" && (
                        <pre className="mt-1 text-gray-600 overflow-auto max-h-20 whitespace-pre-wrap">
                          {JSON.stringify(tc.args, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Tool parts that need approval */}
              {editWorkflowParts.length > 0 && (
                <div className="mt-2 space-y-2">
                  {editWorkflowParts.map((part) => (
                    <div key={part.toolCallId} className="text-xs bg-amber-50 p-2 rounded border border-amber-200">
                      <div className="font-medium text-amber-800 mb-1">
                        {t.workflowGenerated}
                      </div>
                      {part.state === "approval-requested" && part.approval && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() =>
                              addToolApprovalResponse({
                                id: part.approval!.id,
                                approved: true,
                              })
                            }
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                          >
                            {t.approveWorkflow}
                          </button>
                          <button
                            onClick={() =>
                              addToolApprovalResponse({
                                id: part.approval!.id,
                                approved: false,
                              })
                            }
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                          >
                            {t.rejectWorkflow}
                          </button>
                        </div>
                      )}
                      {part.state === "output-available" && (
                        <div className="text-green-700 mt-1">
                          {t.approveWorkflow} ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
            {t.aiThinking}
          </div>
        )}
        {displayError && (
          <div className="p-2 rounded-lg text-sm bg-red-50 border border-red-200 text-red-600 mr-4">
            {displayError}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="p-3 border-t border-gray-200">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
            placeholder={t.aiInputPlaceholder}
            disabled={isLoading}
            rows={3}
            className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-400 disabled:bg-gray-100 resize-none"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-1.5 bottom-3 w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
            title={t.send}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
