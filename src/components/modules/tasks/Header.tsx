"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, Plus, List, Columns, ChevronDown } from "lucide-react";
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
  const [showMobileSearch, setShowMobileSearch] = useState(false);
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
    <header className="w-full min-h-14 border-b border-slate-100 dark:border-slate-800 bg-surface-mid dark:bg-[#131b2e] px-3 sm:px-6 py-2 sm:py-0 flex flex-col sm:flex-row sm:h-16 sm:items-center justify-between gap-2 sm:gap-4 shrink-0 font-inter">
      {/* Left: Workspace Dropdown */}
      <div className="relative inline-block text-left z-45 min-w-0" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-mid dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors w-full sm:w-48 shadow-sm"
        >
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            <span className="shrink-0">{activeWorkspace.icon || "🚀"}</span>
            <span className="truncate">{activeWorkspace.name}</span>
          </div>
          <ChevronDown size={16} className="text-slate-500 dark:text-slate-400 shrink-0" />
        </button>

        {isDropdownOpen && (
          <div className="absolute left-0 mt-2 w-full sm:w-56 max-w-[calc(100vw-1.5rem)] bg-surface-mid dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 origin-top-left focus:outline-none animate-slide-down">
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
              onClick={() => { setIsDropdownOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors mt-1"
            >
              <div className="flex items-center gap-2 font-semibold text-indigo-600 text-sm">
                <span>+ Tạo workspace mới</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Mobile search row */}
      {showMobileSearch && (
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 h-10 text-[13px] text-slate-500 w-full sm:hidden">
          <Search size={15} className="flex-shrink-0" />
          <input
            placeholder="Tìm kiếm..."
            autoFocus
            className="bg-transparent outline-none w-full text-on-surface dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500"
          />
        </div>
      )}

      {/* Right: actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Search — desktop */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 h-10 text-[13px] text-slate-500 w-40 md:w-56">
          <Search size={15} className="flex-shrink-0" />
          <input
            placeholder="Tìm kiếm..."
            className="bg-transparent outline-none w-full text-on-surface dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Search toggle — mobile */}
        <button
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="sm:hidden w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500"
          aria-label="Tìm kiếm"
        >
          <Search size={16} />
        </button>

        {/* View toggles */}
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5 sm:gap-1">
          {[
            { key: 'list', icon: List, label: 'Danh sách' },
            { key: 'kanban', icon: Columns, label: 'Kanban' },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => setCurrentView(v.key as any)}
              className={cn(
                "flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors duration-150 cursor-pointer h-8",
                currentView === v.key
                  ? "bg-surface-mid dark:bg-slate-700 text-[#0050cb] dark:text-blue-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
              title={v.label}
            >
              <v.icon size={13} />
              <span className="hidden md:inline">{v.label}</span>
            </button>
          ))}
        </div>

        {/* Quick Add */}
        <button
          onClick={() => setAddTaskModalOpen(true)}
          className="flex items-center gap-1.5 bg-[#0050cb] text-white text-[13px] font-semibold rounded-xl px-3 sm:px-4 h-9 sm:h-10 cursor-pointer transition-opacity duration-150 hover:opacity-90 shadow-sm shrink-0"
        >
          <Plus size={15} />
          <span className="hidden xs:inline">Thêm task</span>
        </button>
      </div>
    </header>
  );
}
