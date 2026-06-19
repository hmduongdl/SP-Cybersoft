"use client";

import React, { useState, useEffect, useRef } from "react";
import { List, Columns, Calendar, Search } from "lucide-react";
import { useTaskStore, FilterStatus } from "@/store/useTaskStore";
import { KanbanView } from "./views/KanbanView";
import { ListView } from "./views/ListView";
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
    tasks,
  } = useTaskStore();

  const [quickNote, setQuickNote] = useState("");
  const [isNoteLoading, setIsNoteLoading] = useState(true);
  const saveNoteTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetch('/api/user/quick-note')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.quick_note === 'string') {
          setQuickNote(data.quick_note);
        }
      })
      .catch(console.error)
      .finally(() => setIsNoteLoading(false));
  }, []);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setQuickNote(val);

    if (saveNoteTimeoutRef.current) {
      clearTimeout(saveNoteTimeoutRef.current);
    }

    saveNoteTimeoutRef.current = setTimeout(() => {
      fetch('/api/user/quick-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quick_note: val })
      }).catch(console.error);
    }, 1000);
  };

  const todoCount = tasks.filter(t => t.status === "TODO").length;
  const inProgressCount = tasks.filter(t => t.status === "IN_PROGRESS").length;
  const doneCount = tasks.filter(t => t.status === "DONE").length;
  const overdueCount = tasks.filter(t => {
    if (t.status === "DONE" || !t.due_date) return false;
    const dueDate = new Date(t.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare without time
    return dueDate < today;
  }).length;

  const activeWorkspace = useTaskStore(state => state.currentWorkspaceId) === "ALL"
    ? { id: "ALL", name: "Tất cả dự án", icon: "🌐", color: "#0050cb" }
    : currentWorkspace || workspaces[0] || {
      id: "ALL",
      name: "Tất cả dự án",
      icon: "🌐",
      color: "#0050cb",
    };

  const activeView = currentView;
  const setView = setCurrentView;
  const setFilterStatus = setFilter;

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/50 p-6 md:p-8 w-full">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <nav className="flex items-center gap-1.5 text-xs font-inter mb-3">
          <span className="text-[#44495a]">Dashboard</span>
          <span className="text-[#c4c8da]">/</span>
          <span className="text-[#44495a]">Trang chủ</span>
          <span className="text-[#c4c8da]">/</span>
          <span className="text-[#0050cb] font-semibold">Task Manager</span>
        </nav>
        <p className="text-[9px] font-inter font-semibold tracking-[.1em] uppercase text-[#0050cb] mb-1">
          BẢNG CÔNG VIỆC
        </p>
        <h1 className="font-manrope font-bold text-[28px] text-[#131b2e] tracking-[-0.02em]">
          Task Manager
        </h1>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[
          { label: 'Cần làm', bg: '#f2f3ff', color: '#44495a', value: todoCount },
          { label: 'Đang làm', bg: '#fff3cd', color: '#b45309', value: inProgressCount },
          { label: 'Hoàn thành', bg: '#d5f8e8', color: '#0d5c34', value: doneCount },
          { label: 'Quá hạn', bg: '#ffdad6', color: '#a10000', value: overdueCount },
        ].map(s => (
          <div key={s.label} className="col-span-1 bg-white rounded-2xl p-4" style={{ boxShadow: '0 8px 24px rgba(19,27,46,.05)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ background: s.bg, color: s.color }}>
              {s.label === 'Cần làm' && <List size={16} />}
              {s.label === 'Đang làm' && <Columns size={16} />}
              {s.label === 'Hoàn thành' && <Calendar size={16} />}
              {s.label === 'Quá hạn' && <Calendar size={16} />}
            </div>
            <p className="text-[9px] font-inter font-medium tracking-[.08em] uppercase text-[#44495a] mb-1">{s.label}</p>
            <p className="text-[22px] font-manrope font-bold text-[#131b2e]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main Board & Note Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch w-full flex-1 min-h-0">

        {/* Left: Kanban / List View */}
        <div className="col-span-1 lg:col-span-3 min-w-0 w-full h-full flex flex-col bg-transparent rounded-2xl min-h-0">
          <AnimatePresence mode="wait">
            {activeView === 'list' && (
              <div className="flex-1 overflow-y-auto min-h-0 h-full" key="list">
                <ListView />
              </div>
            )}
            {activeView === 'kanban' && <KanbanView key="kanban" />}
          </AnimatePresence>
        </div>

        {/* Right: NOTE PANEL */}
        <div className="col-span-1 bg-amber-50/40 border border-amber-200/50 rounded-2xl p-5 shadow-sm h-full flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📝</span>
            <h3 className="font-manrope font-bold text-sm text-slate-800 uppercase tracking-wider">
              Ghi chú nhanh
            </h3>
          </div>
          {isNoteLoading ? (
            <div className="w-full h-full flex-1 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <textarea
              placeholder="Viết ý tưởng hoặc ghi chú công việc tại đây..."
              className="w-full h-full flex-1 min-h-0 bg-transparent border-none outline-none focus:ring-0 text-xs text-slate-700 placeholder:text-slate-400 resize-none font-inter leading-relaxed"
              value={quickNote}
              onChange={handleNoteChange}
            />
          )}
          <div className="text-[10px] text-amber-600/70 text-right mt-2 font-medium shrink-0">
            * Tự động lưu bản nháp
          </div>
        </div>

      </div>
    </div>
  );
}
