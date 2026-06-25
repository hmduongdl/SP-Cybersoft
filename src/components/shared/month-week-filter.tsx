"use client";

import React from "react";
import { CalendarDays, RotateCcw, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildMonthOptions,
  monthMin,
  monthMax,
  type MonthWeekFilterState,
} from "@/hooks/use-month-week-filter";

interface MonthWeekFilterProps {
  filter: MonthWeekFilterState;
  /** Màu accent (mặc định primary blue). Truyền className Tailwind */
  accentClass?: string;
  className?: string;
}

/**
 * Bộ lọc tháng + khoảng ngày dùng chung cho 3 trang:
 * Like-share, Báo cáo cá nhân, Quản lý post.
 */
export function MonthWeekFilter({
  filter,
  accentClass = "text-primary",
  className,
}: MonthWeekFilterProps) {
  const {
    selectedMonth,
    dateFrom,
    dateTo,
    currentMonthKey,
    setSelectedMonth,
    setDateFrom,
    setDateTo,
    reset,
    rangeLabel,
    isCurrentMonth,
  } = filter;

  const monthOptions = buildMonthOptions();
  const isAllTime = selectedMonth === "all";
  const minDate = isAllTime ? "" : monthMin(selectedMonth);
  const maxDate = isAllTime ? "" : monthMax(selectedMonth);

  const hasCustomRange = !!(dateFrom && dateTo);
  const isDirty = selectedMonth !== currentMonthKey || hasCustomRange;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        className
      )}
    >
      {/* Month select */}
      <div className="relative">
        <CalendarDays className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none", accentClass)} />
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="pl-9 pr-8 py-2 text-sm font-semibold bg-surface-container-low hover:bg-surface-container rounded-xl border-none outline-none cursor-pointer text-on-surface transition-all duration-150 appearance-none font-inter"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {opt.value === currentMonthKey ? " (hiện tại)" : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-on-surface-variant pointer-events-none" />
      </div>

      {/* Divider */}
      <span className="text-outline-variant text-xs hidden sm:inline">|</span>

      {/* Date from */}
      {!isAllTime && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-on-surface-variant font-inter hidden sm:inline">Từ</span>
          <input
            type="date"
            value={dateFrom}
            min={minDate}
            max={dateTo || maxDate}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm bg-surface-container-low hover:bg-surface-container rounded-xl border-none outline-none cursor-pointer text-on-surface transition-all duration-150 font-inter"
            placeholder="Từ ngày"
          />
        </div>
      )}

      {/* Date to */}
      {!isAllTime && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-on-surface-variant font-inter hidden sm:inline">đến</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || minDate}
            max={maxDate}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm bg-surface-container-low hover:bg-surface-container rounded-xl border-none outline-none cursor-pointer text-on-surface transition-all duration-150 font-inter"
            placeholder="Đến ngày"
          />
        </div>
      )}

      {/* Nút Clear / Tuần này / Text báo trạng thái */}
      <div className="flex items-center gap-2">
        <button
          onClick={filter.setThisWeek}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all font-inter"
          title="Xem tuần hiện tại"
        >
          <span className="hidden sm:inline">Tuần này</span>
        </button>

        {isDirty && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all font-inter"
            title="Xóa bộ lọc ngày (Xem cả tháng)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đặt lại</span>
          </button>
        )}
      </div>

      {/* Range label chip */}
      <span
        className={cn(
          "hidden md:inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full",
          hasCustomRange
            ? "bg-primary/10 text-primary"
            : "bg-surface-container text-on-surface-variant"
        )}
      >
        <CalendarDays className="h-3 w-3" />
        {rangeLabel}
      </span>
    </div>
  );
}
