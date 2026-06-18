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

  // Generate calendar grid array
  const blanks = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full min-h-[600px]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800 font-inter capitalize">
          {currentDate.toLocaleString('vi-VN', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1.5 text-sm font-semibold rounded-xl hover:bg-slate-100 transition-colors text-slate-700">
            Hôm nay
          </button>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-t-xl overflow-hidden border border-slate-200">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
          <div key={day} className="bg-slate-50 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Grid Body */}
      <div className="grid grid-cols-7 gap-px bg-slate-200 flex-1 border-x border-b border-slate-200 rounded-b-xl overflow-hidden">
        {blanks.map((blank) => (
          <div key={`blank-${blank}`} className="bg-white/50 min-h-[100px]" />
        ))}
        {days.map((day) => {
          const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
          const dayTasks = tasks.filter(t => t.due_date?.startsWith(dateStr));
          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          return (
            <div key={day} className={clsx("bg-white min-h-[100px] p-2 flex flex-col gap-1 transition-colors hover:bg-slate-50", isToday ? "bg-indigo-50/30" : "")}>
              <div className="flex items-center justify-between mb-1">
                <span className={clsx("text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full", isToday ? "bg-indigo-600 text-white" : "text-slate-500")}>
                  {day}
                </span>
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] no-scrollbar">
                {dayTasks.map(task => (
                  <div 
                    key={task.id} 
                    onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task.id); }}
                    className={clsx("text-[10px] px-1.5 py-1 rounded truncate border font-medium cursor-pointer transition-colors hover:opacity-80", task.status === 'DONE' ? "bg-slate-100 border-slate-200 text-slate-400 line-through" : "bg-indigo-50 border-indigo-100 text-indigo-700")}
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
