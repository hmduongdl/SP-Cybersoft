"use client";

import React from "react";
import { List, Columns, Calendar, Search } from "lucide-react";
import { useTaskStore, FilterStatus } from "@/store/useTaskStore";
import { KanbanView } from "./views/KanbanView";
import { ListView } from "./views/ListView";
import { CalendarView } from "./views/CalendarView";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function MainContent() {
  const {
    currentWorkspace,
    workspaces,
    currentView,
    setCurrentView,
    filterStatus,
    setFilter,
  } = useTaskStore();

  const activeWorkspace = currentWorkspace || workspaces[0] || {
    id: "ws-1",
    name: "Dự án SPS",
    icon: "🚀",
    color: "#0050cb",
  };

  const activeView = currentView;
  const setView = setCurrentView;
  const setFilterStatus = setFilter;

  return (
    <div className="flex-1 overflow-y-auto p-6 min-w-0">

      {/* Page title + view toggle row */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[9px] font-semibold tracking-[.1em] uppercase text-primary mb-1">
            BẢNG CÔNG VIỆC
          </p>
          <h1 className="font-manrope font-bold text-[28px] text-on-surface tracking-[-0.02em] leading-none">
            {activeWorkspace.name}
          </h1>
        </div>

        {/* View toggle */}
        <div className="flex bg-surface-mid rounded-xl p-1 gap-1 self-end">
          {[
            { key: 'list',     icon: List,     label: 'Danh sách' },
            { key: 'kanban',   icon: Columns,  label: 'Kanban' },
            { key: 'calendar', icon: Calendar, label: 'Lịch' },
          ].map(v => (
            <button 
              key={v.key} 
              onClick={() => setView(v.key as any)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer",
                activeView === v.key 
                  ? "bg-white text-primary shadow-sm" 
                  : "text-on-muted hover:text-on-surface"
              )}
            >
              <v.icon size={13} /> {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'all',         label: 'Tất cả' },
          { key: 'todo',        label: 'Cần làm' },
          { key: 'in_progress', label: 'Đang làm' },
          { key: 'done',        label: 'Xong' },
        ].map(f => (
          <button 
            key={f.key} 
            onClick={() => setFilterStatus(f.key as FilterStatus)}
            className={cn(
              "px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors cursor-pointer",
              filterStatus === f.key
                ? "bg-primary text-white"
                : "bg-surface-mid text-on-muted hover:bg-surface-high"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* View content */}
      <AnimatePresence mode="wait">
        {activeView === 'list'     && <ListView key="list" />}
        {activeView === 'kanban'   && <KanbanView key="kanban" />}
        {activeView === 'calendar' && <CalendarView key="calendar" />}
      </AnimatePresence>

    </div>
  );
}
