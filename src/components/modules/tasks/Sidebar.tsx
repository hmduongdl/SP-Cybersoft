"use client";

import React, { useState } from "react";
import { useTaskStore, Workspace, Tag, FilterStatus } from "@/store/useTaskStore";
import { useSession, signOut } from "next-auth/react";
import { ChevronDown, LogOut, CalendarDays, CheckSquare, Plus, Clock, Inbox, Tag as TagIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { data: session } = useSession();
  const {
    workspaces,
    currentWorkspace,
    tags,
    filterStatus,
    setFilter,
    setCurrentWorkspace,
  } = useTaskStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fallbacks in case workspaces are still loading or empty in store
  const activeWorkspace = currentWorkspace || workspaces[0] || {
    id: "ws-1",
    name: "Dự án SPS",
    icon: "🚀",
    color: "#0050cb",
  };

  const displayWorkspaces = workspaces.length > 0 ? workspaces : [activeWorkspace];

  const userName = session?.user?.name || "Thành viên";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const logout = () => signOut({ callbackUrl: "/login" });

  const filterItems = [
    { id: "all", label: "Tất cả", icon: CheckSquare },
    { id: "today", label: "Hôm nay", icon: Clock },
    { id: "upcoming", label: "Sắp tới", icon: CalendarDays },
  ];

  return (
    <aside className="w-[220px] shrink-0 bg-surface-low flex flex-col py-0 overflow-y-auto h-full relative z-20">
      
      {/* Workspace Selector (Top) */}
      <div className="px-3 py-4 border-b-0 relative">
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-surface-mid transition-colors cursor-pointer"
        >
          {/* Workspace icon/color badge */}
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
            style={{ 
              background: `${activeWorkspace.color}20` || "#0050cb20", 
              color: activeWorkspace.color || "#0050cb" 
            }}
          >
            {activeWorkspace.icon || "🚀"}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-semibold text-on-surface truncate">
              {activeWorkspace.name || "Dự án SPS"}
            </p>
            <p className="text-[10px] text-on-muted">Workspace</p>
          </div>
          <ChevronDown size={14} className="text-on-muted flex-shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute left-3 right-3 top-[72px] mt-1 bg-white border border-outline-variant/30 rounded-2xl shadow-float z-50 p-1.5 space-y-1">
            <p className="text-[9px] font-semibold tracking-wider text-on-muted px-2 py-1 uppercase">
              Chuyển Workspace
            </p>
            <div className="max-h-[200px] overflow-y-auto">
              {displayWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setCurrentWorkspace(ws);
                    setIsDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-xl text-xs transition-colors cursor-pointer text-left",
                    ws.id === activeWorkspace.id
                      ? "bg-surface-low text-primary font-medium"
                      : "text-on-muted hover:bg-surface-low"
                  )}
                >
                  <span className="text-sm mr-1.5">{ws.icon || "📁"}</span>
                  <span className="truncate flex-1">{ws.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation (Middle) */}
      <div className="flex-1 px-3 py-2 space-y-6">
        
        {/* CHUNG Section */}
        <div>
          <p className="text-[10px] font-semibold tracking-[.08em] uppercase text-on-muted px-3 mb-1 mt-5 first:mt-0">
            CHUNG
          </p>
          <div className="space-y-0.5">
            {filterItems.map((item) => {
              const active = filterStatus === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setFilter(item.id as FilterStatus)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-colors duration-150 cursor-pointer",
                    active
                      ? "bg-surface-high text-primary font-semibold"
                      : "text-on-muted hover:bg-surface-mid"
                  )}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* THẺ TAG Section */}
        <div>
          <p className="text-[10px] font-semibold tracking-[.08em] uppercase text-on-muted px-3 mb-1 mt-5 first:mt-0">
            THẺ TAG
          </p>
          <div className="space-y-0.5">
            {tags.map((tag) => (
              <button
                key={tag.id}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-on-muted hover:bg-surface-mid transition-colors cursor-pointer text-left"
              >
                {/* Color dot — use tag.color */}
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: tag.color || "#6b7280" }} 
                />
                <span className="truncate">{tag.name}</span>
              </button>
            ))}

            {/* Tạo tag button */}
            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-primary/80 hover:text-primary hover:bg-surface-mid transition-colors cursor-pointer text-left mt-2">
              <Plus size={14} />
              <span>Tạo thẻ mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* User Block & Logout (Bottom) */}
      <div className="mt-auto p-3 border-t-0">
        <div className="bg-surface-mid rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center text-[11px] font-bold text-primary flex-shrink-0 select-none">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-on-surface truncate">
              {userName}
            </p>
          </div>
          <button 
            onClick={logout} 
            title="Đăng xuất"
            className="text-on-muted hover:text-error-text transition-colors cursor-pointer flex-shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

    </aside>
  );
}
