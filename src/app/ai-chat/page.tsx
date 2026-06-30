"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import {
  Sparkles,
  Bot,
  Send,
  Trash2,
  Plus,
  PanelLeft,
  Code,
  Eye,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Terminal,
  Cpu,
  Square,
  MessageSquare,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/user-avatar";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
  model: "flash" | "pro";
}

interface Artifact {
  title: string;
  language: string;
  code: string;
}

interface Suggestion {
  title: string;
  desc: string;
  prompt: string;
  icon: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SUGGESTIONS: Suggestion[] = [
  {
    title: "Đánh giá hiệu suất tháng này",
    desc: "Báo cáo task hoàn thành, quá hạn và phân tích hiệu năng.",
    prompt: "Hãy giúp tôi đánh giá hiệu suất làm việc của tháng này.",
    icon: "📊",
  },
  {
    title: "Việc khẩn cấp hôm nay",
    desc: "Quét task quá hạn hoặc deadline trong 24h.",
    prompt: "Hôm nay tôi có những task nào khẩn cấp cần xử lý?",
    icon: "🔥",
  },
  {
    title: "Soạn báo cáo công việc",
    desc: "Lấy các task DONE trong ngày để soạn báo cáo.",
    prompt: "Giúp tôi soạn báo cáo công việc cuối ngày hôm nay.",
    icon: "📝",
  },
  {
    title: "Quản lý quá tải",
    desc: "Gợi ý ưu tiên và dời lịch task không khẩn cấp.",
    prompt: "Tôi đang cảm thấy quá tải và stress với đống task này, hãy giúp tôi.",
    icon: "🧘",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

function extractArtifacts(text: string): Artifact[] {
  const regex = /```(\w*)\n([\s\S]*?)(?:```|$)/g;
  const artifacts: Artifact[] = [];
  let match;
  let index = 1;
  while ((match = regex.exec(text)) !== null) {
    const language = match[1] || "text";
    const code = match[2].trim();
    if (code.length > 5) {
      artifacts.push({
        title: `Snippet ${index} (${language.toUpperCase()})`,
        language,
        code,
      });
      index++;
    }
  }
  return artifacts;
}

function formatSessionTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function TypingIndicator({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) {
    return <span className="text-xs text-[var(--ai-text-secondary)]">Đang suy nghĩ…</span>;
  }
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-[var(--ai-accent)]"
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1.1, 0.85] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              delay: i * 0.18,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <span className="font-inter text-xs text-[var(--ai-text-secondary)]">Đang suy nghĩ…</span>
    </div>
  );
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0 font-inter">{children}</p>,
  ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1 font-inter">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1 font-inter">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-[var(--ai-accent)] hover:underline"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code
          className={cn(
            "my-2 block overflow-x-auto rounded-xl bg-[var(--ai-bg-elevated)] px-3 py-2.5 font-mono text-[12px] text-[var(--ai-text)]",
            className
          )}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded-md bg-[var(--ai-accent-subtle)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--ai-accent)]"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-hidden rounded-xl border border-[var(--ai-border)] bg-[var(--ai-bg-elevated)]">
      {children}
    </pre>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[var(--ai-text)]">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-[var(--ai-accent)] pl-3 italic text-[var(--ai-text-secondary)]">
      {children}
    </blockquote>
  ),
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AIChatPage() {
  const { data: session } = useSession();
  const reducedMotion = useReducedMotion();
  const userName = session?.user?.name?.split(" ")[0] || "bạn";
  const userEmail = session?.user?.email || "";
  const userAvatar = (session?.user as { image?: string })?.image;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usePro, setUsePro] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeArtifactTab, setActiveArtifactTab] = useState<"code" | "preview">("code");
  const [selectedArtifactIndex, setSelectedArtifactIndex] = useState(0);
  const [isArtifactPanelExpanded, setIsArtifactPanelExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const saveSessions = useCallback((updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    localStorage.setItem("sp_ai_chat_sessions", JSON.stringify(updatedSessions));
  }, []);

  const startNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: generateId(),
      title: "Cuộc trò chuyện mới",
      messages: [],
      updatedAt: new Date().toISOString(),
      model: usePro ? "pro" : "flash",
    };
    setSessions((prev) => {
      const updated = [newSession, ...prev];
      localStorage.setItem("sp_ai_chat_sessions", JSON.stringify(updated));
      return updated;
    });
    setCurrentSessionId(newSession.id);
    setInput("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [usePro]);

  useEffect(() => {
    const saved = localStorage.getItem("sp_ai_chat_sessions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setCurrentSessionId(parsed[0].id);
          setUsePro(parsed[0].model === "pro");
          return;
        }
      } catch (e) {
        console.error("Lỗi khi load chat history:", e);
      }
    }
    startNewSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsSidebarOpen(!mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsSidebarOpen(!e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const currentSession = useMemo(
    () => sessions.find((s) => s.id === currentSessionId) || null,
    [sessions, currentSessionId]
  );

  const activeMessages = useMemo(() => currentSession?.messages || [], [currentSession]);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, searchQuery]);

  const currentArtifacts = useMemo(() => {
    for (let i = activeMessages.length - 1; i >= 0; i--) {
      const msg = activeMessages[i];
      if (msg.role === "assistant") {
        const extracted = extractArtifacts(msg.content);
        if (extracted.length > 0) return extracted;
      }
    }
    return [];
  }, [activeMessages]);

  const activeArtifact = useMemo(() => {
    if (currentArtifacts.length === 0) return null;
    return currentArtifacts[selectedArtifactIndex] || currentArtifacts[0];
  }, [currentArtifacts, selectedArtifactIndex]);

  useEffect(() => {
    setSelectedArtifactIndex(0);
  }, [currentArtifacts.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [activeMessages, reducedMotion]);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 100);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  }, [input]);

  const handleSend = async (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const messageText = (overrideInput ?? input).trim();
    if (!messageText || isLoading || !currentSessionId) return;

    const userMsg: Message = {
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...activeMessages, userMsg];

    let updatedTitle = currentSession?.title || "Cuộc trò chuyện";
    if (activeMessages.length === 0) {
      updatedTitle = messageText.substring(0, 32) + (messageText.length > 32 ? "…" : "");
    }

    const updatedSession: ChatSession = {
      ...currentSession!,
      title: updatedTitle,
      messages: [
        ...updatedMessages,
        { role: "assistant", content: "", timestamp: new Date().toISOString() },
      ],
      updatedAt: new Date().toISOString(),
      model: usePro ? "pro" : "flash",
    };

    saveSessions(sessions.map((s) => (s.id === currentSessionId ? updatedSession : s)));
    setInput("");
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          usePro,
          currentPath: "/ai-chat",
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Lỗi API (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Không thể đọc luồng dữ liệu từ server.");

      const decoder = new TextDecoder();
      let assistantResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantResponse += decoder.decode(value, { stream: true });

        setSessions((prevSessions) =>
          prevSessions.map((s) => {
            if (s.id === currentSessionId) {
              const msgs = [...s.messages];
              if (msgs.length > 0) {
                msgs[msgs.length - 1] = {
                  role: "assistant",
                  content: assistantResponse,
                  timestamp: new Date().toISOString(),
                };
              }
              return { ...s, messages: msgs };
            }
            return s;
          })
        );
      }

      const finalSessions = localStorage.getItem("sp_ai_chat_sessions");
      if (finalSessions) {
        const parsed = JSON.parse(finalSessions);
        const updated = parsed.map((s: ChatSession) => {
          if (s.id === currentSessionId) {
            const msgs = [...s.messages];
            if (msgs.length > 0) {
              msgs[msgs.length - 1] = {
                role: "assistant",
                content: assistantResponse,
                timestamp: new Date().toISOString(),
              };
            }
            return { ...s, messages: msgs };
          }
          return s;
        });
        localStorage.setItem("sp_ai_chat_sessions", JSON.stringify(updated));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        toast.info("Đã dừng tạo phản hồi.");
        return;
      }
      const message = err instanceof Error ? err.message : "Vui lòng thử lại sau.";
      toast.error(message || "Không thể tải phản hồi từ AI.");
      setSessions((prevSessions) =>
        prevSessions.map((s) => {
          if (s.id === currentSessionId) {
            const msgs = [...s.messages];
            if (msgs.length > 0 && msgs[msgs.length - 1].content === "") {
              msgs.pop();
            }
            msgs.push({
              role: "assistant",
              content: `⚠️ **Đã xảy ra lỗi:** ${message}`,
              timestamp: new Date().toISOString(),
            });
            return { ...s, messages: msgs };
          }
          return s;
        })
      );
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => abortControllerRef.current?.abort();

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Xóa cuộc trò chuyện này? Hành động không thể hoàn tác.")) return;
    const updated = sessions.filter((s) => s.id !== id);
    saveSessions(updated);
    if (currentSessionId === id) {
      if (updated.length > 0) {
        setCurrentSessionId(updated[0].id);
        setUsePro(updated[0].model === "pro");
      } else {
        startNewSession();
      }
    }
    toast.success("Đã xóa cuộc trò chuyện.");
  };

  const copyArtifactCode = () => {
    if (!activeArtifact) return;
    navigator.clipboard.writeText(activeArtifact.code);
    toast.success("Đã copy code!");
    setCopiedIndex(selectedArtifactIndex);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageIndex(index);
    toast.success("Đã copy tin nhắn!");
    setTimeout(() => setCopiedMessageIndex(null), 2000);
  };

  const selectSession = (s: ChatSession) => {
    setCurrentSessionId(s.id);
    setUsePro(s.model === "pro");
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  };

  const fadeProps = reducedMotion
    ? { initial: false as const, animate: { opacity: 1 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22 } };

  return (
    <div className="ai-chat-root flex h-full w-full overflow-hidden bg-[var(--ai-bg-base)] font-inter text-[var(--ai-text)]">

      {/* Mobile backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-20 bg-black/50 backdrop-blur-[2px] md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── LEFT SIDEBAR 260px ── */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: reducedMotion ? 0 : -260, opacity: reducedMotion ? 1 : 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reducedMotion ? 0 : -260, opacity: reducedMotion ? 1 : 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: "easeInOut" }}
            className={cn(
              "z-30 flex h-full w-[260px] flex-shrink-0 flex-col border-r border-[var(--ai-border)] bg-[var(--ai-bg-surface)]",
              "fixed inset-y-0 left-0 md:relative"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4">
              <h2 className="font-manrope text-sm font-bold tracking-tight text-[var(--ai-text)]">
                AI Chat
              </h2>
              <button
                onClick={startNewSession}
                className="flex items-center gap-1 rounded-full bg-[var(--ai-accent)] px-3 py-1.5 font-manrope text-[11px] font-semibold text-on-primary transition-opacity hover:opacity-90 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Mới
              </button>
            </div>

            {/* Search */}
            <div className="px-3 pb-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ai-text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm cuộc trò chuyện…"
                  className="w-full rounded-xl border border-[var(--ai-border)] bg-[var(--ai-bg-elevated)] py-2 pl-9 pr-8 font-inter text-xs text-[var(--ai-text)] outline-none placeholder:text-[var(--ai-text-muted)] focus:border-[var(--ai-accent)] focus:ring-1 focus:ring-[var(--ai-accent)]/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-[var(--ai-text-muted)] hover:text-[var(--ai-text)] cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* History list */}
            <div className="ai-chat-scroll flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
              {filteredSessions.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <MessageSquare className="mx-auto mb-2 h-7 w-7 text-[var(--ai-text-muted)]" />
                  <p className="font-inter text-xs text-[var(--ai-text-secondary)]">
                    {searchQuery ? "Không tìm thấy kết quả" : "Chưa có cuộc trò chuyện"}
                  </p>
                </div>
              ) : (
                filteredSessions.map((s) => {
                  const isActive = s.id === currentSessionId;
                  return (
                    <div
                      key={s.id}
                      onClick={() => selectSession(s)}
                      className={cn(
                        "group flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors",
                        isActive
                          ? "border-l-2 border-[var(--ai-accent)] bg-[var(--ai-bg-elevated)] pl-[10px]"
                          : "border-l-2 border-transparent hover:bg-[var(--ai-bg-elevated)]"
                      )}
                    >
                      <MessageSquare
                        className={cn(
                          "h-3.5 w-3.5 flex-shrink-0",
                          isActive ? "text-[var(--ai-accent)]" : "text-[var(--ai-text-muted)]"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-inter text-xs",
                            isActive ? "font-medium text-[var(--ai-text)]" : "text-[var(--ai-text-secondary)]"
                          )}
                        >
                          {s.title}
                        </p>
                        <p className="mt-0.5 font-inter text-[10px] text-[var(--ai-text-muted)]">
                          {formatSessionTime(s.updatedAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteSession(s.id, e)}
                        className="flex-shrink-0 rounded-lg p-1 text-[var(--ai-text-muted)] opacity-0 transition-all hover:bg-error-bg hover:text-error-text group-hover:opacity-100 cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* User profile */}
            <div className="flex items-center gap-3 border-t border-[var(--ai-border)] px-4 py-3">
              <UserAvatar name={session?.user?.name} src={userAvatar} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-manrope text-xs font-semibold text-[var(--ai-text)]">
                  {session?.user?.name || "Thành viên"}
                </p>
                {userEmail && (
                  <p className="truncate font-inter text-[10px] text-[var(--ai-text-muted)]">
                    {userEmail}
                  </p>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── MAIN CHAT ── */}
      <div className="relative flex h-full min-w-0 flex-1 flex-col bg-[var(--ai-bg-base)]">

        {/* Top bar */}
        <header className="z-20 flex h-14 flex-shrink-0 items-center justify-between border-b border-[var(--ai-border)] bg-[var(--ai-bg-surface)]/90 px-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="rounded-xl p-2 text-[var(--ai-text-secondary)] transition-colors hover:bg-[var(--ai-bg-elevated)] hover:text-[var(--ai-text)] md:hidden cursor-pointer"
              aria-label="Mở menu"
            >
              <PanelLeft className="h-5 w-5" />
            </button>

            <div className="relative flex h-9 w-9 items-center justify-center">
              <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-full shadow-card">
                <Bot className="h-4 w-4 text-on-primary" />
              </div>
              <span className="ai-chat-pulse-dot absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--ai-bg-surface)] bg-[var(--ai-success)] animate-pulse" />
            </div>

            <div>
              <h1 className="font-manrope text-sm font-bold text-[var(--ai-text)]">TaskMaster AI</h1>
              <p className="flex items-center gap-1 font-inter text-[10px] font-medium text-[var(--ai-success)]">
                Sẵn sàng hỗ trợ
              </p>
            </div>
          </div>

          <button
            onClick={startNewSession}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-manrope text-xs font-medium text-[var(--ai-text-secondary)] transition-colors hover:bg-[var(--ai-bg-elevated)] hover:text-[var(--ai-text)] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Chat mới</span>
          </button>
        </header>

        {/* Message thread */}
        <div
          ref={chatContainerRef}
          className="ai-chat-scroll relative flex-1 overflow-y-auto px-4 py-6 md:px-8"
        >
          {activeMessages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-8 text-center select-none">
              <motion.div {...fadeProps} className="space-y-4">
                <div className="gradient-primary mx-auto flex h-14 w-14 items-center justify-center rounded-2xl shadow-float">
                  <Sparkles className="h-7 w-7 text-on-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-manrope text-xl font-extrabold text-[var(--ai-text)]">
                    Xin chào, {userName}!
                  </h3>
                  <p className="mx-auto max-w-md font-inter text-sm leading-relaxed text-[var(--ai-text-secondary)]">
                    Trợ lý AI nội bộ SPS — quản lý task, phân tích hiệu suất và soạn báo cáo.
                    Chọn gợi ý hoặc nhập câu hỏi.
                  </p>
                </div>
              </motion.div>

              <motion.div
                {...(reducedMotion
                  ? { initial: false as const, animate: { opacity: 1 } }
                  : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.08 } })}
                className="mt-8 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2"
              >
                {SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(undefined, item.prompt)}
                    disabled={isLoading}
                    className="group flex gap-3 rounded-2xl border border-[var(--ai-border)] bg-[var(--ai-bg-surface)] p-4 text-left transition-all hover:border-[var(--ai-accent)]/40 hover:bg-[var(--ai-bg-elevated)] disabled:opacity-50 cursor-pointer"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-manrope text-xs font-bold text-[var(--ai-text)] group-hover:text-[var(--ai-accent)]">
                        {item.title}
                      </h4>
                      <p className="mt-1 font-inter text-[11px] leading-relaxed text-[var(--ai-text-muted)]">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </motion.div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {activeMessages.map((msg, index) => {
                const isUser = msg.role === "user";
                const isStreaming =
                  msg.content === "" && isLoading && index === activeMessages.length - 1;

                return (
                  <div
                    key={index}
                    className={cn(
                      "group flex items-start gap-3",
                      isUser ? "flex-row-reverse" : "flex-row",
                      !reducedMotion && "ai-chat-fade-in"
                    )}
                  >
                    {/* Avatar */}
                    {isUser ? (
                      <UserAvatar name={session?.user?.name} src={userAvatar} size="sm" className="mt-0.5" />
                    ) : (
                      <div className="gradient-primary mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full">
                        <Bot className="h-3.5 w-3.5 text-on-primary" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "flex max-w-[82%] flex-col gap-1",
                        isUser ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "relative rounded-2xl px-4 py-3 font-inter text-[13px] leading-relaxed",
                          isUser
                            ? "bg-[var(--ai-bubble-user)] text-on-primary"
                            : "ai-chat-glass-bubble text-[var(--ai-text)]"
                        )}
                      >
                        {isStreaming ? (
                          <TypingIndicator reducedMotion={!!reducedMotion} />
                        ) : (
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}

                        {!isUser && !isStreaming && msg.content && (
                          <button
                            onClick={() => copyMessage(msg.content, index)}
                            className="absolute -bottom-2 right-2 rounded-lg border border-[var(--ai-border)] bg-[var(--ai-bg-surface)] p-1 text-[var(--ai-text-muted)] opacity-0 shadow-card transition-all hover:text-[var(--ai-text)] group-hover:opacity-100 cursor-pointer"
                            title="Copy tin nhắn"
                          >
                            {copiedMessageIndex === index ? (
                              <Check className="h-3 w-3 text-[var(--ai-success)]" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>

                      <span className="px-1 font-inter text-[10px] text-[var(--ai-text-muted)]">
                        {new Date(msg.timestamp).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          <AnimatePresence>
            {showScrollBtn && activeMessages.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: reducedMotion ? 0 : 0.15 }}
                onClick={scrollToBottom}
                className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[var(--ai-border)] bg-[var(--ai-bg-surface)] px-3 py-1.5 font-inter text-xs text-[var(--ai-text-secondary)] shadow-float transition-colors hover:text-[var(--ai-text)] cursor-pointer"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                Xuống dưới
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Sticky input */}
        <div className="z-20 shrink-0 border-t border-[var(--ai-border)] bg-[var(--ai-bg-surface)] p-4 md:px-6 md:py-4">
          <div className="mx-auto max-w-3xl">
            <form
              onSubmit={handleSend}
              className="ai-chat-input-glow rounded-2xl border border-[var(--ai-border)] bg-[var(--ai-bg-elevated)] p-3 transition-all"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Hỏi về task, hiệu suất, báo cáo..."
                rows={1}
                className="max-h-32 min-h-[24px] w-full resize-none overflow-y-auto border-none bg-transparent py-1 font-inter text-[13px] text-[var(--ai-text)] outline-none placeholder:text-[var(--ai-text-muted)] focus:ring-0"
              />

              <div className="mt-2 flex items-center justify-between border-t border-[var(--ai-border)] pt-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Model pills */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setUsePro(false);
                        if (currentSession)
                          saveSessions(
                            sessions.map((s) =>
                              s.id === currentSessionId ? { ...s, model: "flash" } : s
                            )
                          );
                      }}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2.5 py-1 font-manrope text-[10px] font-bold transition-all cursor-pointer",
                        !usePro
                          ? "bg-[var(--ai-accent-subtle)] text-[var(--ai-accent)]"
                          : "bg-[var(--ai-bg-surface)] text-[var(--ai-text-muted)] hover:text-[var(--ai-text-secondary)]"
                      )}
                    >
                      <Cpu className="h-3 w-3" />
                      Flash
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUsePro(true);
                        if (currentSession)
                          saveSessions(
                            sessions.map((s) =>
                              s.id === currentSessionId ? { ...s, model: "pro" } : s
                            )
                          );
                      }}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2.5 py-1 font-manrope text-[10px] font-bold transition-all cursor-pointer",
                        usePro
                          ? "bg-[var(--ai-bg-elevated)] text-[var(--ai-text)] ring-1 ring-[var(--ai-border)]"
                          : "bg-[var(--ai-bg-surface)] text-[var(--ai-text-muted)] hover:text-[var(--ai-text-secondary)]"
                      )}
                    >
                      <Sparkles className="h-3 w-3" />
                      Pro
                    </button>
                  </div>

                  <span className="hidden font-inter text-[10px] text-[var(--ai-text-muted)] sm:inline">
                    Enter gửi · Shift+Enter xuống dòng
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {currentArtifacts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsArtifactPanelExpanded(true)}
                      className="flex items-center gap-1 rounded-xl border border-[var(--ai-border)] px-2.5 py-1.5 font-manrope text-[11px] font-semibold text-[var(--ai-accent)] transition-colors hover:bg-[var(--ai-accent-subtle)] cursor-pointer"
                    >
                      <Code className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Code</span>({currentArtifacts.length})
                    </button>
                  )}

                  {isLoading ? (
                    <button
                      type="button"
                      onClick={handleStop}
                      className="flex h-9 items-center gap-1.5 rounded-xl border border-[var(--ai-border)] bg-[var(--ai-bg-surface)] px-3 font-manrope text-xs font-semibold text-[var(--ai-text)] transition-colors hover:bg-[var(--ai-bg-elevated)] cursor-pointer"
                    >
                      <Square className="h-3 w-3 fill-current" />
                      Dừng
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className={cn(
                        "flex h-9 items-center gap-1.5 rounded-xl px-4 font-manrope text-xs font-bold transition-all cursor-pointer",
                        !input.trim()
                          ? "bg-[var(--ai-bg-surface)] text-[var(--ai-text-muted)] cursor-not-allowed"
                          : "gradient-primary text-on-primary shadow-card hover:opacity-90"
                      )}
                    >
                      Gửi
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Artifacts panel */}
      <AnimatePresence>
        {isArtifactPanelExpanded && activeArtifact && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setIsArtifactPanelExpanded(false)}
            />
            <motion.aside
              initial={{ x: reducedMotion ? 0 : "100%", opacity: reducedMotion ? 1 : 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reducedMotion ? 0 : "100%", opacity: reducedMotion ? 1 : 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.24, ease: "easeInOut" }}
              className={cn(
                "z-50 flex h-full w-full flex-shrink-0 flex-col border-l border-[var(--ai-border)] bg-[var(--ai-bg-surface)] shadow-float",
                "fixed inset-y-0 right-0 md:relative md:w-[min(520px,42vw)]"
              )}
            >
              <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[var(--ai-border)] px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <Terminal className="h-4 w-4 text-[var(--ai-accent)]" />
                  <h3 className="truncate font-manrope text-xs font-bold uppercase tracking-wider text-[var(--ai-text)]">
                    Code Artifacts
                  </h3>
                </div>
                <button
                  onClick={() => setIsArtifactPanelExpanded(false)}
                  className="rounded-xl p-2 text-[var(--ai-text-secondary)] transition-colors hover:bg-[var(--ai-bg-elevated)] hover:text-[var(--ai-text)] cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {currentArtifacts.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--ai-border)] p-2 no-scrollbar">
                  {currentArtifacts.map((art, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedArtifactIndex(idx)}
                      className={cn(
                        "whitespace-nowrap rounded-lg border px-3 py-1.5 font-manrope text-[10px] font-semibold transition-all cursor-pointer",
                        selectedArtifactIndex === idx
                          ? "border-[var(--ai-accent)]/40 bg-[var(--ai-accent-subtle)] text-[var(--ai-accent)]"
                          : "border-[var(--ai-border)] text-[var(--ai-text-muted)] hover:text-[var(--ai-text)]"
                      )}
                    >
                      {art.title}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--ai-border)] px-4 py-2">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setActiveArtifactTab("code")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-manrope text-xs font-bold transition-all cursor-pointer",
                        activeArtifactTab === "code"
                          ? "bg-[var(--ai-bg-elevated)] text-[var(--ai-text)]"
                          : "text-[var(--ai-text-muted)] hover:text-[var(--ai-text)]"
                      )}
                    >
                      <Code className="h-3.5 w-3.5" />
                      Mã nguồn
                    </button>
                    {["html", "svg", "xml"].includes(activeArtifact.language.toLowerCase()) && (
                      <button
                        onClick={() => setActiveArtifactTab("preview")}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-manrope text-xs font-bold transition-all cursor-pointer",
                          activeArtifactTab === "preview"
                            ? "bg-[var(--ai-bg-elevated)] text-[var(--ai-text)]"
                            : "text-[var(--ai-text-muted)] hover:text-[var(--ai-text)]"
                        )}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Xem thử
                      </button>
                    )}
                  </div>
                  <button
                    onClick={copyArtifactCode}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--ai-border)] px-3 py-1.5 font-manrope text-[10px] font-bold text-[var(--ai-text-secondary)] transition-colors hover:text-[var(--ai-text)] cursor-pointer"
                  >
                    {copiedIndex === selectedArtifactIndex ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[var(--ai-success)]" />
                        Đã copy!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                <div className="ai-chat-scroll flex-1 overflow-auto p-4">
                  {activeArtifactTab === "code" ? (
                    <div className="relative overflow-x-auto whitespace-pre rounded-2xl border border-[var(--ai-border)] bg-[var(--ai-bg-base)] p-5 font-mono text-[12px] leading-relaxed text-[var(--ai-text)]">
                      <div className="absolute right-3 top-2.5 select-none font-manrope text-[9px] font-bold uppercase tracking-wider text-[var(--ai-text-muted)]">
                        {activeArtifact.language}
                      </div>
                      <code>{activeArtifact.code}</code>
                    </div>
                  ) : (
                    <div className="h-full min-h-[350px] overflow-hidden rounded-2xl border border-[var(--ai-border)] bg-[var(--ai-bg-base)]">
                      <iframe
                        title="Artifact Live Preview"
                        srcDoc={activeArtifact.code}
                        className="h-full w-full border-none"
                        sandbox="allow-scripts"
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
