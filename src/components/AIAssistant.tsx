"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, X, Loader2, Bot, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface QuotaStatus {
  daily_token_limit: number;
  tokens_used_today: number;
  usage_percent: number;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [usePro, setUsePro] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch quota status
  const fetchQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/user/quota-status");
      if (res.ok) {
        const data = await res.json();
        setQuotaStatus(data);
        // Nếu đã hết quota từ trước, disable input
        if (data.usage_percent >= 100) {
          setQuotaExceeded(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch quota status:", err);
    }
  }, []);

  // Fetch quota when chat opens
  useEffect(() => {
    if (isOpen) {
      fetchQuota();
    }
  }, [isOpen, fetchQuota]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Progress bar color and text
  const quotaColor = (() => {
    if (!quotaStatus) return "bg-emerald-500";
    const pct = quotaStatus.usage_percent;
    if (pct >= 90) return "bg-red-500";
    if (pct >= 70) return "bg-amber-500";
    return "bg-emerald-500";
  })();

  const quotaTextColor = (() => {
    if (!quotaStatus) return "text-slate-400";
    const pct = quotaStatus.usage_percent;
    if (pct >= 90) return "text-red-400";
    if (pct >= 70) return "text-amber-400";
    return "text-slate-400";
  })();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || quotaExceeded) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const currentInput = input;
    setInput("");

    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setIsLoading(true);

    try {
      const chatHistory = [...messages, userMessage];

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: chatHistory.map(m => ({ role: m.role, content: m.content })),
          usePro,
        }),
      });

      // Handle 429 Quota Exceeded
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        setQuotaExceeded(true);
        setIsLoading(false);

        // Remove the placeholder empty assistant message
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].content === "") {
            updated.pop();
          }
          return updated;
        });

        toast.error(errorData.message || "Bạn đã vượt quá hạn mức sử dụng AI trong ngày hôm nay.", {
          duration: 6000,
        });
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Lỗi kết nối API (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Không thể khởi tạo luồng nhận dữ liệu (Reader).");
      }

      const decoder = new TextDecoder();
      let assistantResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantResponse += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              role: "assistant",
              content: assistantResponse,
            };
          }
          return updated;
        });
      }

      // Refresh quota after successful response
      fetchQuota();
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMessage = err.message || "Không thể gửi tin nhắn. Vui lòng kiểm tra lại kết nối.";

      toast.error(errorMessage, {
        duration: 5000,
      });

      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].content === "") {
          updated.pop();
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center border border-indigo-400/20"
        aria-label="Mở Trợ lý AI"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[90vw] sm:w-[400px] h-[550px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-600/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Trợ lý AI</h3>
                <p className="text-[10px] text-slate-400 font-medium">DeepSeek Engine</p>
              </div>
            </div>

            {/* Model Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
              <select
                value={usePro ? "pro" : "flash"}
                onChange={(e) => setUsePro(e.target.value === "pro")}
                className="bg-transparent text-[11px] font-medium text-slate-300 focus:outline-none border-none cursor-pointer"
              >
                <option value="flash" className="bg-slate-900 text-slate-350">DeepSeek Flash (Nhanh)</option>
                <option value="pro" className="bg-slate-900 text-slate-355">DeepSeek Pro (Thông minh)</option>
              </select>
            </div>
          </div>

          {/* Quota Progress Bar */}
          {quotaStatus && (
            <div className="px-4 pt-2.5 pb-1.5 bg-slate-950/80 border-b border-slate-800/50">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-medium ${quotaTextColor}`}>
                  Đã dùng: {quotaStatus.tokens_used_today.toLocaleString()} / {quotaStatus.daily_token_limit.toLocaleString()} tokens hôm nay
                </span>
                {quotaStatus.usage_percent >= 90 && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    Sắp hết quota
                  </span>
                )}
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${quotaColor}`}
                  style={{ width: `${Math.min(quotaStatus.usage_percent, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Quota Exceeded Banner */}
          {quotaExceeded && (
            <div className="mx-3 mt-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-red-400">Đã hết hạn mức sử dụng AI</p>
                <p className="text-[10px] text-red-300/80 mt-0.5">
                  Bạn đã sử dụng hết {quotaStatus?.daily_token_limit?.toLocaleString() ?? "100,000"} tokens trong ngày hôm nay. Vui lòng quay lại vào ngày mai!
                </p>
              </div>
            </div>
          )}

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Tôi có thể giúp gì cho bạn?</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                    Đặt câu hỏi về kiểm duyệt, xem dữ liệu hoặc trợ giúp công việc chung.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-7 w-7 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0 mt-0.5">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-none"
                    }`}
                  >
                    {msg.content === "" && isLoading && index === messages.length - 1 ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || quotaExceeded}
              placeholder={quotaExceeded ? "Đã hết hạn mức AI hôm nay" : "Nhập tin nhắn để bắt đầu..."}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || quotaExceeded}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl transition shrink-0 flex items-center justify-center disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
