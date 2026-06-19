"use client";

import React from "react";
import { Search, Sparkles, Plus } from "lucide-react";
import { useTaskStore } from "@/store/useTaskStore";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

export function Header() {
  const { data: session } = useSession();
  const {
    currentWorkspace,
    workspaces,
    isAIChatOpen,
    toggleAIChat,
    setAddTaskModalOpen,
  } = useTaskStore();

  // Fallback workspace
  const activeWorkspace = currentWorkspace || workspaces[0] || {
    id: "ws-1",
    name: "Dự án SPS",
    icon: "🚀",
    color: "#0050cb",
  };

  const userName = session?.user?.name || "Thành viên";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-[52px] flex items-center justify-between px-6 flex-shrink-0 bg-white/80 backdrop-blur-[20px] z-10">
      {/* Left: breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[12px] text-on-muted">
        <span>myTaskManager</span>
        <span className="text-outline">/</span>
        <span className="text-primary font-semibold">{activeWorkspace.name}</span>
      </nav>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        
        {/* Search */}
        <div className="flex items-center gap-2 bg-surface-mid rounded-xl px-3 h-8 text-[12px] text-on-muted w-48">
          <Search size={13} className="flex-shrink-0" />
          <input 
            placeholder="Tìm kiếm..." 
            className="bg-transparent outline-none w-full text-on-surface placeholder:text-on-muted" 
          />
        </div>

        {/* AI Chat toggle */}
        <button 
          onClick={toggleAIChat}
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer",
            isAIChatOpen 
              ? "bg-primary-container text-primary" 
              : "bg-surface-mid text-on-muted hover:bg-surface-high"
          )}
        >
          <Sparkles size={15} />
        </button>

        {/* Quick Add */}
        <button 
          onClick={() => setAddTaskModalOpen(true)}
          className="flex items-center gap-1.5 bg-gradient-to-r from-primary to-primary-end text-white text-[12px] font-semibold rounded-xl px-3 h-8 cursor-pointer transition-opacity hover:opacity-90"
        >
          <Plus size={14} /> Thêm task
        </button>

        {/* Avatar */}
        <button className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-[11px] font-bold text-primary select-none">
          {initials}
        </button>
      </div>
    </header>
  );
}
