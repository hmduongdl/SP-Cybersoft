"use client";

import React from "react";
import { Plus, Search, ChevronDown, Sparkles, LayoutList, KanbanSquare, Calendar as CalendarIcon } from "lucide-react";
import { clsx } from "clsx";
import { useTaskStore } from "@/store/useTaskStore";
import { KanbanView } from "./views/KanbanView";
import { ListView } from "./views/ListView";
import { CalendarView } from "./views/CalendarView";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { AIChatSidebar } from "./AIChatSidebar";

export default function TaskManagerMain() {
  const { currentView, setCurrentView, toggleAIChat } = useTaskStore();

  return (
    <div className="flex flex-col h-full w-full gap-6">
      {/* Header / Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        {/* Bên trái: Tiêu đề & Chọn Workspace */}
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight font-manrope">Task Manager</h1>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="relative group cursor-pointer flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors shadow-sm">
            <span className="font-semibold text-sm text-slate-700">Workspace Hiện Tại</span>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          </div>
        </div>

        {/* Bên phải: Actions */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* View Toggles */}
          <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            <button
              onClick={() => setCurrentView('list')}
              className={clsx("p-1.5 rounded-lg transition-colors", currentView === 'list' ? "bg-slate-100 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50")}
              title="List View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentView('kanban')}
              className={clsx("p-1.5 rounded-lg transition-colors", currentView === 'kanban' ? "bg-slate-100 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50")}
              title="Kanban View"
            >
              <KanbanSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentView('calendar')}
              className={clsx("p-1.5 rounded-lg transition-colors", currentView === 'calendar' ? "bg-slate-100 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50")}
              title="Calendar View"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative group hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Tìm kiếm công việc..."
              className="h-9 w-56 lg:w-64 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 shadow-sm"
            />
          </div>

          {/* Nút Thêm Công Việc */}
          <button className="flex items-center gap-1.5 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Thêm công việc</span>
          </button>

          {/* Nút AI Chat */}
          <button 
            onClick={toggleAIChat}
            className="flex items-center gap-1.5 h-9 px-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AI Assist</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Content */}
      <div className="flex-1 w-full overflow-hidden relative bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="absolute inset-0 p-4 md:p-6 overflow-y-auto">
          {currentView === 'kanban' && <KanbanView />}
          {currentView === 'list' && <ListView />}
          {currentView === 'calendar' && <CalendarView />}
        </div>
      </div>

      {/* Slide-over Task Detail Panel */}
      <TaskDetailPanel />

      {/* Slide-over AI Chat Sidebar */}
      <AIChatSidebar />
    </div>
  );
}
