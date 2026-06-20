"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, X, AlertTriangle, Bot } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface QuotaStatus {
  daily_token_limit: number;
  tokens_used_today: number;
  usage_percent: number;
}

function formatMessageContent(content: string): React.ReactNode {
  if (!content) return "";

  const lines = content.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, lineIdx) => {
        let trimmed = line.trim();

        if (trimmed === "") {
          return <div key={lineIdx} className="h-1" />;
        }

        // Headers
        let isHeader = false;
        let headerClass = "";
        if (trimmed.startsWith("### ")) {
          isHeader = true;
          headerClass = "text-[12px] font-bold text-on-surface mt-2 mb-0.5 block";
          trimmed = trimmed.substring(4);
        } else if (trimmed.startsWith("## ")) {
          isHeader = true;
          headerClass = "text-[13px] font-bold text-on-surface mt-2.5 mb-1 block";
          trimmed = trimmed.substring(3);
        } else if (trimmed.startsWith("# ")) {
          isHeader = true;
          headerClass = "text-sm font-extrabold text-on-surface mt-3 mb-1.5 block";
          trimmed = trimmed.substring(2);
        }

        // Bullet point
        const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ");
        if (isBullet) {
          trimmed = trimmed.substring(2);
        }

        // Bold text **bold**
        const boldRegex = /\*\*(.*?)\*\*/g;
        const textParts: React.ReactNode[] = [];
        let match;
        let lastIndex = 0;

        while ((match = boldRegex.exec(trimmed)) !== null) {
          const matchIndex = match.index;
          if (matchIndex > lastIndex) {
            textParts.push(trimmed.substring(lastIndex, matchIndex));
          }
          textParts.push(
            <strong key={matchIndex} className="font-bold text-on-surface bg-on-surface/5 px-1 py-0.5 rounded-lg">
              {match[1]}
            </strong>
          );
          lastIndex = boldRegex.lastIndex;
        }

        if (lastIndex < trimmed.length) {
          textParts.push(trimmed.substring(lastIndex));
        }

        const lineContent = textParts.length > 0 ? textParts : trimmed;

        if (isHeader) {
          return (
            <span key={lineIdx} className={headerClass}>
              {lineContent}
            </span>
          );
        }

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-1.5 pl-1 py-0.5">
              <span className="text-primary mt-1.5 shrink-0 select-none text-[6px]">•</span>
              <span className="flex-1">{lineContent}</span>
            </div>
          );
        }

        return <p key={lineIdx} className="text-on-surface">{lineContent}</p>;
      })}
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 px-1">
      <span className="h-1.5 w-1.5 rounded-full bg-on-surface-variant/50 animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-on-surface-variant/50 animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-on-surface-variant/50 animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return date.toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [hasPulsed, setHasPulsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/user/quota-status");
      if (res.ok) {
        const data = await res.json();
        setQuotaStatus(data);
        if (data.usage_percent >= 100) {
          setQuotaExceeded(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch quota status:", err);
    }
  }, []);

  useEffect(() => {
    // Tạm thời vô hiệu hóa kiểm tra quota theo yêu cầu
  }, [isOpen, fetchQuota]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const quotaTextColor = (() => {
    if (!quotaStatus) return "text-on-surface-variant";
    const pct = quotaStatus.usage_percent;
    if (pct >= 90) return "text-red-400";
    if (pct >= 70) return "text-amber-500";
    return "text-on-surface-variant";
  })();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim(), timestamp: new Date() };
    setInput("");

    setMessages((prev) => [
      ...prev,
      userMessage,
      { role: "assistant", content: "", timestamp: new Date() },
    ]);
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
          usePro: false,
        }),
      });

      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        setQuotaExceeded(true);
        setIsLoading(false);

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
              timestamp: updated[updated.length - 1].timestamp,
            };
          }
          return updated;
        });
      }

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
        className="fixed bottom-6 right-6 z-50 h-[52px] w-[52px] gradient-primary text-on-primary rounded-full flex items-center justify-center transition-all duration-150 hover:scale-105"
        style={{ boxShadow: "0 8px 24px rgba(0, 80, 203, 0.35)" }}
        aria-label="Mở Trợ lý AI"
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            {!hasPulsed && (
              <span
                className="absolute inset-0 rounded-full animate-ping opacity-50"
                style={{
                  background: "linear-gradient(135deg, #0050cb, #0066ff)",
                  animationIterationCount: 1,
                  animationDuration: "1.5s",
                }}
                onAnimationEnd={() => setHasPulsed(true)}
              />
            )}
          </>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden glass shadow-[0_32px_64px_rgba(19,27,46,0.14)] dark:shadow-[0_32px_64px_rgba(0,0,0,0.4)]"
          style={{
            width: "360px",
            maxHeight: "520px",
            borderRadius: "20px",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <h3 className="font-manrope font-semibold text-base text-on-surface">
              Trợ lý AI
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-all duration-150"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-3">
                <div className="h-12 w-12 gradient-primary rounded-2xl flex items-center justify-center opacity-90">
                  <Bot className="h-6 w-6 text-on-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-on-surface font-manrope">Tôi có thể giúp gì cho bạn?</h4>
                  <p className="text-xs text-on-surface-variant mt-1 max-w-[240px] font-inter">
                    Đặt câu hỏi về kiểm duyệt, xem dữ liệu hoặc trợ giúp công việc chung.
                  </p>
                </div>
                <div className="mt-2 flex flex-col gap-2 w-full max-w-[260px]">
                  <button
                    onClick={() => setInput("Tôi có bài nào chưa share không?")}
                    className="px-3 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs rounded-xl transition-all duration-150 text-left flex items-center justify-between group"
                  >
                    <span>Tôi có bài nào chưa share không?</span>
                    <Send className="h-3 w-3 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button
                    onClick={() => setInput("Có bài nào tôi quá hạn không?")}
                    className="px-3 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs rounded-xl transition-all duration-150 text-left flex items-center justify-between group"
                  >
                    <span>Có bài nào tôi quá hạn không?</span>
                    <Send className="h-3 w-3 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button
                    onClick={() => setInput("Tình hình share bài của tôi trong 2 tháng qua?")}
                    className="px-3 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs rounded-xl transition-all duration-150 text-left flex items-center justify-between group"
                  >
                    <span>Tình hình share bài trong 2 tháng qua?</span>
                    <Send className="h-3 w-3 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index}>
                  <div
                    className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-3.5 py-2 text-xs leading-relaxed whitespace-pre-wrap font-inter ${
                        msg.role === "user"
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-low text-on-surface"
                      }`}
                      style={{
                        borderRadius:
                          msg.role === "user"
                            ? "16px 16px 4px 16px"
                            : "16px 16px 16px 4px",
                      }}
                    >
                      {msg.content === "" && isLoading && index === messages.length - 1 ? (
                        <LoadingDots />
                      ) : msg.role === "assistant" ? (
                        formatMessageContent(msg.content)
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                  <p
                    className={`font-inter text-[10px] text-on-surface-variant mt-0.5 ${
                      msg.role === "user" ? "text-right mr-1" : "text-left ml-1"
                    }`}
                  >
                    {formatTimestamp(msg.timestamp)}
                  </p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>



          {/* Input Area */}
          <div className="px-3 pb-3 pt-1 shrink-0">
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 bg-surface-container rounded-xl px-3 py-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder="Nhập tin nhắn..."
                className="flex-1 bg-transparent text-xs text-on-surface placeholder-on-surface-variant/60 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-inter"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-8 w-8 rounded-full gradient-primary text-on-primary flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>


          </div>
        </div>
      )}
    </>
  );
}
