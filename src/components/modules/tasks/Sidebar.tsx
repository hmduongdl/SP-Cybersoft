"use client";

import React, { useState } from "react";
import { useTaskStore, Workspace, Tag, FilterStatus } from "@/store/useTaskStore";
import { useSession, signOut } from "next-auth/react";
import { ChevronDown, LogOut, CalendarDays, CheckSquare, Plus, Clock, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { data: session } = useSession();
  const {
    workspaces,
    currentWorkspace,
    tags,
    filterStatus,
    timeFilter,
    selectedTagId,
    isTasksLoading,
    setFilter,
    setTimeFilter,
    setSelectedTagId,
    switchWorkspace,
  } = useTaskStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const displayWorkspaces = [
    { id: "ALL", name: "Tất cả dự án", icon: "🌐", color: "#6b7280" },
    ...workspaces
  ];

  // Fallbacks in case workspaces are still loading or empty in store
  const activeWorkspace = currentWorkspace?.id === "ALL"
    ? displayWorkspaces[0] 
    : (currentWorkspace || workspaces[0] || {
        id: "ws-1",
        name: "Dự án SP-CyberSoft",
        icon: "🚀",
        color: "#0050cb",
      });

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
    { id: "my_tasks", label: "Cá nhân", icon: UserIcon },
    { id: "today", label: "Hôm nay", icon: Clock },
    { id: "upcoming", label: "Sắp tới", icon: CalendarDays },
  ];

  return (
    <aside className="w-64 border-r border-slate-100 bg-slate-50/40 flex flex-col justify-between shrink-0 h-full pt-4 relative z-20">
      
      {/* Workspace Selector (Top) */}
      <div className="px-3 py-4 border-b-0 relative">
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-surface-mid transition-colors duration-150 cursor-pointer"
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
            <p className="text-[13px] font-semibold text-on-surface truncate flex items-center gap-2">
              {activeWorkspace.name || "Dự án SP-CyberSoft"}
              {isTasksLoading && <span className="w-3 h-3 border-[2px] border-primary border-t-transparent rounded-full animate-spin inline-block" />}
            </p>
            <p className="text-[10px] text-on-muted">Workspace</p>
          </div>
          <ChevronDown size={14} className="text-on-muted flex-shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute left-3 right-3 top-[72px] mt-1 bg-surface-mid rounded-2xl shadow-float z-50 p-1.5 space-y-1">
            <p className="text-[9px] font-semibold tracking-wider text-on-muted px-2 py-1 uppercase">
              Chuyển Workspace
            </p>
            <div className="max-h-[200px] overflow-y-auto">
              {displayWorkspaces.map((ws) => (
                <button
                   key={ws.id}
                   onClick={() => {
                     switchWorkspace(ws.id);
                     setIsDropdownOpen(false);
                   }}
                   className={cn(
                     "w-full flex items-center gap-2 p-2 rounded-xl text-xs transition-colors duration-150 cursor-pointer text-left",
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
          <p className="text-[10px] font-inter font-semibold tracking-[.08em] uppercase text-on-muted px-2 pt-2 pb-1">
            CHUNG
          </p>
          <div className="space-y-0.5 px-2">
            {filterItems.map((item) => {
              const isTimeFilterItem = ["today", "upcoming"].includes(item.id);
              const isAllItem = item.id === "all";
              
              let active = false;
              if (isTimeFilterItem) {
                active = timeFilter === item.id;
              } else if (isAllItem) {
                active = filterStatus === "all" && timeFilter === "all";
              } else {
                active = filterStatus === item.id;
              }

              const handleClick = () => {
                if (isTimeFilterItem) {
                  setTimeFilter(item.id as any);
                  setFilter("all"); // reset normal filter when switching to time
                } else if (isAllItem) {
                  setTimeFilter("all");
                  setFilter("all");
                } else {
                  setFilter(item.id as any);
                  setTimeFilter("all"); // reset time filter when switching to normal
                }
              };

              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={handleClick}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[12px] font-inter text-on-muted hover:bg-[#eaedff] transition-colors duration-150 cursor-pointer [&.active]:bg-[#e0e4ff] [&.active]:text-[#0050cb] [&.active]:font-semibold",
                    active && "active"
                  )}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
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
            className="text-on-muted hover:text-error-text transition-colors duration-150 cursor-pointer flex-shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

    </aside>
  );
}
