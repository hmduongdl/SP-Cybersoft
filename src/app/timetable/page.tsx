"use client";

import { useState, useEffect, useCallback, useMemo, useRef, KeyboardEvent } from "react";
import {
  ChevronRight, Calendar, RefreshCw,
  Lock, GripVertical, Trash2, Plus, AlertCircle, FileSpreadsheet,
  Coffee, X, AlertTriangle, ArrowUpDown,
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
  const satItems = Array.isArray(satCell?.content) ? (satCell!.content as string[]) : [];
  const sunItems = Array.isArray(sunCell?.content) ? (sunCell!.content as string[]) : [];
  const satDeadline = satCell?.is_deadline ?? false;
  const sunDeadline = sunCell?.is_deadline ?? false;

  const renderHalf = (label: string, items: string[], isDeadline: boolean) => {
    if (items.length === 0) return null;

    return (
      <div className="flex flex-col gap-1 pr-0.5">
        <div className={`flex items-center gap-1 mb-0.5 shrink-0 ${isDeadline ? "text-red-500" : "text-slate-500 dark:text-slate-400"}`}>
          {isDeadline && <AlertTriangle className="w-2 h-2 shrink-0" />}
          <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
          {isDeadline && <span className="text-[9px] font-bold uppercase tracking-wide ml-1">Deadline</span>}
        </div>
        <ul className="flex flex-col gap-1">
          {items.map((item, i) => (
            <li
              key={i}
              className={`flex items-start gap-1.5 text-[10.5px] leading-snug shrink-0 whitespace-normal break-words ${isDeadline ? "text-red-700 dark:text-red-300 font-semibold" : "text-slate-700 dark:text-slate-300"}`}
            >
              <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${isDeadline ? "bg-red-500" : "bg-slate-400 dark:bg-slate-500"}`} />
              <span className="flex-1 min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3 min-h-[24px]">
      {satItems.length === 0 && sunItems.length === 0 && (
        <span className="text-[10px] text-slate-300 dark:text-slate-700 italic flex items-center h-full">—</span>
      )}
      {renderHalf("T7", satItems, satDeadline)}
      {renderHalf("CN", sunItems, sunDeadline)}
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
        "border-b border-slate-100 dark:border-slate-800/60 transition-all duration-1000",
        isFlashing
          ? "bg-green-100 ring-2 ring-inset ring-green-500 dark:bg-green-900/40 dark:ring-green-500"
          : isOverlapping
            ? "overlap-pulse ring-2 ring-inset ring-amber-400 dark:ring-amber-500 bg-amber-50/70 dark:bg-amber-900/20"
            : isGroupHighlighted
              ? "ring-2 ring-inset ring-indigo-300 dark:ring-indigo-600 bg-indigo-50/60 dark:bg-indigo-900/20"
              : "",
      ].join(" ")}
    >
      <td colSpan={colCount} className="px-3 py-1 bg-slate-50/80 dark:bg-slate-800/30">
        <div className="flex items-center gap-2">
          <Coffee className="w-2.5 h-2.5 text-slate-400 dark:text-slate-600 shrink-0" />
          <span className="text-[10px] text-slate-400 dark:text-slate-600 italic">{row.title || "Giải lao"}</span>
          <span className={`text-[10px] font-mono ${isOverlapping ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-slate-300 dark:text-slate-700"}`}>
            {row.start_time} – {row.end_time}
          </span>
          <span className="text-[10px] text-slate-300 dark:text-slate-700">({rowDuration(row)} phút)</span>
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
  row, provided, snapshot, onDelete, onCellChange, onTitleChange, onTimeChange, visibleCols, showWeekend, isGroupHighlighted, isOverlapping, isFlashing,
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
}) {
  const isLocked = row.is_locked;
  const isDragging = snapshot.isDragging;
  const [hovered, setHovered] = useState(false);

  const getCell = (colKey: string) => row.cells.find((c) => c.column_name === colKey);

  // No inline title editing
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const autoResizeTitle = useCallback(() => {
    // No-op
  }, []);

  // No inline time editing

  const activeWeekdays = WEEKDAY_COLS.filter((d) => visibleCols.includes(d.key));

  const noteCell = row.cells.find((c) => c.column_name === "notes");
  const noteText = Array.isArray(noteCell?.content)
    ? (noteCell!.content as string[]).join(", ") : "";

  return (
    <tr
      ref={provided.innerRef}
      id={`timetable-row-${row.id}`}
      {...provided.draggableProps}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        window.dispatchEvent(new CustomEvent('openEditRowModal', { detail: row }));
      }}
      title={noteText ? `Ghi chú: ${noteText}` : undefined}
      className={[
        "border-b border-slate-100 dark:border-slate-800 group transition-all duration-1000 cursor-pointer",
        isFlashing
          ? "bg-green-100 ring-2 ring-inset ring-green-500 dark:bg-green-900/40 dark:ring-green-500"
          : isDragging
            ? "shadow-xl ring-2 ring-indigo-400 dark:ring-indigo-600 opacity-95 bg-white dark:bg-slate-900 scale-[1.01]"
            : isOverlapping
              ? "overlap-pulse bg-white dark:bg-slate-900"
              : "bg-white dark:bg-slate-900",
        !isDragging && !isFlashing && isOverlapping
          ? "ring-2 ring-inset ring-amber-400 dark:ring-amber-500"
          : "",
        !isDragging && !isFlashing && !isOverlapping && isGroupHighlighted
          ? "ring-2 ring-inset ring-indigo-300 dark:ring-indigo-600 bg-indigo-50/40 dark:bg-indigo-900/20"
          : "",
        !isDragging && !isFlashing && !isLocked && !isGroupHighlighted && !isOverlapping
          ? "hover:bg-slate-50/70 dark:hover:bg-slate-800/20" : "",
      ].join(" ")}
    >
      {/* Drag handle (sticky) */}
      <td className="sticky left-0 z-10 bg-inherit border-r border-slate-100 dark:border-slate-800 w-7 px-0 text-center align-middle">
        {isLocked ? (
          <Lock className="w-3 h-3 text-slate-300 dark:text-slate-700 mx-auto" />
        ) : (
          <div
            {...provided.dragHandleProps}
            className="h-full w-full flex items-center justify-center cursor-grab active:cursor-grabbing py-2"
          >
            <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-700 group-hover:text-slate-400 transition-colors" />
          </div>
        )}
      </td>

      {/* Time (sticky) — highlights amber when overlapping */}
      <td className="sticky left-7 z-10 bg-inherit border-r border-slate-100 dark:border-slate-800 w-[88px] px-2 py-2 align-middle">
        <div className="flex flex-col gap-0.5 font-mono text-[10px]">
          {isOverlapping && (
            <span className="text-[8px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wide flex items-center gap-0.5 mb-0.5">
              <AlertTriangle className="w-2 h-2 shrink-0" /> Trùng giờ
            </span>
          )}
          <div className={isOverlapping ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-slate-500 dark:text-slate-400"}>
            {row.start_time}
          </div>
          <div className="h-px w-full bg-slate-100 dark:bg-slate-800 my-0.5" />
          <div className={isOverlapping ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-slate-500 dark:text-slate-400"}>
            {row.end_time}
          </div>
        </div>
      </td>

      {/* Title (sticky) */}
      <td className="sticky left-[95px] z-10 bg-inherit border-r border-slate-100 dark:border-slate-800 w-32 px-2 py-1.5 align-middle">
        <div className="flex items-start gap-1">
          <div
            className={[
              "w-full text-[11px] leading-snug break-words whitespace-pre-wrap",
              isLocked
                ? "font-semibold text-slate-700 dark:text-slate-200"
                : "font-medium text-slate-600 dark:text-slate-300",
            ].join(" ")}
          >
            {row.title}
          </div>
        </div>
      </td>

      {/* Weekday cells (T2–T6) */}
      {activeWeekdays.map((d) => {
        const cell = getCell(d.key);
        const items = Array.isArray(cell?.content) ? (cell!.content as string[]) : [];
        return (
          <td
            key={d.key}
            className="border-r border-slate-100 dark:border-slate-800 px-1.5 py-1.5 align-top"
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
          className="border-r border-slate-100 dark:border-slate-800 px-1.5 py-1.5 align-top last:border-r-0"
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
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
        <div className="sticky top-0 z-40 bg-amber-400/95 dark:bg-amber-600/95 backdrop-blur-sm px-4 py-1.5 flex items-center gap-2 text-amber-950 dark:text-amber-50 text-[11px] font-medium shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Bạn có thay đổi chưa được lưu. Hãy nhấn <strong>“Lưu thời khóa biểu”</strong> trước khi rời trang.</span>
          <button
            onClick={validateAndSave}
            className="ml-auto shrink-0 px-2.5 py-0.5 rounded-md bg-amber-900/20 hover:bg-amber-900/30 text-amber-950 dark:text-amber-50 font-semibold transition-colors"
          >
            Lưu ngay
          </button>
        </div>
      )}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <nav className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-600 mb-0.5">
            <span className="hover:text-slate-600 dark:hover:text-slate-400 cursor-pointer transition-colors">Dashboard</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Thời gian biểu</span>
          </nav>
          <h1 className="font-bold text-[15px] text-slate-900 dark:text-slate-100 leading-tight truncate">
            Thời khóa biểu tuần làm việc
          </h1>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {config?.sync_task_manager && (
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Đang đồng bộ..." : "Đồng bộ"}
            </button>
          )}
          {rows.length > 0 && (
            <button onClick={handleExport} disabled={exporting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all disabled:opacity-50">
              {exporting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
              {exporting ? "Xuất..." : "Excel"}
            </button>
          )}
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
          <button onClick={() => setShowAddRowModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <Plus className="w-3 h-3" />
            Thêm việc
          </button>
          <button onClick={handleSortByTime}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <ArrowUpDown className="w-3 h-3" />
            Sắp xếp
          </button>
          <button onClick={handleRegenerate}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <RefreshCw className="w-3 h-3" />
            Tạo lại
          </button>
          <button onClick={validateAndSave}
            className={[
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-semibold shadow-sm transition-all relative",
              isDirty
                ? "bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300 dark:ring-amber-700 animate-pulse"
                : "bg-indigo-600 hover:bg-indigo-700 text-white",
            ].join(" ")}
          >
            {isDirty && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950" />}
            Lưu thời khóa biểu
          </button>
        </div>
      </header>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {loadingConfig || loadingRows ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Đang tải...
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <Calendar className="w-10 h-10 opacity-30" />
            <p className="text-sm">Chưa có thời khóa biểu nào.</p>
          </div>
        ) : (
          <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <table
              className="border-collapse text-sm bg-white dark:bg-slate-900"
              style={{ width: "100%", tableLayout: "fixed" }}
            >
              {/* colgroup: pin meta widths, weekdays + weekend share the rest */}
              <colgroup>
                <col style={{ width: 28 }} />
                <col style={{ width: 88 }} />
                <col style={{ width: 128 }} />
                {activeWeekdays.map((d) => <col key={d.key} />)}
                {showWeekend && <col style={{ width: "13%" }} />}
              </colgroup>

              {/* ── THEAD ─────────────────────────────────────────────── */}
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  <th className="sticky top-0 left-0 z-30 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 w-7 px-1 py-2.5 text-center">#</th>
                  <th className="sticky top-0 left-7 z-30 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 px-2 py-2.5 text-left">Khung giờ</th>
                  <th className="sticky top-0 left-[95px] z-30 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 px-2 py-2.5 text-left">Công việc</th>
                  {activeWeekdays.map((d) => (
                    <th key={d.key} className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 px-2 py-2.5 text-center">
                      <span className="hidden sm:inline">{d.fullLabel}</span>
                      <span className="sm:hidden">{d.label}</span>
                    </th>
                  ))}
                  {/* Weekend merged header */}
                  {showWeekend && (
                    <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 px-0 py-0 text-center last:border-r-0">
                      {/* Outer label */}
                      <div className="py-1.5 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Cuối tuần
                      </div>
                      {/* Sub-column labels */}
                      <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700">
                        <div className="py-1 text-[9px] font-semibold text-slate-400">T7</div>
                        <div className="py-1 text-[9px] font-semibold text-slate-400">CN</div>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>

              {/* Morning Droppable */}
              <Droppable droppableId="morning" type="ROW">
                {(drop) => (
                  <tbody ref={drop.innerRef} {...drop.droppableProps}>
                    <tr className="bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/10 border-b border-amber-200/60 dark:border-amber-800/40">
                      <td colSpan={totalColCount} className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">☀️ Buổi Sáng</span>
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 opacity-60 font-mono">08:00 – 12:00</span>
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
                    <tr className="bg-gradient-to-r from-sky-50 to-blue-50/50 dark:from-sky-950/30 dark:to-blue-950/10 border-b border-sky-200/60 dark:border-sky-800/40">
                      <td colSpan={totalColCount} className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 dark:bg-sky-500" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-sky-700 dark:text-sky-400">🌤️ Buổi Chiều</span>
                          <span className="text-[10px] text-sky-700 dark:text-sky-400 opacity-60 font-mono">13:30 – 18:30</span>
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
        )}
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <div className="shrink-0 px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-[10px] text-slate-400 dark:text-slate-600 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1"><Lock className="w-3 h-3" /><span>Hàng cố định</span></div>
          <div className="flex items-center gap-1"><GripVertical className="w-3 h-3" /><span>Kéo thả</span></div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 dark:bg-red-950/50 dark:border-red-800 inline-block" /><span>Deadline</span></div>
          <div className="flex items-center gap-1"><Coffee className="w-3 h-3" /><span>Giải lao (compact)</span></div>
          <div className="flex items-center gap-1"><span className="italic">double-click</span><span>ô ngày để sửa</span></div>
          <div className="ml-auto flex items-center gap-1 text-slate-300 dark:text-slate-700">
            <span className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-[9px] font-mono">T7 · CN</span>
            <span>= Cuối tuần gộp, T7 trái / CN phải</span>
          </div>
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
