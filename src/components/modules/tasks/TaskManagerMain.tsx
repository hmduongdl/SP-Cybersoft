"use client";

import React from "react";
import { Plus, Search, Sparkles, Circle, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { useTaskStore } from "@/store/useTaskStore";
import { KanbanView } from "./views/KanbanView";
import { ListView } from "./views/ListView";
import { CalendarView } from "./views/CalendarView";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { AIChatSidebar } from "./AIChatSidebar";
import { AddTaskModal } from "./AddTaskModal";

export default function TaskManagerMain() {
  const { currentView, setCurrentView, toggleAIChat, tasks, setAddTaskModalOpen } = useTaskStore();

  const activeView = currentView === 'kanban' ? 'Kanban' : currentView === 'list' ? 'Danh sách' : 'Lịch';

  // Stats calculation
  const todoCount = tasks.filter(t => t.status === 'TODO').length;
  const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const doneCount = tasks.filter(t => t.status === 'DONE').length;
  const overdueCount = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'DONE').length;

  return (
    <div className="flex gap-0 min-h-full w-full font-inter">
      {/* LEFT SIDEBAR (180px) */}
      <aside className="w-[180px] shrink-0 bg-[#f2f3ff] flex flex-col p-4">
        <p className="text-[10px] font-semibold tracking-[.08em] uppercase text-[#44495a] px-2 mb-2 mt-4 first:mt-0">
          LỌC CÔNG VIỆC
        </p>
        
        <div className="flex flex-col gap-1 mb-6">
          <button className="w-full text-left px-3 py-2 rounded-xl text-[12px] font-medium transition-colors duration-150 bg-[#e0e4ff] text-[#0050cb]">
            Tất cả
          </button>
          <button className="w-full text-left px-3 py-2 rounded-xl text-[12px] font-medium transition-colors duration-150 text-[#44495a] hover:bg-[#eaedff]">
            Ưu tiên cao
          </button>
          <button className="w-full text-left px-3 py-2 rounded-xl text-[12px] font-medium transition-colors duration-150 text-[#44495a] hover:bg-[#eaedff]">
            Của tôi
          </button>
        </div>

        <p className="text-[10px] font-semibold tracking-[.08em] uppercase text-[#44495a] px-2 mb-2 mt-4">
          THẺ TAG
        </p>
        <div className="flex flex-wrap gap-1.5 px-1">
          {/* Mock unique tags */}
          {['Frontend', 'Backend', 'UI/UX', 'AI'].map(tag => (
            <button key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-[#c4c8da] text-[#44495a] hover:bg-[#eaedff] transition-colors">
              {tag}
            </button>
          ))}
        </div>
      </aside>

      {/* RIGHT MAIN AREA */}
      <main className="flex-1 p-6 bg-[#f5f5ff] flex flex-col min-w-0 overflow-hidden">
        
        {/* PAGE HEADER */}
        {/* Tầng 1: breadcrumb riêng — trên cùng */}
        <nav className="flex items-center gap-1.5 text-xs text-[#44495a] mb-3">
          <span>Dashboard</span>
          <span className="text-[#c4c8da]">/</span>
          <span>Trang chủ</span>
          <span className="text-[#c4c8da]">/</span>
          <span className="text-[#0050cb] font-semibold">Task Manager</span>
        </nav>

        {/* Tầng 2: title (trái) + view toggle & action (phải) — align-items: flex-end */}
        <div className="flex items-end justify-between mb-5 shrink-0">
          <div>
            <p className="text-[9px] font-semibold tracking-[.1em] uppercase text-[#0050cb] mb-0.5">
              BẢNG CÔNG VIỆC
            </p>
            <h1 className="font-manrope font-bold text-[28px] text-[#131b2e] tracking-[-0.02em] leading-none">
              Task Manager
            </h1>
          </div>

          <div className="flex items-center gap-4 self-end">
            {/* View Toggle */}
            <div className="flex bg-[#eaedff] rounded-xl p-1 gap-1">
              {[
                { label: 'Kanban', value: 'kanban' },
                { label: 'Danh sách', value: 'list' },
                { label: 'Lịch', value: 'calendar' }
              ].map(v => (
                <button 
                  key={v.value}
                  onClick={() => setCurrentView(v.value as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentView === v.value
                      ? 'bg-white text-[#0050cb] shadow-sm'
                      : 'text-[#44495a] hover:text-[#131b2e]'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            
            {/* Search Input */}
            <div className="relative group hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#44495a]" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="h-[34px] w-56 pl-9 pr-4 rounded-xl border border-[#c4c8da] bg-white text-xs focus:outline-none focus:border-[#0050cb] transition-all"
              />
            </div>

            {/* Nút Thêm Công Việc */}
            <button 
              onClick={() => setAddTaskModalOpen(true)}
              className="flex items-center gap-1.5 h-[34px] px-4 bg-[#0050cb] hover:bg-[#0040a8] text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm công việc</span>
            </button>

            {/* Nút AI Chat */}
            <button 
              onClick={toggleAIChat}
              className="flex items-center gap-1.5 h-[34px] px-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Assist</span>
            </button>
          </div>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-4 gap-3 mb-5 shrink-0">
          {/* Cần làm */}
          <div className="bg-white rounded-2xl p-4 flex flex-col items-start" style={{ boxShadow: '0 8px 24px rgba(19,27,46,.05)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-3" style={{ background: '#f2f3ff' }}>
              <Circle size={15} style={{ color: '#44495a' }} />
            </div>
            <p className="text-[9px] font-medium tracking-[.08em] uppercase text-[#44495a] mb-0.5">Cần làm</p>
            <p className="font-manrope font-bold text-[22px] text-[#131b2e] leading-none">{todoCount}</p>
            <span className="inline-block mt-2 text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#f2f3ff', color: '#44495a' }}>
              +{todoCount} mới
            </span>
          </div>
          
          {/* Đang làm */}
          <div className="bg-white rounded-2xl p-4 flex flex-col items-start" style={{ boxShadow: '0 8px 24px rgba(19,27,46,.05)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-3" style={{ background: '#fff3cd' }}>
              <Loader2 size={15} style={{ color: '#b45309' }} />
            </div>
            <p className="text-[9px] font-medium tracking-[.08em] uppercase text-[#44495a] mb-0.5">Đang làm</p>
            <p className="font-manrope font-bold text-[22px] text-[#131b2e] leading-none">{inProgressCount}</p>
            <span className="inline-block mt-2 text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#fff3cd', color: '#b45309' }}>
              Xử lý
            </span>
          </div>

          {/* Hoàn thành */}
          <div className="bg-white rounded-2xl p-4 flex flex-col items-start" style={{ boxShadow: '0 8px 24px rgba(19,27,46,.05)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-3" style={{ background: '#d5f8e8' }}>
              <CheckCircle2 size={15} style={{ color: '#0d5c34' }} />
            </div>
            <p className="text-[9px] font-medium tracking-[.08em] uppercase text-[#44495a] mb-0.5">Hoàn thành</p>
            <p className="font-manrope font-bold text-[22px] text-[#131b2e] leading-none">{doneCount}</p>
            <span className="inline-block mt-2 text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#d5f8e8', color: '#0d5c34' }}>
              Tuần này
            </span>
          </div>

          {/* Quá hạn */}
          <div className="bg-white rounded-2xl p-4 flex flex-col items-start" style={{ boxShadow: '0 8px 24px rgba(19,27,46,.05)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-3" style={{ background: '#ffdad6' }}>
              <AlertCircle size={15} style={{ color: '#a10000' }} />
            </div>
            <p className="text-[9px] font-medium tracking-[.08em] uppercase text-[#44495a] mb-0.5">Quá hạn</p>
            <p className="font-manrope font-bold text-[22px] text-[#131b2e] leading-none">{overdueCount}</p>
            <span className="inline-block mt-2 text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#ffdad6', color: '#a10000' }}>
              Ổn
            </span>
          </div>
        </div>

        {/* WORKSPACE CONTENT */}
        <div className="flex-1 w-full overflow-hidden relative">
          <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
            {currentView === 'kanban' && <KanbanView />}
            {currentView === 'list' && <ListView />}
            {currentView === 'calendar' && <CalendarView />}
          </div>
        </div>
      </main>

      {/* Slide-over Task Detail Panel */}
      <TaskDetailPanel />

      {/* Slide-over AI Chat Sidebar */}
      <AIChatSidebar />

      {/* Add Task Modal */}
      <AddTaskModal />
    </div>
  );
}
