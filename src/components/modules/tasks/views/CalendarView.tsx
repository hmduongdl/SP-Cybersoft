"use client";

import React, { useState } from "react";
import { useTaskStore } from "@/store/useTaskStore";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

export function CalendarView() {
  const { tasks, setSelectedTaskId } = useTaskStore();
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
        <h2 className="text-[24px] font-semibold text-[#131b2e] font-manrope">
          {monthYearStr}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-[#f2f3ff] transition-colors text-[#44495a]">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={goToToday} className="px-4 py-1.5 text-xs font-semibold rounded-full bg-[#f2f3ff] text-[#0050cb] hover:bg-[#eaedff] transition-colors">
            Hôm nay
          </button>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-[#f2f3ff] transition-colors text-[#44495a]">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 mb-2">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
          <div key={day} className="text-center text-[11px] font-bold text-[#44495a] uppercase tracking-wider py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Grid Body */}
      <div className="grid grid-cols-7 flex-1 border-t border-[#eaedff]">
        {blanks.map((blank) => (
          <div key={`blank-${blank}`} className="min-h-[110px] border-b border-r border-[#eaedff] bg-[#fafafa]/50" />
        ))}
        {days.map((day, index) => {
          const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
          const dayTasks = tasks.filter(t => t.due_date?.startsWith(dateStr));
          const isToday = new Date().toISOString().split('T')[0] === dateStr;
          const isLastInRow = (blanks.length + index + 1) % 7 === 0;

          return (
            <div 
              key={day} 
              className={clsx(
                "min-h-[110px] p-2 flex flex-col gap-1 transition-colors hover:bg-[#f2f3ff]/50",
                "border-b border-[#eaedff]",
                !isLastInRow && "border-r border-[#eaedff]"
              )}
            >
              <div className="flex items-center justify-end mb-1">
                <span className={clsx(
                  "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full", 
                  isToday ? "bg-[#0050cb] text-white" : "text-[#44495a]"
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
                      "text-[10px] px-2 py-1 rounded-lg truncate font-medium cursor-pointer transition-opacity hover:opacity-80", 
                      task.status === 'DONE' 
                        ? "bg-[#f2f3ff] text-[#44495a] line-through opacity-60" 
                        : "bg-[#d8e2ff] text-[#0050cb]"
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
