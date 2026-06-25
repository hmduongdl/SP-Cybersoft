/**
 * useMonthWeekFilter — hook quản lý bộ lọc tháng/ngày dùng chung
 *
 * Logic:
 * - Mặc định: tháng hiện tại, dateFrom = đầu tuần hiện tại, dateTo = cuối tuần hiện tại
 * - Chọn tháng hiện tại + chưa đặt dateRange → tuần hiện tại
 * - Chọn tháng khác + chưa đặt dateRange → toàn bộ tháng đó
 * - Khi đặt dateFrom/dateTo thủ công → dùng range đó (trong tháng đã chọn)
 * - Reset range về "Cả tháng" khi đổi tháng
 */

"use client";

import { useMemo, useState } from "react";

// ── helpers ────────────────────────────────────────────────────────────────────

/** YYYY-MM */
function toMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** YYYY-MM-DD */
function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ngày đầu tuần (thứ Hai) chứa ngày d */
function startOfWeek(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay(); // 0=CN, 1=T2, ...
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Ngày cuối tuần (Chủ nhật) chứa ngày d */
function endOfWeek(d: Date): Date {
  const result = startOfWeek(d);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

/** Ngày đầu tháng */
function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1, 0, 0, 0, 0);
}

/** Ngày cuối tháng */
function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

/** Parse "YYYY-MM" → { year, month } (0-indexed month) */
function parseMonthKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m - 1 };
}

export interface DateRange {
  from: Date;
  to: Date;
}

/** Danh sách các tháng có thể chọn (12 tháng gần nhất + "Tất cả") */
export function buildMonthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [
    { value: "all", label: "Tất cả thời gian" },
  ];

  // Lùi về tối đa 24 tháng từ hiện tại để bao phủ dữ liệu cũ
  for (let i = 0; i <= 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = toMonthKey(d);
    const label = d.toLocaleString("vi-VN", { month: "long", year: "numeric" });
    options.push({ value: key, label });
  }

  return options;
}

export interface MonthWeekFilterState {
  /** Tháng đang chọn dạng "YYYY-MM" */
  selectedMonth: string;
  /** Custom dateFrom (YYYY-MM-DD), rỗng = dùng auto-range */
  dateFrom: string;
  /** Custom dateTo (YYYY-MM-DD), rỗng = dùng auto-range */
  dateTo: string;
  /** Range ngày thực tế sẽ dùng để lọc */
  effectiveRange: DateRange;
  /** Tháng hiện tại */
  currentMonthKey: string;
  /** true nếu đang xem tháng hiện tại */
  isCurrentMonth: boolean;
  /** Setter tháng — tự động reset dateFrom/dateTo */
  setSelectedMonth: (v: string) => void;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  /** Reset về mặc định (toàn bộ tháng hiện tại) */
  reset: () => void;
  /** Chọn nhanh tuần hiện tại */
  setThisWeek: () => void;
  /** Label mô tả khoảng thời gian đang xem */
  rangeLabel: string;
}

export function useMonthWeekFilter(): MonthWeekFilterState {
  const now = new Date();
  const currentMonthKey = toMonthKey(now);

  // Mặc định "all" để hiện toàn bộ bài — người dùng tự chọn thu hẹp
  const [selectedMonth, _setSelectedMonth] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const setSelectedMonth = (v: string) => {
    _setSelectedMonth(v);
    // Reset range khi đổi tháng
    setDateFrom("");
    setDateTo("");
  };

  const reset = () => {
    _setSelectedMonth(currentMonthKey);
    setDateFrom("");
    setDateTo("");
  };

  const setThisWeek = () => {
    _setSelectedMonth(currentMonthKey);
    setDateFrom(toDateKey(startOfWeek(now)));
    setDateTo(toDateKey(endOfWeek(now)));
  };

  const isCurrentMonth = selectedMonth === currentMonthKey;
  const isAllTime = selectedMonth === "all";
  const { year, month } = isAllTime
    ? { year: 2000, month: 0 } // placeholder, overridden below
    : parseMonthKey(selectedMonth);

  const effectiveRange = useMemo<DateRange>(() => {
    // Nếu người dùng đặt cả 2 mốc thủ công
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom + "T00:00:00");
      const to = new Date(dateTo + "T23:59:59");
      if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && from <= to) {
        return { from, to };
      }
    }

    // "Tất cả thời gian" → window rộng 5 năm trước đến 5 năm sau
    if (isAllTime) {
      const from = new Date(now.getFullYear() - 5, 0, 1);
      const to = new Date(now.getFullYear() + 5, 11, 31, 23, 59, 59);
      return { from, to };
    }

    // Auto-range: toàn bộ tháng đã chọn
    return {
      from: startOfMonth(year, month),
      to: endOfMonth(year, month),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, dateFrom, dateTo]);

  const rangeLabel = useMemo(() => {
    const fmtDate = (d: Date) =>
      d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

    if (dateFrom && dateTo) {
      return `${fmtDate(effectiveRange.from)} – ${fmtDate(effectiveRange.to)}`;
    }
    if (isAllTime) return "Tất cả thời gian";
    const { year: y, month: m } = parseMonthKey(selectedMonth);
    const d = new Date(y, m, 1);
    return `Cả tháng ${d.toLocaleString("vi-VN", { month: "long", year: "numeric" })}`;
  }, [dateFrom, dateTo, effectiveRange, selectedMonth, isAllTime]);

  return {
    selectedMonth,
    dateFrom,
    dateTo,
    effectiveRange,
    currentMonthKey,
    isCurrentMonth,
    setSelectedMonth,
    setDateFrom,
    setDateTo,
    reset,
    setThisWeek,
    rangeLabel,
  };
}

/** Hàm tiện ích: kiểm tra 1 ISO date string có nằm trong range không */
export function isInRange(isoDateStr: string, range: DateRange): boolean {
  const d = new Date(isoDateStr);
  return d >= range.from && d <= range.to;
}

/** Format ngày đầu tháng cho input[type=date] min */
export function monthMin(selectedMonth: string): string {
  if (selectedMonth === "all") return "";
  const { year, month } = parseMonthKey(selectedMonth);
  return toDateKey(startOfMonth(year, month));
}

/** Format ngày cuối tháng cho input[type=date] max */
export function monthMax(selectedMonth: string): string {
  if (selectedMonth === "all") return "";
  const { year, month } = parseMonthKey(selectedMonth);
  return toDateKey(endOfMonth(year, month));
}
