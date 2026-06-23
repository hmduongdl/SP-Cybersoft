"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, RefreshCw, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ─── Column definitions ────────────────────────────────────────────────────────
export const ALL_COLUMNS = [
  { key: "order",  label: "Số thứ tự (#)",  alwaysOn: true  },
  { key: "time",   label: "Khung giờ",       alwaysOn: true  },
  { key: "title",  label: "Tên công việc",   alwaysOn: true  },
  { key: "notes",  label: "Ghi chú",         alwaysOn: false },
  { key: "mon",    label: "Thứ 2",           alwaysOn: false },
  { key: "tue",    label: "Thứ 3",           alwaysOn: false },
  { key: "wed",    label: "Thứ 4",           alwaysOn: false },
  { key: "thu",    label: "Thứ 5",           alwaysOn: false },
  { key: "fri",    label: "Thứ 6",           alwaysOn: false },
  { key: "sat",    label: "Thứ 7",           alwaysOn: false },
  { key: "sun",    label: "Chủ Nhật",        alwaysOn: false },
];

export const DEFAULT_VISIBLE = ALL_COLUMNS.map((c) => c.key);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  visibleCols: string[];
  syncTaskManager: boolean;
  onColumnsChange: (cols: string[]) => void;
  onSyncChange: (enabled: boolean) => void;
}

// ─── Checkbox item ────────────────────────────────────────────────────────────
function CheckRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={[
        "flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer select-none group transition-colors",
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:bg-slate-100 dark:hover:bg-slate-800/60",
      ].join(" ")}
    >
      {/* Custom checkbox */}
      <span
        className={[
          "w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0",
          checked
            ? "bg-indigo-500 border-indigo-500"
            : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600",
          disabled ? "" : "group-hover:border-indigo-400",
        ].join(" ")}
        onClick={() => !disabled && onChange(!checked)}
      >
        {checked && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
      </span>
      <span className="text-[12px] text-slate-700 dark:text-slate-300 font-medium leading-tight">
        {label}
      </span>
      {disabled && (
        <span className="ml-auto text-[10px] text-slate-400 italic">bắt buộc</span>
      )}
    </label>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TimetableSettingsPopover({
  visibleCols,
  syncTaskManager,
  onColumnsChange,
  onSyncChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Persist to API ──────────────────────────────────────────────────────
  const persist = async (patch: { visible_columns?: string[]; sync_task_manager?: boolean }) => {
    setSaving(true);
    try {
      await fetch("/api/timetable/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {
      toast.error("Không thể lưu cài đặt.");
    } finally {
      setSaving(false);
    }
  };

  // ── Column toggle ───────────────────────────────────────────────────────
  const toggleColumn = (key: string, on: boolean) => {
    const next = on
      ? [...visibleCols, key]
      : visibleCols.filter((k) => k !== key);
    onColumnsChange(next);
    persist({ visible_columns: next });
  };

  // ── Sync toggle ─────────────────────────────────────────────────────────
  const toggleSync = (enabled: boolean) => {
    onSyncChange(enabled);
    persist({ sync_task_manager: enabled });
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          "w-8 h-8 flex items-center justify-center rounded-lg border transition-all",
          open
            ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
            : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800",
        ].join(" ")}
        title="Tùy biến hiển thị cột"
      >
        <Settings className={`w-4 h-4 transition-transform duration-300 ${open ? "rotate-45" : ""}`} />
      </button>

      {/* Popover panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-10 z-50 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-slate-950/40 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                  Cài đặt hiển thị
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Tùy biến cột & tích hợp
                </p>
              </div>
              {saving && (
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              )}
            </div>

            <div className="p-2 space-y-0.5">
              {/* Column section */}
              <p className="px-2 pt-1 pb-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                Cột hiển thị
              </p>
              {ALL_COLUMNS.map((col) => (
                <CheckRow
                  key={col.key}
                  label={col.label}
                  checked={col.alwaysOn || visibleCols.includes(col.key)}
                  disabled={col.alwaysOn}
                  onChange={(on) => toggleColumn(col.key, on)}
                />
              ))}

              {/* Divider */}
              <div className="my-1.5 border-t border-slate-100 dark:border-slate-800 mx-2" />

              {/* Sync section */}
              <p className="px-2 pt-0.5 pb-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                Tích hợp
              </p>

              {/* Sync toggle — styled separately as a switch-like row */}
              <div
                className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                onClick={() => toggleSync(!syncTaskManager)}
              >
                {/* Animated toggle */}
                <span
                  className={[
                    "relative w-8 h-4 rounded-full transition-colors shrink-0",
                    syncTaskManager ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700",
                  ].join(" ")}
                >
                  <motion.span
                    animate={{ x: syncTaskManager ? 16 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                  />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300 leading-tight">
                    Đồng bộ từ Task Manager
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                    {syncTaskManager ? "Đang bật — task sẽ xuất hiện trong TKB" : "Đang tắt"}
                  </p>
                </div>
              </div>

              {/* Reset to default */}
              <div className="mx-2 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    const allKeys = DEFAULT_VISIBLE;
                    onColumnsChange(allKeys);
                    persist({ visible_columns: allKeys });
                  }}
                  className="w-full text-[11px] text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
                >
                  Khôi phục mặc định
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
