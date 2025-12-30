import { useState, useRef, useEffect } from "react";
import { useI18n } from "../../i18n";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIChatPanel() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // TODO: Implement actual API call to agent endpoint
      // For now, just show a placeholder response
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const assistantMessage: Message = {
        role: "assistant",
        content: t.aiAgentPlaceholder,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        role: "assistant",
        content: t.aiAgentError,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-2 rounded-lg text-sm ${
              message.role === "user"
                ? "bg-blue-100 text-blue-900 ml-4"
                : "bg-white border border-gray-200 mr-4"
            }`}
          >
            {message.content}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
            {t.aiThinking}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
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
