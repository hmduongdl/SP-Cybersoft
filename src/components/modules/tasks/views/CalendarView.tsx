"use client";

import React, { useState } from "react";
import { useTaskStore } from "@/store/useTaskStore";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

export function CalendarView() {
  const { 
    tasks: allTasks, 
    currentWorkspaceId,
    filterStatus,
    setSelectedTaskId 
  } = useTaskStore();

  // Filter tasks based on current workspace and selected filter
  const tasks = allTasks.filter(t => {
    if (t.workspace_id !== currentWorkspaceId) return false;
    
    if (filterStatus === 'today') {
      if (!t.due_date) return false;
      const todayStr = new Date().toISOString().split('T')[0];
      return t.due_date.startsWith(todayStr);
    }
    
    if (filterStatus === 'upcoming') {
      if (!t.due_date) return true;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return new Date(t.due_date) >= todayStart;
    }
    
    return true;
  });

  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  // Handle month navigation
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Generate calendar grid array
  const blanks = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthYearStr = `Tháng ${currentDate.getMonth() + 1} Năm ${currentDate.getFullYear()}`;

  return (
    <div className="flex flex-col h-full min-h-[600px] font-inter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[24px] font-semibold text-on-surface font-manrope">
          {monthYearStr}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-surface-low transition-colors duration-150 text-on-muted cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={goToToday} className="px-4 py-1.5 text-xs font-semibold rounded-full bg-surface-low text-primary hover:bg-surface-mid transition-colors duration-150 cursor-pointer">
            Hôm nay
          </button>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-surface-low transition-colors duration-150 text-on-muted cursor-pointer">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 mb-2">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
          <div key={day} className="text-center text-[11px] font-bold text-on-muted uppercase tracking-wider py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Grid Body using gap-[1px] bg-surface-mid for borderless grid effect */}
      <div className="grid grid-cols-7 flex-1 bg-surface-mid gap-[1px] overflow-hidden rounded-2xl">
        {blanks.map((blank) => (
          <div key={`blank-${blank}`} className="min-h-[110px] bg-surface-low/40" />
        ))}
        {days.map((day, index) => {
          const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
          const dayTasks = tasks.filter(t => t.due_date?.startsWith(dateStr));
          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          return (
            <div 
              key={day} 
              className="min-h-[110px] p-2 flex flex-col gap-1 transition-colors duration-150 hover:bg-surface-low/50 bg-white"
            >
              <div className="flex items-center justify-end mb-1">
                <span className={clsx(
                  "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full", 
                  isToday ? "bg-primary text-white" : "text-on-muted"
                )}>
                  {day}
                </span>
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] no-scrollbar">
                {dayTasks.map(task => (
                  <div 
                    key={task.id} 
                    onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task.id); }}
                    className={clsx(
                      "text-[10px] px-2 py-1 rounded-lg truncate font-medium cursor-pointer transition-opacity duration-150 hover:opacity-80", 
                      task.status === 'DONE' 
                        ? "bg-surface-low text-on-muted line-through opacity-60" 
                        : "bg-primary-container text-primary"
                    )}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
