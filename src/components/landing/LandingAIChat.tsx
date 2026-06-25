"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Bot, Send } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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

export function LandingAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBubble(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showBubble) return;
    const dismissTimer = setTimeout(() => {
      setShowBubble(false);
    }, 8000);
    return () => clearTimeout(dismissTimer);
  }, [showBubble]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory.map((m) => ({ role: m.role, content: m.content })),
          usePro: false,
          currentPath: "/",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Lỗi kết nối API (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Không thể khởi tạo luồng nhận dữ liệu.");

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
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].content === "") {
          updated.pop();
        }
        updated.push({
          role: "assistant",
          content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.",
          timestamp: new Date(),
        });
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
            className="fixed bottom-24 right-6 z-40 max-w-[280px] bg-white dark:bg-surface p-4 rounded-2xl shadow-xl border border-gray-200 dark:border-outline-variant/30 flex items-start gap-3 cursor-pointer"
            onClick={() => {
              setIsOpen(true);
              setShowBubble(false);
            }}
          >
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 mt-0.5">
              <p className="text-xs text-gray-800 dark:text-on-surface font-inter font-medium leading-relaxed">
                Bạn có thắc mắc gì không? Tôi có thể giúp bạn về sản phẩm và dịch vụ của SP Cybersoft.
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowBubble(false);
              }}
              className="text-gray-400 dark:text-on-surface-variant hover:text-gray-600 dark:hover:text-on-surface shrink-0 mt-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 h-[52px] w-[52px] bg-primary text-white rounded-full flex items-center justify-center transition-all duration-150 hover:scale-105 hover:shadow-lg shadow-xl"
        style={{ boxShadow: "0 8px 24px rgba(0, 80, 203, 0.35)" }}
        aria-label="Mở Trợ lý AI"
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-50 bg-primary"
              style={{ animationIterationCount: 1, animationDuration: "1.5s" }}
            />
          </>
        )}
      </button>

      {isOpen && (
        <div
          className="fixed bottom-[84px] right-6 z-40 flex flex-col overflow-hidden bg-white dark:bg-surface-container-highest shadow-[0_32px_64px_rgba(19,27,46,0.14)] dark:shadow-[0_32px_64px_rgba(0,0,0,0.4)]"
          style={{ width: "360px", maxHeight: "520px", borderRadius: "20px" }}
        >
          <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-gray-100 dark:border-outline-variant/20">
            <h3 className="font-manrope font-semibold text-base text-gray-900 dark:text-on-surface">
              Trợ lý AI
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 rounded-full flex items-center justify-center text-gray-400 dark:text-on-surface-variant hover:bg-gray-100 dark:hover:bg-surface-container-low transition-all duration-150"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-3">
                <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center opacity-90">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-on-surface font-manrope">
                    Tôi có thể giúp gì cho bạn?
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-on-surface-variant mt-1 max-w-[240px] font-inter">
                    Đặt câu hỏi về sản phẩm, dịch vụ hoặc giải pháp công nghệ của SP Cybersoft.
                  </p>
                </div>
                <div className="mt-2 flex flex-col gap-2 w-full max-w-[260px]">
                  {[
                    "SP Cybersoft cung cấp những dịch vụ gì?",
                    "Làm thế nào để bắt đầu một dự án?",
                    "Bảng giá dịch vụ như thế nào?",
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(suggestion)}
                      className="px-3 py-2.5 bg-gray-50 dark:bg-surface-container-low hover:bg-gray-100 dark:hover:bg-surface-container text-gray-800 dark:text-on-surface text-xs rounded-xl transition-all duration-150 text-left flex items-center justify-between group"
                    >
                      <span>{suggestion}</span>
                      <Send className="h-3 w-3 text-gray-400 dark:text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
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
                          ? "bg-primary text-white"
                          : "bg-gray-100 dark:bg-surface-container-low text-gray-800 dark:text-on-surface"
                      }`}
                      style={{
                        borderRadius:
                          msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      }}
                    >
                      {msg.content === "" && isLoading && index === messages.length - 1 ? (
                        <div className="flex items-center gap-1.5 px-1 py-0.5">
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              className="h-2 w-2 rounded-full bg-gray-400 dark:bg-primary/80"
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
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                  <p
                    className={`font-inter text-[10px] text-gray-400 dark:text-on-surface-variant mt-0.5 ${
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

          <div className="px-3 pb-3 pt-1 shrink-0">
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 bg-gray-50 dark:bg-surface-container rounded-xl px-3 py-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder="Nhập tin nhắn..."
                className="flex-1 bg-transparent text-xs text-gray-900 dark:text-on-surface placeholder-gray-400 dark:placeholder-on-surface-variant/60 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-inter"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
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
