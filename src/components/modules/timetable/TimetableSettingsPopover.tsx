"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, RefreshCw, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ─── Column definitions ────────────────────────────────────────────────────────
export const ALL_COLUMNS = [
  { key: "order",   label: "Số thứ tự (#)",           alwaysOn: true  },
  { key: "time",    label: "Khung giờ",                alwaysOn: true  },
  { key: "title",   label: "Tên công việc",            alwaysOn: true  },
  { key: "mon",     label: "Thứ 2",                    alwaysOn: false },
  { key: "tue",     label: "Thứ 3",                    alwaysOn: false },
  { key: "wed",     label: "Thứ 4",                    alwaysOn: false },
  { key: "thu",     label: "Thứ 5",                    alwaysOn: false },
  { key: "fri",     label: "Thứ 6",                    alwaysOn: false },
  { key: "sat",     label: "Thứ 7",                    alwaysOn: false, hint: "Mặc định hiển thị" },
  { key: "sun",     label: "Chủ nhật",                 alwaysOn: false },
];

export const DEFAULT_VISIBLE = ALL_COLUMNS
  .map((c) => c.key)
  .filter((k) => k !== "sun");

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  visibleCols: string[];
  syncTaskManager: boolean;
  syncing?: boolean;
  onColumnsChange: (cols: string[]) => void;
  onSyncChange: (enabled: boolean) => void;
  /** If provided, called instead of onSyncChange — allows parent to auto-run sync after enabling */
  onSyncToggle?: (enabled: boolean) => void;
}

// ─── Checkbox item ────────────────────────────────────────────────────────────
function CheckRow({
  label,
  checked,
  disabled,
  hint,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  hint?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={[
        "flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer select-none group transition-colors",
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:bg-surface-container-low",
      ].join(" ")}
    >
      {/* Custom checkbox */}
      <span
        className={[
          "w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0",
          checked
            ? "bg-primary border-primary"
            : "bg-surface-container-lowest border-outline/40",
          disabled ? "" : "group-hover:border-primary/60",
        ].join(" ")}
        onClick={() => !disabled && onChange(!checked)}
      >
        {checked && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
      </span>
      <span className="text-[12px] text-on-surface font-medium leading-tight flex-1">
        {label}
      </span>
      {hint && (
        <span className="text-[9px] text-on-surface-variant italic bg-surface-container-low px-1.5 py-0.5 rounded-full shrink-0">
          {hint}
        </span>
      )}
      {disabled && (
        <span className="text-[10px] text-on-surface-variant/70 italic shrink-0">bắt buộc</span>
      )}
    </label>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TimetableSettingsPopover({
  visibleCols,
  syncTaskManager,
  syncing = false,
  onColumnsChange,
  onSyncChange,
  onSyncToggle,
}: Props) {
  const normalizeVisibleColumns = (cols: string[]) => {
    const sanitized = cols.filter((c) => c !== "weekend");
    const set = new Set<string>(sanitized);
    set.add("order");
    set.add("time");
    set.add("title");
    if (!set.has("sat") && !set.has("sun")) {
      set.add("sat");
    }
    return ALL_COLUMNS
      .map((c) => c.key)
      .filter((k) => set.has(k));
  };

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
    const nextRaw = on
      ? [...visibleCols, key]
      : visibleCols.filter((k) => k !== key);
    const next = normalizeVisibleColumns(nextRaw);
    onColumnsChange(next);
    persist({ visible_columns: next });
  };

  // ── Sync toggle ─────────────────────────────────────────────────────────
  const toggleSync = (enabled: boolean) => {
    // Always update config state via onSyncChange
    if (onSyncChange) onSyncChange(enabled);
    persist({ sync_task_manager: enabled });
    // If parent provides onSyncToggle, delegate orchestration (auto-sync) there
    if (onSyncToggle) onSyncToggle(enabled);
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          "w-8 h-8 flex items-center justify-center rounded-lg border transition-all",
          open
            ? "border-primary/40 bg-primary-container/20 text-primary"
            : "border-outline/50 text-on-surface-variant hover:border-outline hover:bg-surface-container-low",
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
            className="absolute right-0 top-10 z-50 w-64 bg-surface-container-lowest/95 backdrop-blur-xl border border-outline/40 rounded-2xl shadow-xl shadow-ambient text-on-surface overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline/40">
              <div>
                <p className="text-[13px] font-semibold text-on-surface">
                  Cài đặt hiển thị
                </p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  Tùy biến cột & tích hợp
                </p>
              </div>
              {saving && (
                <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
              )}
            </div>

            <div className="p-2 space-y-0.5">
              {/* Column section */}
              <p className="px-2 pt-1 pb-0.5 text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">
                Cột hiển thị
              </p>
              {ALL_COLUMNS.map((col) => (
                <CheckRow
                  key={col.key}
                  label={col.label}
                  checked={col.alwaysOn || visibleCols.includes(col.key)}
                  disabled={col.alwaysOn}
                  hint={(col as any).hint}
                  onChange={(on) => toggleColumn(col.key, on)}
                />
              ))}

              {/* Divider */}
              <div className="my-1.5 border-t border-outline/30 mx-2" />

              {/* Sync section */}
              <p className="px-2 pt-0.5 pb-0.5 text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">
                Tích hợp
              </p>

              {/* Sync toggle — styled separately as a switch-like row */}
              <div
                className={[
                  "flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors",
                  syncing
                    ? "cursor-not-allowed opacity-70"
                    : "hover:bg-surface-container-low cursor-pointer",
                ].join(" ")}
                onClick={() => !syncing && toggleSync(!syncTaskManager)}
              >
                {/* Animated toggle */}
                <span
                  className={[
                    "relative w-8 h-4 rounded-full transition-colors shrink-0",
                    syncTaskManager ? "bg-primary" : "bg-surface-container-high",
                  ].join(" ")}
                >
                  <motion.span
                    animate={{ x: syncTaskManager ? 16 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-on-surface leading-tight">
                    Đồng bộ từ Task Manager
                  </p>
                  <p className="text-[10px] text-on-surface-variant leading-tight mt-0.5">
                    {syncing
                      ? "Đang đồng bộ dữ liệu..."
                      : syncTaskManager
                        ? "Đang bật — task sẽ xuất hiện trong TKB"
                        : "Đang tắt"}
                  </p>
                </div>
                {/* Spinning indicator shown while syncing */}
                {syncing && syncTaskManager && (
                  <RefreshCw className="w-3 h-3 text-primary animate-spin shrink-0" />
                )}
              </div>

              {/* Reset to default */}
              <div className="mx-2 mt-1.5 pt-1.5 border-t border-outline/30">
                <button
                  onClick={() => {
                    const allKeys = normalizeVisibleColumns(DEFAULT_VISIBLE);
                    onColumnsChange(allKeys);
                    persist({ visible_columns: allKeys });
                  }}
                  className="w-full text-[11px] text-on-surface-variant hover:text-on-surface py-1 rounded-lg hover:bg-surface-container-low transition-colors text-center"
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
