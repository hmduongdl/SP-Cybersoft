"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTaskStore } from "@/store/useTaskStore";
import { X, Send, Sparkles, Loader2, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx } from "clsx";

interface Message {
  role: "user" | "ai";
  content: string;
}

export function AIChatSidebar() {
  const { isAIChatOpen, setAIChatOpen, setSelectedTaskId, currentWorkspaceId } = useTaskStore();
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Chào bạn! Mình là trợ lý AI. Mình có thể giúp gì cho bạn với các công việc trong Workspace này?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Create a placeholder for the AI response
      setMessages((prev) => [...prev, { role: "ai", content: "" }]);

      const res = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          workspaceId: currentWorkspaceId,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              aiContent += data.content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = aiContent;
                return newMessages;
              });
            } catch (e) {
              console.error("Error parsing stream chunk", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = "Đã có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại.";
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isAIChatOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-16 right-0 w-[360px] h-[calc(100vh-64px)] bg-surface-mid shadow-float flex flex-col z-30"
        >
          {/* Header */}
          <div className="h-16 px-5 flex items-center justify-between bg-surface-mid shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-manrope font-bold text-on-surface text-sm">AI Assistant</h3>
                <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setAIChatOpen(false)}
              className="p-2 hover:bg-surface-low rounded-xl transition-colors duration-150 text-on-muted hover:text-on-surface"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-surface-low/30">
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              // Tiền xử lý: [task:ID] -> [Task ID](#task:ID)
              const processedContent = msg.content.replace(/\[task:([a-zA-Z0-9-]+)\]/g, ' [Task $1](#task:$1) ');

              return (
                <div key={idx} className={clsx("flex gap-3 max-w-[90%]", isUser ? "self-end flex-row-reverse" : "self-start")}>
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={clsx(
                      "p-3 rounded-2xl text-[13px] leading-relaxed",
                      isUser
                        ? "bg-primary text-white rounded-tr-sm shadow-card"
                        : "bg-surface-mid text-on-surface rounded-tl-sm shadow-card"
                    )}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="prose prose-sm prose-slate max-w-none prose-p:my-1 prose-ul:my-1 prose-a:no-underline">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => {
                              if (href?.startsWith("#task:")) {
                                const taskId = href.replace("#task:", "");
                                return (
                                  <span
                                    onClick={() => setSelectedTaskId(taskId)}
                                    className="inline-flex items-center gap-1 bg-primary-container/20 text-primary px-1.5 py-0.5 rounded-md font-semibold cursor-pointer hover:bg-primary-container/40 transition-colors duration-150 mx-1"
                                    title={`Click để mở chi tiết task: ${taskId}`}
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    {children}
                                  </span>
                                );
                              }
                              return <a href={href} className="text-primary hover:underline">{children}</a>;
                            },
                          }}
                        >
                          {processedContent || (isLoading && idx === messages.length - 1 ? "..." : "")}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-surface-mid shrink-0">
            <div className="relative flex items-center">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi AI về công việc..."
                className="w-full bg-surface-low border-0 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-150 resize-none max-h-32 min-h-[44px]"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 bottom-1.5 w-8 h-8 flex items-center justify-center bg-primary text-white rounded-xl hover:bg-primary-end disabled:opacity-50 disabled:hover:bg-primary transition-all duration-150 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
