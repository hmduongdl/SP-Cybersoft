"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { List, Columns, Calendar, User as UserIcon } from "lucide-react";
import { useTaskStore } from "@/store/useTaskStore";
import { useSession } from "next-auth/react";
import { KanbanView } from "./views/KanbanView";
import { ListView } from "./views/ListView";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function MainContent() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const tasks = useTaskStore(s => s.tasks);
  const currentWorkspace = useTaskStore(s => s.currentWorkspace);
  const workspaces = useTaskStore(s => s.workspaces);
  const currentView = useTaskStore(s => s.currentView);
  const setCurrentView = useTaskStore(s => s.setCurrentView);
  const setFilter = useTaskStore(s => s.setFilter);

  const [quickNote, setQuickNote] = useState("");
  const [isNoteLoading, setIsNoteLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveNoteTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController | null>(null);

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

    // Cleanup pending timeouts and requests on unmount
    return () => {
      if (saveNoteTimeoutRef.current) clearTimeout(saveNoteTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setQuickNote(val);
    setSaveStatus("saving");

    if (saveNoteTimeoutRef.current) {
      clearTimeout(saveNoteTimeoutRef.current);
    }

    saveNoteTimeoutRef.current = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      fetch('/api/user/quick-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quick_note: val }),
        signal: abortControllerRef.current.signal
      })
        .then(res => {
          if (res.ok) {
            setSaveStatus("saved");
            // Optionally revert to "idle" after a few seconds
            setTimeout(() => setSaveStatus("idle"), 3000);
          } else {
            setSaveStatus("error");
          }
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Lỗi khi lưu ghi chú:', err);
            setSaveStatus("error");
          }
        });
    }, 800); // 800ms debounce
  };

  // Single pass: compute all stat counts in one useMemo
  const stats = useMemo(() => {
    let todo = 0, inProg = 0, done = 0, overdue = 0, myTasks = 0;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    for (const t of tasks) {
      if (t.status === "TODO") todo++;
      else if (t.status === "IN_PROGRESS") inProg++;
      else if (t.status === "DONE") done++;

      if (t.status !== "DONE" && t.due_date && new Date(t.due_date) < todayStart) {
        overdue++;
      }
      if (t.assignee_id === currentUserId) myTasks++;
    }
    return { todoCount: todo, inProgressCount: inProg, doneCount: done, overdueCount: overdue, myTasksCount: myTasks };
  }, [tasks, currentUserId]);

  const { todoCount, inProgressCount, doneCount, overdueCount, myTasksCount } = stats;

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
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/50 dark:bg-slate-950 p-6 md:p-8 w-full">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <nav className="flex items-center gap-1.5 text-xs font-inter mb-3">
          <span className="text-on-muted dark:text-slate-300">Dashboard</span>
          <span className="text-[#c4c8da] dark:text-slate-600">/</span>
          <span className="text-on-muted dark:text-slate-300">Trang chủ</span>
          <span className="text-[#c4c8da] dark:text-slate-600">/</span>
          <span className="text-[#0050cb] font-semibold">Task Manager</span>
        </nav>
        <p className="text-[9px] font-inter font-semibold tracking-[.1em] uppercase text-[#0050cb] mb-1">
          BẢNG CÔNG VIỆC
        </p>
        <h1 className="font-manrope font-bold text-[28px] text-on-surface dark:text-slate-100 tracking-[-0.02em]">
          Task Manager
        </h1>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        {[
          { label: 'Cần làm', bg: '#f2f3ff', color: '#44495a', value: todoCount },
          { label: 'Đang làm', bg: '#fff3cd', color: '#b45309', value: inProgressCount },
          { label: 'Hoàn thành', bg: '#d5f8e8', color: '#0d5c34', value: doneCount },
          { label: 'Quá hạn', bg: '#ffdad6', color: '#a10000', value: overdueCount },
          { label: 'Cá nhân', bg: '#e8eaff', color: '#0050cb', value: myTasksCount },
        ].map(s => (
          <div key={s.label} className="col-span-1 bg-surface-mid dark:bg-[#131b2e] rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ background: s.bg, color: s.color }}>
              {s.label === 'Cần làm' && <List size={16} />}
              {s.label === 'Đang làm' && <Columns size={16} />}
              {s.label === 'Hoàn thành' && <Calendar size={16} />}
              {s.label === 'Quá hạn' && <Calendar size={16} />}
              {s.label === 'Cá nhân' && <UserIcon size={16} />}
            </div>
            <p className="text-[9px] font-inter font-medium tracking-[.08em] uppercase text-on-muted dark:text-slate-400 mb-1">{s.label}</p>
            <p className="text-[22px] font-manrope font-bold text-on-surface dark:text-slate-100">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main Board & Note Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch w-full flex-1 min-h-0">

        {/* Left: Kanban / List View */}
        <div className="col-span-1 lg:col-span-3 min-w-0 w-full h-full flex flex-col bg-transparent rounded-2xl min-h-0">
          <AnimatePresence mode="wait">
            {activeView === 'list' && (
              <div className="flex-1 overflow-y-auto min-h-0" key="list">
                <ListView />
              </div>
            )}
            {activeView === 'kanban' && <KanbanView key="kanban" />}
          </AnimatePresence>
        </div>

        {/* Right: NOTE PANEL */}
        <div className="col-span-1 bg-amber-50/40 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/35 rounded-2xl p-5 pb-20 shadow-sm h-full flex flex-col min-h-0 relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📝</span>
            <h3 className="font-manrope font-bold text-sm text-slate-800 dark:text-slate-300 uppercase tracking-wider">
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
              className="w-full flex-1 !bg-transparent border-none outline-none focus:ring-0 text-sm text-slate-200 placeholder:text-slate-500 resize-none"
              value={quickNote}
              onChange={handleNoteChange}
            />
          )}
          <div className="mt-auto pt-2 text-[10px] text-amber-600/70 dark:text-amber-400/60 text-right font-medium shrink-0 transition-opacity duration-300">
            {saveStatus === 'idle' && "* Tự động lưu bản nháp"}
            {saveStatus === 'saving' && "Đang lưu..."}
            {saveStatus === 'saved' && "✓ Đã lưu bản nháp"}
            {saveStatus === 'error' && <span className="text-red-500">⚠ Lỗi khi lưu</span>}
          </div>
        </div>

      </div>
    </div>
  );
}
