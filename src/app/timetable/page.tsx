"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ChevronRight, Calendar, RefreshCw,
  Lock, GripVertical, Plus, AlertCircle, FileSpreadsheet,
  Coffee, AlertTriangle, ArrowUpDown, MoreHorizontal,
  Sun, Sunset, Clock, Sparkles,
} from "lucide-react";
import {
  DragDropContext, Droppable, Draggable,
  type DropResult, type DragStart,
  type DraggableProvided, type DraggableStateSnapshot,
} from "@hello-pangea/dnd";
import { toast } from "sonner";
import TimetableOnboardingModal from "@/components/modules/timetable/TimetableOnboardingModal";
import CellEditor from "@/components/modules/timetable/CellEditor";
import TimetableSettingsPopover, { DEFAULT_VISIBLE } from "@/components/modules/timetable/TimetableSettingsPopover";
import AddRowModal from "@/components/modules/timetable/AddRowModal";
import EditRowModal from "@/components/modules/timetable/EditRowModal";

// ─── Constants ────────────────────────────────────────────────────────────────
// T2-T6: individual columns. T7+CN: merged into "weekend" column.
const WEEKDAY_COLS = [
  { key: "mon", label: "T2", fullLabel: "Thứ 2" },
  { key: "tue", label: "T3", fullLabel: "Thứ 3" },
  { key: "wed", label: "T4", fullLabel: "Thứ 4" },
  { key: "thu", label: "T5", fullLabel: "Thứ 5" },
  { key: "fri", label: "T6", fullLabel: "Thứ 6" },
] as const;

const STICKY_SHADOW = "shadow-[4px_0_12px_-4px_rgba(19,27,46,0.08)] dark:shadow-[4px_0_12px_-4px_rgba(0,0,0,0.35)]";

function getTodayColKey(): string | null {
  const day = new Date().getDay();
  const map: Record<number, string> = {
    0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
  };
  return map[day] ?? null;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface TimetableConfig {
  id: string; is_onboarded: boolean; sync_task_manager: boolean;
  max_focus_time: number; is_job_flexible: boolean;
  best_energy_time: string; best_learning_time: string; max_learning_time: number;
}
interface TimetableCell {
  id: string; column_name: string;
  content: string[] | null; task_ids: string[] | null; is_deadline: boolean;
}
export interface TimetableRow {
  id: string; title: string; row_type: string;
  start_time: string; end_time: string; is_locked: boolean;
  order: number; cells: TimetableCell[];
  description?: string;
}

// ─── Time helpers ─────────────────────────────────────────────────────────────
function toMins(t: string) {
  const [h, m] = t.split(":").map(Number); return h * 60 + m;
}
function rowDuration(row: TimetableRow) {
  return toMins(row.end_time) - toMins(row.start_time);
}

// ─── Overlap detection ────────────────────────────────────────────────
// Two rows overlap when their [start, end) intervals intersect.
// Locked anchor rows (anchor_start / anchor_mid / anchor_end) are
// excluded because they intentionally share boundaries with neighbours.
const ANCHOR_TYPES = new Set(["anchor_start", "anchor_mid", "anchor_end"]);
function computeOverlapIds(rows: TimetableRow[]): Set<string> {
  const ids = new Set<string>();
  const candidates = rows.filter(r => !ANCHOR_TYPES.has(r.row_type));
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i], b = candidates[j];
      const aStart = toMins(a.start_time), aEnd = toMins(a.end_time);
      const bStart = toMins(b.start_time), bEnd = toMins(b.end_time);
      // Half-open interval overlap: a.start < b.end && b.start < a.end
      if (aStart < bEnd && bStart < aEnd) {
        ids.add(a.id);
        ids.add(b.id);
      }
    }
  }
  return ids;
}

// ─── WeekendCell — merged T7/CN display ──────────────────────────────────────
function WeekendCell({
  satCell,
  sunCell,
}: {
  satCell: TimetableCell | undefined;
  sunCell: TimetableCell | undefined;
}) {
  const DEADLINE_PREFIX = "[DEADLINE] ";
  const satItems = Array.isArray(satCell?.content) ? (satCell!.content as string[]) : [];
  const sunItems = Array.isArray(sunCell?.content) ? (sunCell!.content as string[]) : [];
  const satDeadline = satCell?.is_deadline ?? false;
  const sunDeadline = sunCell?.is_deadline ?? false;

  const renderHalf = (label: string, items: string[], isDeadline: boolean) => {
    const hasItemDeadline = items.some((item) => item.startsWith(DEADLINE_PREFIX));
    if (items.length === 0) {
      return (
        <span className="text-[10px] text-on-surface-variant/35 italic">—</span>
      );
    }

    return (
      <div className="flex flex-col gap-1.5">
        <ul className="flex flex-col gap-1">
          {items.map((item, i) => {
            const markedDeadline = item.startsWith(DEADLINE_PREFIX);
            const isItemDeadline = markedDeadline || (isDeadline && !hasItemDeadline);
            const displayItem = markedDeadline ? item.slice(DEADLINE_PREFIX.length) : item;
            return (
              <li
                key={i}
                className={[
                  "text-[10.5px] leading-snug break-words rounded-md px-1.5 py-0.5",
                  isItemDeadline
                    ? "bg-error-bg/80 text-error-text font-medium"
                    : "bg-surface-container-low text-on-surface",
                ].join(" ")}
              >
                {displayItem}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 divide-x divide-outline/30 min-h-[28px] -mx-1.5">
      <div className="px-2 py-1">
        <span className="text-[9px] font-bold uppercase tracking-wide text-on-surface-variant/60 mb-1 block">T7</span>
        {renderHalf("T7", satItems, satDeadline)}
      </div>
      <div className="px-2 py-1">
        <span className="text-[9px] font-bold uppercase tracking-wide text-on-surface-variant/60 mb-1 block">CN</span>
        {renderHalf("CN", sunItems, sunDeadline)}
      </div>
    </div>
  );
}

// ─── NoteCell (debounced textarea) ───────────────────────────────────────────
function NoteCell({ row }: { row: TimetableRow }) {
  const noteCell = row.cells.find((c) => c.column_name === "notes");
  const initialVal = Array.isArray(noteCell?.content)
    ? (noteCell!.content as string[]).join(", ") : "";
  const [val, setVal] = useState(initialVal);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = taRef.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  // Auto-resize on initial mount and when content changes externally
  useEffect(() => {
    autoResize();
  }, [val]);

  const handleChange = (v: string) => {
    setVal(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (!noteCell?.id) return;
      try {
        await fetch(`/api/timetable/cells/${noteCell.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: v ? [v] : [] }),
        });
      } catch { }
    }, 1000);
  };

  return (
    <textarea
      ref={taRef}
      value={val}
      onChange={(e) => { handleChange(e.target.value); autoResize(); }}
      onInput={autoResize}
      placeholder="Ghi chú..."
      rows={1}
      className="w-full bg-transparent border-none outline-none focus:ring-0 text-[11px] text-slate-500 dark:text-slate-400 resize-none placeholder:text-slate-300 dark:placeholder:text-slate-700 leading-snug overflow-hidden"
      style={{ minHeight: 22, maxHeight: 120 }}
    />
  );
}

// ─── Break Row (compact inline strip) ────────────────────────────────────────
function BreakRow({
  row, provided, colCount, isGroupHighlighted, isOverlapping, isFlashing,
}: {
  row: TimetableRow; provided: DraggableProvided; colCount: number;
  isGroupHighlighted?: boolean; isOverlapping?: boolean; isFlashing?: boolean;
}) {
  return (
    <tr
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      id={`timetable-row-${row.id}`}
      className={[
        "border-b border-outline/40 transition-all duration-700",
        isFlashing
          ? "bg-success-bg ring-2 ring-inset ring-emerald-400 dark:ring-emerald-500"
          : isOverlapping
            ? "overlap-pulse ring-2 ring-inset ring-amber-400 dark:ring-amber-500 bg-warn-bg/40"
            : isGroupHighlighted
              ? "ring-2 ring-inset ring-primary/40 bg-primary-container/30"
              : "bg-surface-container-low/50",
      ].join(" ")}
    >
      <td colSpan={colCount} className="px-4 py-1.5">
        <div className="flex items-center gap-2.5">
          <Coffee className="w-3 h-3 text-on-surface-variant/50 shrink-0" />
          <span className="text-[11px] text-on-surface-variant italic">{row.title || "Giải lao"}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${isOverlapping ? "bg-warn-bg text-warn-text font-semibold" : "bg-surface-container text-on-surface-variant"}`}>
            {row.start_time} – {row.end_time}
          </span>
          <span className="text-[10px] text-on-surface-variant/60">({rowDuration(row)} phút)</span>
          {isOverlapping && (
            <span className="ml-auto text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" /> Trùng giờ
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main TimetableTableRow ───────────────────────────────────────────────────
function TimetableTableRow({
  row, provided, snapshot, onDelete, onCellChange, onTitleChange, onTimeChange, visibleCols, showWeekend, isGroupHighlighted, isOverlapping, isFlashing, todayColKey,
}: {
  row: TimetableRow;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  onDelete: (id: string) => void;
  onCellChange: (rowId: string, colKey: string, items: string[]) => void;
  onTitleChange: (rowId: string, title: string) => void;
  onTimeChange: (rowId: string, start_time: string, end_time: string) => void;
  visibleCols: string[];
  showWeekend: boolean;
  isGroupHighlighted?: boolean;
  isOverlapping?: boolean;
  isFlashing?: boolean;
  todayColKey?: string | null;
}) {
  const isLocked = row.is_locked;
  const isDragging = snapshot.isDragging;
  const duration = rowDuration(row);

  const getCell = (colKey: string) => row.cells.find((c) => c.column_name === colKey);

  const activeWeekdays = WEEKDAY_COLS.filter((d) => visibleCols.includes(d.key));

  const noteCell = row.cells.find((c) => c.column_name === "notes");
  const noteText = Array.isArray(noteCell?.content)
    ? (noteCell!.content as string[]).join(", ") : "";

  return (
    <tr
      ref={provided.innerRef}
      id={`timetable-row-${row.id}`}
      {...provided.draggableProps}
      onClick={() => {
        window.dispatchEvent(new CustomEvent('openEditRowModal', { detail: row }));
      }}
      title={noteText ? `Ghi chú: ${noteText}` : "Nhấn để chỉnh sửa hàng"}
      className={[
        "border-b border-outline/30 group transition-all duration-700 cursor-pointer",
        isFlashing
          ? "bg-success-bg ring-2 ring-inset ring-emerald-400 dark:ring-emerald-500"
          : isDragging
            ? "shadow-xl ring-2 ring-primary/50 opacity-95 bg-surface-container-lowest scale-[1.005] z-20"
            : isOverlapping
              ? "overlap-pulse bg-surface-container-lowest"
              : "bg-surface-container-lowest",
        !isDragging && !isFlashing && isOverlapping
          ? "ring-2 ring-inset ring-amber-400 dark:ring-amber-500"
          : "",
        !isDragging && !isFlashing && !isOverlapping && isGroupHighlighted
          ? "ring-2 ring-inset ring-primary/40 bg-primary-container/20"
          : "",
        !isDragging && !isFlashing && !isLocked && !isGroupHighlighted && !isOverlapping
          ? "hover:bg-surface-container-low/80" : "",
      ].join(" ")}
    >
      {/* Drag handle (sticky) */}
      <td className={`sticky left-0 z-10 bg-inherit border-r border-outline/30 w-7 px-0 text-center align-middle ${STICKY_SHADOW}`}>
        {isLocked ? (
          <Lock className="w-3.5 h-3.5 text-on-surface-variant/40 mx-auto" />
        ) : (
          <div
            {...provided.dragHandleProps}
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full flex items-center justify-center cursor-grab active:cursor-grabbing py-2.5"
          >
            <GripVertical className="w-3.5 h-3.5 text-on-surface-variant/30 group-hover:text-primary/60 transition-colors" />
          </div>
        )}
      </td>

      {/* Time (sticky) */}
      <td className={`sticky left-7 z-10 bg-inherit border-r border-outline/30 w-[92px] px-2.5 py-2 align-middle ${STICKY_SHADOW}`}>
        <div className="flex flex-col gap-1">
          {isOverlapping && (
            <span className="text-[8px] font-bold text-warn-text uppercase tracking-wide flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> Trùng giờ
            </span>
          )}
          <div className={`font-mono text-[11px] font-semibold leading-none ${isOverlapping ? "text-warn-text" : "text-on-surface"}`}>
            {row.start_time}
          </div>
          <div className="h-px w-full bg-outline/40" />
          <div className={`font-mono text-[11px] leading-none ${isOverlapping ? "text-warn-text" : "text-on-surface-variant"}`}>
            {row.end_time}
          </div>
          <span className="inline-flex items-center gap-0.5 self-start mt-0.5 px-1.5 py-0.5 rounded-full bg-surface-container-low text-[9px] font-medium text-on-surface-variant">
            <Clock className="w-2.5 h-2.5" />
            {duration}p
          </span>
        </div>
      </td>

      {/* Title (sticky) */}
      <td className={`sticky left-[99px] z-10 bg-inherit border-r border-outline/30 w-36 px-2.5 py-2 align-middle ${STICKY_SHADOW}`}>
        <div
          className={[
            "text-[12px] leading-snug break-words whitespace-pre-wrap",
            isLocked
              ? "font-semibold text-on-surface"
              : "font-medium text-on-surface-variant",
          ].join(" ")}
        >
          {row.title}
        </div>
      </td>

      {/* Weekday cells (T2–T6) */}
      {activeWeekdays.map((d) => {
        const cell = getCell(d.key);
        const items = Array.isArray(cell?.content) ? (cell!.content as string[]) : [];
        const isToday = todayColKey === d.key;
        return (
          <td
            key={d.key}
            onClick={(e) => e.stopPropagation()}
            className={[
              "border-r border-outline/30 px-2 py-2 align-top transition-colors",
              isToday ? "bg-primary-container/25 dark:bg-primary-container/15" : "",
            ].join(" ")}
            style={{ minWidth: 0 }}
          >
            <CellEditor
              cellId={cell?.id}
              items={items}
              isDeadline={cell?.is_deadline ?? false}
              colLabel={d.fullLabel}
              onChange={(next) => onCellChange(row.id, d.key, next)}
            />
          </td>
        );
      })}

      {/* Merged weekend column (T7 + CN) */}
      {showWeekend && (
        <td
          onClick={(e) => e.stopPropagation()}
          className={[
            "border-r border-outline/30 px-2 py-2 align-top last:border-r-0 transition-colors",
            (todayColKey === "sat" || todayColKey === "sun") ? "bg-primary-container/25 dark:bg-primary-container/15" : "",
          ].join(" ")}
          style={{ minWidth: 0 }}
        >
          <WeekendCell
            satCell={getCell("sat")}
            sunCell={getCell("sun")}
          />
        </td>
      )}

    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TimetablePage() {
  const [config, setConfig] = useState<TimetableConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [rows, setRows] = useState<TimetableRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [visibleCols, setVisibleCols] = useState<string[]>(DEFAULT_VISIBLE);
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [editingRow, setEditingRow] = useState<TimetableRow | null>(null);
  // Track group IDs being dragged for visual highlight on companion rows
  const [draggedGroupIds, setDraggedGroupIds] = useState<Set<string>>(new Set());
  // Track whether there are unsaved changes
  const [isDirty, setIsDirty] = useState(false);

  const [flashingRowId, setFlashingRowId] = useState<string | null>(null);
  const scrolledOnceRef = useRef(false);

  useEffect(() => {
    if (rows.length > 0 && !scrolledOnceRef.current) {
      scrolledOnceRef.current = true;
      const now = new Date();
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const gmt7Ms = utcMs + 7 * 60 * 60 * 1000;
      const gmt7Date = new Date(gmt7Ms);
      const currentMins = gmt7Date.getHours() * 60 + gmt7Date.getMinutes();

      const currentRow = rows.find(r => {
        if (!r.start_time || !r.end_time) return false;
        const [sh, sm] = r.start_time.split(':').map(Number);
        const [eh, em] = r.end_time.split(':').map(Number);
        const startMins = sh * 60 + sm;
        const endMins = eh * 60 + em;
        return currentMins >= startMins && currentMins < endMins;
      });

      if (currentRow) {
        setTimeout(() => {
          document.getElementById('timetable-row-' + currentRow.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setFlashingRowId(currentRow.id);
          setTimeout(() => setFlashingRowId(null), 3000);
        }, 500);
      }
    }
  }, [rows]);

  useEffect(() => {
    const handleOpenEdit = (e: any) => {
      setEditingRow(e.detail);
    };
    window.addEventListener('openEditRowModal', handleOpenEdit);
    return () => window.removeEventListener('openEditRowModal', handleOpenEdit);
  }, []);
  const saveOrderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-save effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDirty) {
      const timer = setTimeout(() => {
        validateAndSave(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [rows, isDirty]);

  // ── Unsaved-changes guard — warn before closing/navigating away ────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn rời trang?";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/timetable/config")
      .then((r) => r.json())
      .then(({ config }) => {
        if (!config || !config.is_onboarded) { setShowOnboarding(true); }
        else {
          setConfig(config);
          if (Array.isArray(config.visible_columns) && config.visible_columns.length > 0) {
            // Migrate old sat/sun → weekend
            let cols = config.visible_columns as string[];
            if ((cols.includes("sat") || cols.includes("sun")) && !cols.includes("weekend")) {
              cols = [...cols.filter((c: string) => c !== "sat" && c !== "sun"), "weekend"];
            }
            setVisibleCols(cols);
          }
          fetchRows();
        }
      })
      .catch(() => setShowOnboarding(true))
      .finally(() => setLoadingConfig(false));
  }, []);

  const fetchRows = useCallback(async () => {
    setLoadingRows(true);
    try {
      const res = await fetch(`/api/timetable?_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.rows) setRows([...data.rows].sort((a: TimetableRow, b: TimetableRow) => a.order - b.order));
    } catch { }
    setLoadingRows(false);
  }, []);

  const handleOnboardingComplete = async (newConfig: any, generatedRows: any[]) => {
    setConfig(newConfig);
    setRows([...generatedRows].sort((a, b) => a.order - b.order));
    setShowOnboarding(false);
    setIsDirty(false); // Fresh generation is already saved
    toast.success("Khởi tạo thời khóa biểu thành công! 🎉", {
      description: "Bản kế hoạch gợi ý từ AI đã được thiết lập. Lưu ý: Lịch trình này chỉ mang tính chất tham khảo, bạn có thể tự do điều chỉnh và tùy biến để phù hợp nhất với nhu cầu sử dụng thực tế.",
      duration: 6000,
    });
    if (newConfig.sync_task_manager) {
      try { await fetch("/api/timetable/sync-tasks", { method: "POST" }); fetchRows(); } catch { }
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/timetable/sync-tasks", { method: "POST" });
      await fetchRows();
      toast.success("Đồng bộ task thành công!");
    } catch { toast.error("Đồng bộ thất bại."); }
    setSyncing(false);
  };

  /** Called by the settings toggle — saves config then auto-syncs when turning ON */
  const handleSyncToggle = async (enabled: boolean) => {
    // Optimistically update local config state first
    setConfig((c) => c ? { ...c, sync_task_manager: enabled } : c);
    if (enabled) {
      // Brief delay so the UI reflects the toggle state before the spinner starts
      setTimeout(() => handleSync(), 50);
    } else {
      toast.info("Đã tắt đồng bộ Task Manager.");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/timetable/export");
      if (!res.ok) { toast.error("Không thể xuất file Excel."); setExporting(false); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      a.download = `TKB_${dateStr}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Xuất file Excel thành công! 🎉");
    } catch { toast.error("Đã xảy ra lỗi khi xuất file Excel."); }
    finally { setExporting(false); }
  };

  const validateAndSave = async (isAuto = false) => {
    const zeroDur = rows.find((r) => !r.is_locked && rowDuration(r) <= 0);
    if (zeroDur) {
      if (!isAuto) {
        toast.error(
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Không thể lưu!</p>
              <p className="text-xs">Hàng "{zeroDur.title || "(Chưa đặt tên)"}" có thời gian thực hiện bằng 0 phút.</p>
            </div>
          </div>,
          { duration: 5000 },
        );
      }
      return;
    }

    // Warn about overlapping rows before saving (skip warning if auto-saving)
    if (!isAuto) {
      const currentOverlaps = computeOverlapIds(rows);
      if (currentOverlaps.size > 0) {
        const overlapTitles = rows
          .filter(r => currentOverlaps.has(r.id))
          .map(r => `• ${r.title} (${r.start_time}–${r.end_time})`)
          .join("\n");
        const confirmed = window.confirm(
          `⚠️ Bảng có ${currentOverlaps.size} hàng bị trùng khung giờ:\n\n${overlapTitles}\n\nBạn có muốn tiếp tục lưu không?`
        );
        if (!confirmed) return;
      }
    }

    const payload = {
      rows: rows.map((r) => ({
        id: r.id, title: r.title, row_type: r.row_type,
        start_time: r.start_time, end_time: r.end_time,
        is_locked: r.is_locked, order: r.order,
        description: r.description,
        cells: r.cells.map((c) => ({
          column_name: c.column_name, content: c.content,
          task_ids: c.task_ids, is_deadline: c.is_deadline,
        })),
      })),
    };

    try {
      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { 
        const err = await res.json(); 
        if (!isAuto) toast.error(err.error ?? "Lưu thất bại."); 
        return; 
      }
      const data = await res.json();
      setRows([...data.rows].sort((a: TimetableRow, b: TimetableRow) => a.order - b.order));
      setIsDirty(false);
      if (!isAuto) toast.success("Đã lưu thời khóa biểu! 💾");
    } catch { 
      if (!isAuto) toast.error("Không thể kết nối server. Vui lòng thử lại."); 
    }
  };

  const handleRegenerate = () => {
    const confirmed = window.confirm("Hành động này sẽ bắt đầu lại khảo sát tạo bảng mới để AI thiết lập. Bạn có chắc chắn không?");
    if (confirmed) {
      setShowOnboarding(true);
    }
  };

  const handleAddRow = async (title: string, startTime: string, endTime: string) => {
    try {
      const isMorning = toMins(startTime) < toMins("13:30");
      let afterOrder: number | undefined;
      if (isMorning) {
        const midIdx = rows.findIndex(r => r.row_type === "anchor_mid");
        if (midIdx > 0) afterOrder = rows[midIdx - 1].order;
      } else {
        const endIdx = rows.findIndex(r => r.row_type === "anchor_end");
        if (endIdx > 0) afterOrder = rows[endIdx - 1].order;
      }

      const res = await fetch("/api/timetable/rows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, startTime, endTime, afterOrder }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setRows((prev) => {
        const targetOrder = data.row.order;
        const next = prev.map(r => (!r.is_locked && r.order >= targetOrder) ? { ...r, order: r.order + 1 } : r);
        next.push(data.row);
        return next.sort((a, b) => a.order - b.order);
      });
      toast.success("Thêm công việc thành công!");
      setIsDirty(true);
      fetchRows(); // Ensure exact order sync
    } catch (e: any) { 
      toast.error(e.message ?? "Không thể thêm công việc."); 
    }
  };

  const handleEditRowSave = async (rowId: string, data: any) => {
    try {
      const res = await fetch(`/api/timetable/rows/${rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast.success("Cập nhật công việc thành công!");
      setIsDirty(true);
      fetchRows();
    } catch {
      toast.error("Không thể cập nhật công việc.");
    }
  };

  const handleDeleteRow = async (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (row?.is_locked) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    setIsDirty(true);
    try {
      const res = await fetch(`/api/timetable/rows/${id}`, { method: "DELETE" });
      if (!res.ok) { fetchRows(); toast.error("Xóa thất bại."); }
    } catch { fetchRows(); toast.error("Xóa thất bại."); }
  };

  const handleCellChange = (rowId: string, colKey: string, items: string[]) => {
    setIsDirty(true);
    setRows((prev) =>
      prev.map((r) =>
        r.id !== rowId ? r : {
          ...r,
          cells: r.cells.map((c) => c.column_name === colKey ? { ...c, content: items } : c),
        },
      ),
    );
  };

  const handleTitleChange = (rowId: string, title: string) => {
    setIsDirty(true);
    setRows((prev) => prev.map((r) => r.id !== rowId ? r : { ...r, title }));
  };

  const handleTimeChange = (rowId: string, start_time: string, end_time: string) => {
    setIsDirty(true);
    setRows((prev) => prev.map((r) => r.id !== rowId ? r : { ...r, start_time, end_time }));
  };

  const handleSortByTime = () => {
    setRows((prev) => {
      const next = [...prev].sort((a, b) => {
        const diff = toMins(a.start_time) - toMins(b.start_time);
        if (diff !== 0) return diff;
        return toMins(a.end_time) - toMins(b.end_time);
      });
      const withOrder = next.map((r, i) => ({ ...r, order: i }));
      
      // Save order to backend
      if (saveOrderTimer.current) clearTimeout(saveOrderTimer.current);
      saveOrderTimer.current = setTimeout(async () => {
        const freeIds = withOrder.filter((r) => !r.is_locked).map((r) => r.id);
        try {
          await fetch("/api/timetable/reorder", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderedIds: freeIds }),
          });
        } catch { }
      }, 600);

      return withOrder;
    });
    toast.success("Đã sắp xếp lại theo thời gian!");
  };

  // ── Group detection: use description as source of truth ─────────────────────
  // A split focus block is: [Phase 1/2 row] → [break row] → [Phase 2/2 row]
  // We identify group membership purely from the description field for reliability.
  const getFocusGroup = useCallback((draggedId: string, currentRows: TimetableRow[]): TimetableRow[] => {
    const idx = currentRows.findIndex(r => r.id === draggedId);
    if (idx === -1) return [];
    const r = currentRows[idx];

    const FOCUS_TYPES = new Set(["focus_peak", "focus_off", "focus_flexible"]);

    const isPhase1 = (row: TimetableRow | undefined): row is TimetableRow =>
      !!row && FOCUS_TYPES.has(row.row_type) && !!(row.description?.includes("Phase 1/2"));

    const isPhase2 = (row: TimetableRow | undefined): row is TimetableRow =>
      !!row && FOCUS_TYPES.has(row.row_type) && !!(row.description?.includes("Phase 2/2"));

    const isMidBreak = (row: TimetableRow | undefined): row is TimetableRow =>
      !!row && row.row_type === "break";

    // Dragging Phase 1 → pull break + phase2 along
    if (isPhase1(r)) {
      const brk = currentRows[idx + 1];
      const ph2 = currentRows[idx + 2];
      if (isMidBreak(brk) && isPhase2(ph2)) return [r, brk, ph2];
    }

    // Dragging break that sits between Phase 1 and Phase 2 → pull the whole trio
    if (isMidBreak(r)) {
      const ph1 = currentRows[idx - 1];
      const ph2 = currentRows[idx + 1];
      if (isPhase1(ph1) && isPhase2(ph2)) return [ph1, r, ph2];
    }

    // Dragging Phase 2 → pull phase1 + break along
    if (isPhase2(r)) {
      const brk = currentRows[idx - 1];
      const ph1 = currentRows[idx - 2];
      if (isMidBreak(brk) && isPhase1(ph1)) return [ph1, brk, r];
    }

    return [r];
  }, []);

  // Called when drag starts — highlight companion rows immediately
  const onDragStart = useCallback((start: DragStart) => {
    const group = getFocusGroup(start.draggableId, rows);
    if (group.length > 1) {
      setDraggedGroupIds(new Set(group.map(g => g.id)));
    }
  }, [getFocusGroup, rows]);

  const onDragEnd = useCallback((result: DropResult) => {
    // Always clear group highlight when drag ends
    setDraggedGroupIds(new Set());

    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const dragged = rows.find((r) => r.id === draggableId);
    if (!dragged || dragged.is_locked) return;

    // Determine the group that must travel together
    const group = getFocusGroup(draggableId, rows);
    const groupIds = new Set(group.map(g => g.id));

    // Use the same section split as the derived morningRows / afternoonRows below,
    // so indices perfectly align with what @hello-pangea/dnd sees.
    const midIdx = rows.findIndex(r => r.row_type === "anchor_mid");
    let mRows = (midIdx >= 0 ? rows.slice(0, midIdx + 1) : rows.filter(r => toMins(r.start_time) < toMins("13:30"))).slice();
    let aRows = (midIdx >= 0 ? rows.slice(midIdx + 1) : rows.filter(r => toMins(r.start_time) >= toMins("13:30"))).slice();

    // Remove the group from whichever section it currently lives in
    if (source.droppableId === "morning") {
      mRows = mRows.filter(r => !groupIds.has(r.id));
    } else {
      aRows = aRows.filter(r => !groupIds.has(r.id));
    }

    // Insert the group at the drop destination index
    // destination.index already accounts for the placeholder row being removed
    if (destination.droppableId === "morning") {
      mRows.splice(destination.index, 0, ...group);
    } else {
      aRows.splice(destination.index, 0, ...group);
    }

    // Guard: anchor rows must stay at their fixed positions
    if (mRows.length > 0 && mRows[0].row_type !== "anchor_start") {
      toast.error("Không được kéo lên trên Khởi động.");
      return;
    }
    if (mRows.length > 0 && mRows[mRows.length - 1].row_type !== "anchor_mid") {
      toast.error("Tổng kết buổi sáng phải luôn nằm cuối buổi sáng.");
      return;
    }
    if (aRows.length > 0 && aRows[aRows.length - 1].row_type !== "anchor_end") {
      toast.error("Tổng kết cuối ngày phải luôn nằm cuối buổi chiều.");
      return;
    }

    const newRows = [...mRows, ...aRows];
    const withOrder = newRows.map((r, i) => ({ ...r, order: i }));
    setRows(withOrder);

    // Persist new order — debounced, sends ONLY free row IDs in the final order
    if (saveOrderTimer.current) clearTimeout(saveOrderTimer.current);
    saveOrderTimer.current = setTimeout(async () => {
      try {
        const freeIds = withOrder.filter(r => !r.is_locked).map(r => r.id);
        const res = await fetch("/api/timetable/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: freeIds }),
        });
        if (!res.ok) throw new Error();
      } catch { toast.error("Không thể lưu thứ tự."); }
    }, 600);
  }, [rows, getFocusGroup]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const midIndex = rows.findIndex(r => r.row_type === "anchor_mid");
  const morningRows = midIndex >= 0 ? rows.slice(0, midIndex + 1) : rows.filter(r => toMins(r.start_time) < toMins("13:30"));
  const afternoonRows = midIndex >= 0 ? rows.slice(midIndex + 1) : rows.filter(r => toMins(r.start_time) >= toMins("13:30"));
  
  // Detect rows whose time intervals overlap with at least one other row
  const overlapIds = useMemo(() => computeOverlapIds(rows), [rows]);

  const showWeekend = visibleCols.includes("weekend") || visibleCols.includes("sat") || visibleCols.includes("sun");
  const activeWeekdays = WEEKDAY_COLS.filter((d) => visibleCols.includes(d.key));

  // Total col count: drag + time + title + notes? + weekdays + weekend? + delete
  const totalColCount =
    1 + 1 + 1 +
    (visibleCols.includes("notes") ? 1 : 0) +
    activeWeekdays.length +
    (showWeekend ? 1 : 0);

  const todayColKey = useMemo(() => getTodayColKey(), []);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  const workRowCount = useMemo(
    () => rows.filter((r) => r.row_type !== "break" && !ANCHOR_TYPES.has(r.row_type)).length,
    [rows],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-surface-mid dark:bg-[#131b2e] font-inter">
      {/* Overlap pulse animation — injected globally */}
      <style>{`
        @keyframes overlap-pulse {
          0%, 100% { background-color: transparent; }
          40%       { background-color: rgba(251,191,36,0.12); }
          60%       { background-color: rgba(239,68,68,0.08); }
        }
        .overlap-pulse { animation: overlap-pulse 2s ease-in-out infinite; }
      `}</style>

      {showOnboarding && !loadingConfig && (
        <TimetableOnboardingModal onComplete={handleOnboardingComplete} />
      )}

      <EditRowModal
        isOpen={!!editingRow}
        onClose={() => setEditingRow(null)}
        row={editingRow}
        onSave={handleEditRowSave}
        onDelete={handleDeleteRow}
      />

      {/* ── Header ───────────────────────────────────────────── */}
      {isDirty && (
        <div className="sticky top-0 z-40 bg-warn-bg/95 backdrop-blur-sm px-5 py-2 flex items-center gap-2 text-warn-text text-xs font-medium shrink-0 border-b border-warn-text/10">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Bạn có thay đổi chưa lưu — nhấn <strong>Lưu thời khóa biểu</strong> trước khi rời trang.</span>
          <button
            onClick={() => validateAndSave()}
            className="ml-auto shrink-0 px-3 py-1 rounded-lg bg-warn-text/10 hover:bg-warn-text/20 font-semibold transition-colors"
          >
            Lưu ngay
          </button>
        </div>
      )}
      <header className={`sticky ${isDirty ? "top-[37px]" : "top-0"} z-30 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline/40 px-5 py-3 flex items-center justify-between gap-4 shrink-0`}>
        <div className="min-w-0">
          <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant/70 mb-1">
            <span className="hover:text-on-surface cursor-pointer transition-colors">Dashboard</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary font-semibold">Thời khóa biểu</span>
          </nav>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-manrope font-bold text-lg text-on-surface leading-tight truncate">
              Thời khóa biểu tuần
            </h1>
            {rows.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-low text-[10px] font-medium text-on-surface-variant">
                  <Sparkles className="w-3 h-3 text-primary" />
                  {workRowCount} khung việc
                </span>
                {overlapIds.size > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warn-bg text-[10px] font-semibold text-warn-text">
                    <AlertTriangle className="w-3 h-3" />
                    {overlapIds.size} trùng giờ
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowAddRowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-outline/50 text-on-surface hover:bg-surface-container-low transition-all">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thêm việc</span>
          </button>

          {config && (
            <TimetableSettingsPopover
              visibleCols={visibleCols}
              syncTaskManager={config.sync_task_manager}
              syncing={syncing}
              onColumnsChange={(cols) => setVisibleCols(cols)}
              onSyncChange={(enabled) => setConfig((c) => c ? { ...c, sync_task_manager: enabled } : c)}
              onSyncToggle={handleSyncToggle}
            />
          )}

          <div ref={moreRef} className="relative">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className={[
                "w-9 h-9 flex items-center justify-center rounded-xl border transition-all",
                moreOpen
                  ? "border-primary/40 bg-primary-container text-primary"
                  : "border-outline/50 text-on-surface-variant hover:bg-surface-container-low",
              ].join(" ")}
              title="Thêm thao tác"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-11 z-50 w-48 py-1.5 bg-surface-container-lowest border border-outline/40 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150">
                {config?.sync_task_manager && (
                  <button onClick={() => { handleSync(); setMoreOpen(false); }} disabled={syncing}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Đang đồng bộ..." : "Đồng bộ Task Manager"}
                  </button>
                )}
                {rows.length > 0 && (
                  <button onClick={() => { handleExport(); setMoreOpen(false); }} disabled={exporting}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    {exporting ? "Đang xuất..." : "Xuất Excel"}
                  </button>
                )}
                <button onClick={() => { handleSortByTime(); setMoreOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-on-surface hover:bg-surface-container-low transition-colors">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Sắp xếp theo giờ
                </button>
                <div className="my-1 border-t border-outline/30" />
                <button onClick={() => { handleRegenerate(); setMoreOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-on-surface-variant hover:bg-surface-container-low transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tạo lại từ khảo sát
                </button>
              </div>
            )}
          </div>

          <button onClick={() => validateAndSave()}
            className={[
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all relative",
              isDirty
                ? "gradient-primary text-white ring-2 ring-primary/30 animate-pulse"
                : "gradient-primary text-white hover:opacity-90",
            ].join(" ")}
          >
            {isDirty && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-error-text ring-2 ring-surface-container-lowest" />}
            <span className="hidden sm:inline">Lưu thời khóa biểu</span>
            <span className="sm:hidden">Lưu</span>
          </button>
        </div>
      </header>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4">
        {loadingConfig || loadingRows ? (
          <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <p className="text-sm">Đang tải thời khóa biểu...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 rounded-2xl border border-dashed border-outline/40 bg-surface-container-lowest/50">
            <div className="w-14 h-14 rounded-2xl bg-primary-container flex items-center justify-center">
              <Calendar className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-on-surface">Chưa có thời khóa biểu</p>
              <p className="text-xs text-on-surface-variant mt-1">Hoàn thành khảo sát để AI tạo lịch tuần cho bạn.</p>
            </div>
            <button onClick={() => setShowOnboarding(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold gradient-primary text-white">
              Bắt đầu khảo sát
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-outline/40 bg-surface-container-lowest shadow-sm overflow-hidden">
          <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <table
              className="border-collapse text-sm w-full"
              style={{ tableLayout: "fixed" }}
            >
              {/* colgroup: pin meta widths, weekdays + weekend share the rest */}
              <colgroup>
                <col style={{ width: 28 }} />
                <col style={{ width: 92 }} />
                <col style={{ width: 144 }} />
                {activeWeekdays.map((d) => <col key={d.key} />)}
                {showWeekend && <col style={{ width: "14%" }} />}
              </colgroup>

              {/* ── THEAD ─────────────────────────────────────────────── */}
              <thead>
                <tr className="border-b border-outline/40 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className={`sticky top-0 left-0 z-30 bg-surface-container-low border-r border-outline/40 w-7 px-1 py-3 text-center ${STICKY_SHADOW}`}>#</th>
                  <th className={`sticky top-0 left-7 z-30 bg-surface-container-low border-r border-outline/40 px-2.5 py-3 text-left ${STICKY_SHADOW}`}>Khung giờ</th>
                  <th className={`sticky top-0 left-[99px] z-30 bg-surface-container-low border-r border-outline/40 px-2.5 py-3 text-left ${STICKY_SHADOW}`}>Công việc</th>
                  {activeWeekdays.map((d) => {
                    const isToday = todayColKey === d.key;
                    return (
                      <th key={d.key} className={[
                        "sticky top-0 z-20 border-r border-outline/40 px-2 py-3 text-center transition-colors",
                        isToday ? "bg-primary-container/50 text-primary" : "bg-surface-container-low",
                      ].join(" ")}>
                        <span className="hidden sm:inline">{d.fullLabel}</span>
                        <span className="sm:hidden">{d.label}</span>
                        {isToday && <span className="block text-[8px] font-bold normal-case tracking-normal text-primary/80 mt-0.5">Hôm nay</span>}
                      </th>
                    );
                  })}
                  {showWeekend && (
                    <th className={[
                      "sticky top-0 z-20 border-r border-outline/40 px-0 py-0 text-center last:border-r-0",
                      (todayColKey === "sat" || todayColKey === "sun") ? "bg-primary-container/50" : "bg-surface-container-low",
                    ].join(" ")}>
                      <div className="py-2 border-b border-outline/40 text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">
                        Cuối tuần
                        {(todayColKey === "sat" || todayColKey === "sun") && (
                          <span className="block text-[8px] font-bold normal-case tracking-normal text-primary/80 mt-0.5">Hôm nay</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-outline/40">
                        <div className={`py-1.5 text-[9px] font-semibold ${todayColKey === "sat" ? "text-primary" : "text-on-surface-variant/70"}`}>T7</div>
                        <div className={`py-1.5 text-[9px] font-semibold ${todayColKey === "sun" ? "text-primary" : "text-on-surface-variant/70"}`}>CN</div>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>

              {/* Morning Droppable */}
              <Droppable droppableId="morning" type="ROW">
                {(drop) => (
                  <tbody ref={drop.innerRef} {...drop.droppableProps}>
                    <tr className="bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-transparent dark:from-amber-950/20 dark:via-orange-950/10 dark:to-transparent border-b border-amber-200/40 dark:border-amber-800/30">
                      <td colSpan={totalColCount} className="px-4 py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                            <Sun className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">Buổi sáng</span>
                          <span className="text-[10px] text-amber-600/70 dark:text-amber-400/60 font-mono px-2 py-0.5 rounded-full bg-amber-100/60 dark:bg-amber-900/30">08:00 – 12:00</span>
                        </div>
                      </td>
                    </tr>
                    {morningRows.map((row, index) => {
                      const isBreakRow = row.row_type === "break";
                      // Highlight companion rows (non-dragged members of the group)
                      const isGroupHighlighted = draggedGroupIds.size > 1 && draggedGroupIds.has(row.id);
                      const isOverlapping = overlapIds.has(row.id);
                      return (
                        <Draggable key={row.id} draggableId={row.id} index={index} isDragDisabled={row.is_locked}>
                          {(drag, snap) => (
                            isBreakRow ? (
                              <BreakRow
                                row={row}
                                provided={drag}
                                colCount={totalColCount}
                                isGroupHighlighted={isGroupHighlighted && !snap.isDragging}
                                isOverlapping={isOverlapping}
                                isFlashing={flashingRowId === row.id}
                              />
                            ) : (
                              <TimetableTableRow
                                row={row}
                                provided={drag}
                                snapshot={snap}
                                onDelete={handleDeleteRow}
                                onCellChange={handleCellChange}
                                onTitleChange={handleTitleChange}
                                onTimeChange={handleTimeChange}
                                visibleCols={visibleCols}
                                showWeekend={showWeekend}
                                isGroupHighlighted={isGroupHighlighted && !snap.isDragging}
                                isOverlapping={isOverlapping}
                                isFlashing={flashingRowId === row.id}
                                todayColKey={todayColKey}
                              />
                            )
                          )}
                        </Draggable>
                      );
                    })}
                    {drop.placeholder}
                  </tbody>
                )}
              </Droppable>

              {/* Afternoon Droppable */}
              <Droppable droppableId="afternoon" type="ROW">
                {(drop) => (
                  <tbody ref={drop.innerRef} {...drop.droppableProps}>
                    <tr className="bg-gradient-to-r from-sky-50/80 via-blue-50/40 to-transparent dark:from-sky-950/20 dark:via-blue-950/10 dark:to-transparent border-b border-sky-200/40 dark:border-sky-800/30">
                      <td colSpan={totalColCount} className="px-4 py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
                            <Sunset className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-widest text-sky-700 dark:text-sky-400">Buổi chiều</span>
                          <span className="text-[10px] text-sky-600/70 dark:text-sky-400/60 font-mono px-2 py-0.5 rounded-full bg-sky-100/60 dark:bg-sky-900/30">13:30 – 18:30</span>
                        </div>
                      </td>
                    </tr>
                    {afternoonRows.map((row, index) => {
                      const isBreakRow = row.row_type === "break";
                      const isGroupHighlighted = draggedGroupIds.size > 1 && draggedGroupIds.has(row.id);
                      const isOverlapping = overlapIds.has(row.id);
                      return (
                        <Draggable key={row.id} draggableId={row.id} index={index} isDragDisabled={row.is_locked}>
                          {(drag, snap) => (
                            isBreakRow ? (
                              <BreakRow
                                row={row}
                                provided={drag}
                                colCount={totalColCount}
                                isGroupHighlighted={isGroupHighlighted && !snap.isDragging}
                                isOverlapping={isOverlapping}
                                isFlashing={flashingRowId === row.id}
                              />
                            ) : (
                              <TimetableTableRow
                                row={row}
                                provided={drag}
                                snapshot={snap}
                                onDelete={handleDeleteRow}
                                onCellChange={handleCellChange}
                                onTitleChange={handleTitleChange}
                                onTimeChange={handleTimeChange}
                                visibleCols={visibleCols}
                                showWeekend={showWeekend}
                                isGroupHighlighted={isGroupHighlighted && !snap.isDragging}
                                isOverlapping={isOverlapping}
                                isFlashing={flashingRowId === row.id}
                                todayColKey={todayColKey}
                              />
                            )
                          )}
                        </Draggable>
                      );
                    })}
                    {drop.placeholder}
                  </tbody>
                )}
              </Droppable>
            </table>
          </DragDropContext>
          </div>
        )}
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <div className="shrink-0 px-5 py-2.5 border-t border-outline/40 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-on-surface-variant bg-surface-container-lowest">
          <span className="inline-flex items-center gap-1.5"><Lock className="w-3 h-3" />Hàng cố định</span>
          <span className="inline-flex items-center gap-1.5"><GripVertical className="w-3 h-3" />Kéo thả sắp xếp</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-error-bg border border-error-text/20 inline-block" />
            Việc gấp
          </span>
          <span className="inline-flex items-center gap-1.5"><Coffee className="w-3 h-3" />Giải lao</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded-md bg-primary-container/40 text-primary font-medium">Cột sáng</span>
            = Hôm nay
          </span>
          <span className="hidden md:inline text-on-surface-variant/60">· Double-click ô ngày để sửa nhanh · Nhấn hàng để mở chi tiết</span>
        </div>
      )}

      <AddRowModal 
        isOpen={showAddRowModal} 
        onClose={() => setShowAddRowModal(false)} 
        onAdd={handleAddRow} 
      />
    </div>
  );
}
