import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { WorkflowDSL } from "@flowit/shared";
import { useI18n } from "../../i18n";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface AIChatPanelProps {
  onPreviewWorkflow?: (workflow: WorkflowDSL) => void;
  onApproveWorkflow?: () => void;
  onRejectWorkflow?: () => void;
  hasPreview?: boolean;
}

export function AIChatPanel({
  onPreviewWorkflow,
  onApproveWorkflow,
  onRejectWorkflow,
  hasPreview,
}: AIChatPanelProps) {
  const { t } = useI18n();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const transport = new DefaultChatTransport({
    api: `${API_BASE_URL}/api/agent/chat`,
    fetch: (url: string | URL | Request, options?: RequestInit) =>
      fetch(url, { ...options, credentials: "include" }),
  });

  const { messages, sendMessage, status, error } = useChat({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";
  const [localError, setLocalError] = useState<string | null>(null);

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
  const [lastProcessedMessageId, setLastProcessedMessageId] = useState<string | null>(null);

  // Helper to get text content from message parts
  const getMessageText = (message: (typeof messages)[number]): string => {
    if (!message.parts) return "";
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part as { type: "text"; text: string }).text)
      .join("");
  };

  // Helper to extract workflow DSL from message parts
  const getWorkflowFromMessage = (message: (typeof messages)[number]): WorkflowDSL | null => {
    if (!message.parts || message.role !== "assistant") return null;
    for (const part of message.parts) {
      // Check for data-* type parts which may contain structured output
      if (part.type.startsWith("data-")) {
        const dataPart = part as { type: string; data?: unknown };
        if (dataPart.data && typeof dataPart.data === "object") {
          const obj = dataPart.data as Record<string, unknown>;
          if (obj.dslVersion === "0.1.0" && obj.nodes && obj.edges) {
            return obj as unknown as WorkflowDSL;
          }
        }
      }
      // Also try to parse text parts as JSON (fallback)
      if (part.type === "text") {
        const textPart = part as { type: "text"; text: string };
        try {
          const parsed = JSON.parse(textPart.text);
          if (parsed.dslVersion === "0.1.0" && parsed.nodes && parsed.edges) {
            return parsed as WorkflowDSL;
          }
        } catch {
          // Not valid JSON, continue
        }
      }
    }
    return null;
  };

  // Check the latest assistant message for a workflow and show preview
  useEffect(() => {
    if (isLoading) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant" && lastMessage.id !== lastProcessedMessageId) {
      const workflow = getWorkflowFromMessage(lastMessage);
      if (workflow && onPreviewWorkflow) {
        onPreviewWorkflow(workflow);
        setLastProcessedMessageId(lastMessage.id);
      }
    }
  }, [messages, isLoading, lastProcessedMessageId, onPreviewWorkflow]);

  const handleApprove = () => {
    if (onApproveWorkflow) {
      onApproveWorkflow();
    }
  };

  const handleReject = () => {
    if (onRejectWorkflow) {
      onRejectWorkflow();
    }
  };

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
          const workflow = getWorkflowFromMessage(message);
          return (
            <div
              key={message.id}
              className={`p-2 rounded-lg text-sm ${
                message.role === "user"
                  ? "bg-blue-100 text-blue-900 ml-4"
                  : "bg-white border border-gray-200 mr-4"
              }`}
            >
              {workflow ? (
                <div className="space-y-2">
                  <div className="font-medium text-green-700">{t.workflowGenerated}</div>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-60 whitespace-pre-wrap">
                    {JSON.stringify(workflow, null, 2)}
                  </pre>
                </div>
              ) : (
                getMessageText(message)
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

      {/* Approve/Reject buttons */}
      {hasPreview && (
        <div className="p-3 border-t border-gray-200 bg-white flex gap-2">
          <button
            onClick={handleApprove}
            className="flex-1 py-2 px-3 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600"
          >
            {t.approveWorkflow}
          </button>
          <button
            onClick={handleReject}
            className="flex-1 py-2 px-3 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300"
          >
            {t.rejectWorkflow}
          </button>
        </div>
      )}

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
