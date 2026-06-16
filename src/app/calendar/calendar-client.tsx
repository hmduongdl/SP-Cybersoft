"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  isBefore,
  startOfDay
} from "date-fns";
import { vi } from "date-fns/locale";

export default function CalendarClient() {
  const minDate = new Date(2026, 4, 1); // May 2026
  
  // Initialize state with current date, but ensure it's not before minDate
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return isBefore(now, minDate) ? minDate : now;
  });

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const prevMonth = () => {
    const prev = subMonths(currentDate, 1);
    if (!isBefore(startOfMonth(prev), startOfMonth(minDate))) {
      setCurrentDate(prev);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = parseInt(e.target.value);
    const newDate = new Date(currentDate.getFullYear(), month, 1);
    if (!isBefore(startOfMonth(newDate), startOfMonth(minDate))) {
      setCurrentDate(newDate);
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value);
    const newDate = new Date(year, currentDate.getMonth(), 1);
    if (isBefore(startOfMonth(newDate), startOfMonth(minDate))) {
      setCurrentDate(minDate);
    } else {
      setCurrentDate(newDate);
    }
  };

  // Generate calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday as first day
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = "d";
  const rows = [];

  let days = [];
  let day = startDate;
  let formattedDate = "";

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isToday = isSameDay(day, new Date());

      days.push(
        <div
          key={day.toString()}
          className={`min-h-[120px] p-2 transition-colors border-r border-b border-slate-200 ${
            !isCurrentMonth ? "bg-slate-50/50 text-slate-400" : "bg-white text-slate-700"
          } ${isToday ? "bg-indigo-50/30" : "hover:bg-slate-50"}`}
        >
          <div className="flex justify-end">
            <span
              className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
                isToday ? "bg-indigo-600 text-white shadow-sm" : ""
              }`}
            >
              {formattedDate}
            </span>
          </div>
          {/* Post/Task area placeholder */}
          <div className="mt-2 space-y-1">
             {/* Map over tasks/posts here if any */}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7" key={day.toString()}>
        {days}
      </div>
    );
    days = [];
  }

  // Month options based on year
  const currentYear = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i);
  const years = Array.from({ length: 5 }, (_, i) => 2026 + i); // 2026 to 2030

  // If selected year is 2026, only allow months from May (index 4) onwards
  const availableMonths = currentYear === 2026 ? months.slice(4) : months;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Controls */}
      <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900 capitalize">
            {format(currentDate, "MMMM yyyy", { locale: vi })}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
            <select
              value={currentDate.getMonth()}
              onChange={handleMonthChange}
              className="bg-transparent text-sm font-semibold text-slate-700 px-2 py-1 outline-none cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>Tháng {m + 1}</option>
              ))}
            </select>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <select
              value={currentDate.getFullYear()}
              onChange={handleYearChange}
              className="bg-transparent text-sm font-semibold text-slate-700 px-2 py-1 outline-none cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button
              onClick={prevMonth}
              disabled={isBefore(startOfMonth(subMonths(currentDate, 1)), startOfMonth(minDate))}
              className="p-1.5 rounded text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:shadow-none transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex flex-col">
        {/* Days of week */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d, i) => (
            <div key={d} className={`py-3 text-center text-xs font-bold text-slate-500 tracking-wider ${i < 6 ? 'border-r border-slate-200' : ''}`}>
              {d}
            </div>
          ))}
        </div>
        
        {/* Days Grid */}
        <div className="flex flex-col bg-white">
          {rows}
        </div>
      </div>
    </div>
  );
}
