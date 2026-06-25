"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, Plus, List, Columns, ChevronDown, Calendar } from "lucide-react";
import { useTaskStore } from "@/store/useTaskStore";
import { cn } from "@/lib/utils";

export function Header() {
  const {
    setAddTaskModalOpen,
    currentWorkspace,
    workspaces,
    switchWorkspace,
    currentView,
    setCurrentView,
    currentWorkspaceId,
  } = useTaskStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeWorkspace = currentWorkspaceId === "ALL"
    ? { id: "ALL", name: "Tất cả dự án", icon: "🌐" }
    : currentWorkspace || workspaces[0] || { id: "ALL", name: "Tất cả dự án", icon: "🌐" };

  return (
    <header className="w-full h-16 border-b border-slate-100 dark:border-slate-800 bg-surface-mid dark:bg-[#131b2e] px-6 flex items-center justify-between gap-4 shrink-0 font-inter">
      {/* Left: Workspace Dropdown */}
      <div className="relative inline-block text-left z-45" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-mid dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors w-48 shadow-sm"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span>{activeWorkspace.icon || "🚀"}</span>
            <span className="truncate">{activeWorkspace.name}</span>
          </div>
          <ChevronDown size={16} className="text-slate-500 dark:text-slate-400 shrink-0" />
        </button>

        {isDropdownOpen && (
          <div className="absolute left-0 mt-2 w-56 bg-surface-mid dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 origin-top-left focus:outline-none animate-slide-down">
            <button
              onClick={() => { switchWorkspace("ALL"); setIsDropdownOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 mb-1"
            >
              <div className="flex items-center gap-2 font-semibold text-[#0050cb] text-sm">
                <span>🌐</span>
                <span>Tất cả dự án</span>
              </div>
            </button>
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => { switchWorkspace(ws.id); setIsDropdownOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200 text-sm">
                  <span>{ws.icon || "🚀"}</span>
                  <span className="truncate">{ws.name}</span>
                </div>
              </button>
            ))}
            <button
              onClick={() => { /* Handle new workspace creation */ setIsDropdownOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors mt-1"
            >
              <div className="flex items-center gap-2 font-semibold text-indigo-600 text-sm">
                <span>+ Tạo workspace mới</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 h-10 text-[13px] text-slate-500 w-56">
          <Search size={15} className="flex-shrink-0" />
          <input
            placeholder="Tìm kiếm..."
            className="bg-transparent outline-none w-full text-on-surface dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500"
          />
        </div>

        {/* View toggles */}
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
          {[
            { key: 'list', icon: List, label: 'Danh sách' },
            { key: 'kanban', icon: Columns, label: 'Kanban' },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => setCurrentView(v.key as any)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors duration-150 cursor-pointer h-8",
                currentView === v.key
                  ? "bg-surface-mid dark:bg-slate-700 text-[#0050cb] dark:text-blue-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <v.icon size={13} /> {v.label}
            </button>
          ))}
        </div>

        {/* Quick Add */}
        <button
          onClick={() => setAddTaskModalOpen(true)}
          className="flex items-center gap-1.5 bg-[#0050cb] text-white text-[13px] font-semibold rounded-xl px-4 h-10 cursor-pointer transition-opacity duration-150 hover:opacity-90 shadow-sm"
        >
          <Plus size={15} /> Thêm task
        </button>
      </div>
    </header>
  );
}
