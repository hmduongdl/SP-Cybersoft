"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, X, AlertTriangle, Bot } from "lucide-react";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="flex items-center gap-1.5 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-primary/80"
          animate={{ y: ["0%", "-65%", "0%"], scale: [1, 1.25, 1] }}
          transition={{
            duration: 0.55,
            repeat: Infinity,
            delay: i * 0.14,
            ease: [0.45, 0, 0.55, 1],
          }}
        />
      ))}
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

function getSuggestions(pathname: string | null): string[] {
  if (!pathname || pathname.includes("/admin")) return [];

  if (pathname.includes("/like-share")) {
    return [
      "Tôi có bài nào chưa share không?",
      "Thống kê lượt share bài của tôi tháng này?",
      "Làm sao để được duyệt bài nhanh và tự động nhất?"
    ];
  } else if (pathname.includes("/tasks")) {
    return [
      "Liệt kê các công việc đang quá hạn của tôi.",
      "Hôm nay tôi có những task nào cần làm?",
      "Đánh giá hiệu suất làm việc của tôi tháng này."
    ];
  } else if (pathname.includes("/reports")) {
    return [
      "Có thể kiểm tra các công việc tôi đã hoàn thành trong tháng này không?",
      "Hiệu suất tổng quan tháng này thế nào?"
    ];
  } else if (pathname.includes("/timetable")) {
    return [
      "Lịch làm việc hôm nay của tôi có gì?",
      "Quy tắc tạo bảng tự động là gì thế?",
      "Giúp tôi soạn báo cáo công việc cuối ngày của hôm nay"
    ];
  }

  // Default suggestions for dashboard or general pages
  return [
    "Tóm tắt công việc hôm nay của tôi?",
    "Chỉ số hiệu suất hiện tại của tôi?",
    "Có task nào khẩn cấp cần xử lý không?"
  ];
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [hasPulsed, setHasPulsed] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

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
    if (!pathname || isOpen) return;
    
    let pageName = "";
    if (pathname.includes("/like-share")) pageName = "Like-Share (Share bài Facebook)";
    else if (pathname.includes("/tasks")) pageName = "Quản lý công việc (Task Manager)";
    else if (pathname.includes("/reports")) pageName = "Báo cáo thống kê";
    else if (pathname.includes("/timetable")) pageName = "Lịch biểu (Timetable)";

    if (pageName) {
      setBubbleText(`Bạn có thắc mắc gì không? Tôi có thể giúp bạn về trang ${pageName}`);
      setShowBubble(true);
      const timer = setTimeout(() => setShowBubble(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [pathname, isOpen]);

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
          currentPath: pathname,
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
      <AnimatePresence>
        {!isOpen && showBubble && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="fixed bottom-20 sm:bottom-24 right-3 sm:right-6 z-30 max-w-[calc(100vw-5rem)] sm:max-w-[260px] bg-surface glass p-3.5 rounded-2xl shadow-xl border border-outline-variant/30 flex items-start gap-3 cursor-pointer"
            onClick={() => {
              setIsOpen(true);
              setShowBubble(false);
            }}
          >
            <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-on-primary" />
            </div>
            <div className="flex-1 mt-0.5">
              <p className="text-xs text-on-surface font-inter font-medium leading-relaxed">{bubbleText}</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowBubble(false);
              }}
              className="text-on-surface-variant hover:text-on-surface shrink-0 mt-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] sm:right-6 z-30 h-12 w-12 sm:h-[52px] sm:w-[52px] gradient-primary text-on-primary rounded-full flex items-center justify-center transition-all duration-150 hover:scale-105"
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
          className="fixed inset-x-3 bottom-[4.5rem] sm:inset-x-auto sm:bottom-[84px] sm:right-6 z-30 flex flex-col overflow-hidden glass shadow-[0_32px_64px_rgba(19,27,46,0.14)] dark:shadow-[0_32px_64px_rgba(0,0,0,0.4)] w-auto sm:w-[360px] max-h-[min(520px,calc(100vh-7rem))]"
          style={{
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
                  {getSuggestions(pathname).map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(suggestion)}
                      className="px-3 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs rounded-xl transition-all duration-150 text-left flex items-center justify-between group"
                    >
                      <span>{suggestion}</span>
                      <Send className="h-3 w-3 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
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
