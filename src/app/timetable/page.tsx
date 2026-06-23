"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ChevronRight, Home, Calendar, RefreshCw,
  Lock, GripVertical, Trash2, Plus, AlertCircle, FileSpreadsheet,
} from "lucide-react";
import {
  DragDropContext, Droppable, Draggable,
  type DropResult, type DraggableProvided, type DraggableStateSnapshot,
} from "@hello-pangea/dnd";
import { toast } from "sonner";
import TimetableOnboardingModal from "@/components/modules/timetable/TimetableOnboardingModal";
import CellEditor from "@/components/modules/timetable/CellEditor";
import TimetableSettingsPopover, { DEFAULT_VISIBLE } from "@/components/modules/timetable/TimetableSettingsPopover";

// ─── Constants ────────────────────────────────────────────────────────────────
const DAY_COLS = [
  { key: "mon", label: "Thứ 2" },
  { key: "tue", label: "Thứ 3" },
  { key: "wed", label: "Thứ 4" },
  { key: "thu", label: "Thứ 5" },
  { key: "fri", label: "Thứ 6" },
  { key: "sat", label: "Thứ 7" },
  { key: "sun", label: "CN" },
];

const ROW_BG: Record<string, string> = {
  anchor_start: "bg-slate-50 dark:bg-slate-800/60",
  anchor_mid:   "bg-slate-50 dark:bg-slate-800/60",
  anchor_end:   "bg-slate-50 dark:bg-slate-800/60",
  break:        "bg-slate-50/60 dark:bg-slate-800/30",
  focus_peak:   "bg-white dark:bg-slate-900",
  focus_off:    "bg-white dark:bg-slate-900",
  learning:     "bg-white dark:bg-slate-900",
  custom:       "bg-white dark:bg-slate-900",
};

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
interface TimetableRow {
  id: string; title: string; row_type: string;
  start_time: string; end_time: string; is_locked: boolean;
  order: number; cells: TimetableCell[];
}

// ─── Time helpers ─────────────────────────────────────────────────────────────
function toMins(t: string) {
  const [h, m] = t.split(":").map(Number); return h * 60 + m;
}
function toTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2,"0")}:${String(m % 60).padStart(2,"0")}`;
}
function rowDuration(row: TimetableRow) {
  return toMins(row.end_time) - toMins(row.start_time);
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
    el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`;
  };

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
      } catch {}
    }, 1000);
  };

  return (
    <td className="border-r border-slate-100 dark:border-slate-800 w-48 px-2 py-1.5 align-top">
      <textarea
        ref={taRef}
        value={val}
        onChange={(e) => { setVal(e.target.value); handleChange(e.target.value); autoResize(); }}
        onInput={autoResize}
        placeholder="Thêm ghi chú..."
        rows={1}
        className="w-full bg-transparent border-none outline-none focus:ring-0 text-xs text-slate-700 dark:text-slate-300 resize-none placeholder:text-slate-300 dark:placeholder:text-slate-700 leading-snug"
        style={{ minHeight: 28, maxHeight: 120 }}
      />
    </td>
  );
}

// ─── RowBoundary: hover zone between rows showing (+) ────────────────────────
function RowBoundary({
  aboveRow,
  onInsert,
}: {
  aboveRow: TimetableRow;
  onInsert: (afterOrder: number, startTime: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const totalCols = 4 + DAY_COLS.length;

  return (
    <tr
      className="group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td colSpan={totalCols} className="p-0 border-none">
        <div className={`relative w-full flex items-center justify-center transition-all duration-150 ${hovered ? "h-6 bg-indigo-50/50 dark:bg-indigo-900/10" : "h-2"}`}>
          {hovered && (
            <div className="absolute inset-x-0 flex items-center px-4 z-10">
              <div className="flex-1 h-px bg-indigo-400 dark:bg-indigo-600" />
              <button
                className="mx-2 w-5 h-5 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-md transition-colors shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onInsert(aboveRow.order, aboveRow.end_time);
                }}
                title="Thêm hàng mới"
              >
                <Plus className="w-3 h-3" />
              </button>
              <div className="flex-1 h-px bg-indigo-400 dark:bg-indigo-600" />
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main TableRow ────────────────────────────────────────────────────────────
function TimetableTableRow({
  row, provided, snapshot, onDelete, onCellChange, onTitleChange, onTimeChange, visibleCols,
}: {
  row: TimetableRow;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  onDelete: (id: string) => void;
  onCellChange: (rowId: string, colKey: string, items: string[]) => void;
  onTitleChange: (rowId: string, title: string) => void;
  onTimeChange: (rowId: string, start_time: string, end_time: string) => void;
  visibleCols: string[];
}) {
  const isLocked = row.is_locked;
  const isDragging = snapshot.isDragging;
  const bg = ROW_BG[row.row_type] ?? "bg-white dark:bg-slate-900";
  const [hovered, setHovered] = useState(false);

  const getCell = (colKey: string) => row.cells.find((c) => c.column_name === colKey);

  // Auto-resize for title textarea
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const autoResizeTitle = () => {
    if (!titleRef.current) return;
    titleRef.current.style.height = "auto";
    titleRef.current.style.height = titleRef.current.scrollHeight + "px";
  };
  useEffect(() => { autoResizeTitle(); }, [row.title]);

  // Title debounce
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLocalTitleChange = (v: string) => {
    onTitleChange(row.id, v);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/timetable/rows/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: v }),
        });
      } catch {}
    }, 800);
  };

  // Time debounce
  const timeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLocalTimeChange = (field: "start" | "end", val: string) => {
    const nextStart = field === "start" ? val : row.start_time;
    const nextEnd = field === "end" ? val : row.end_time;
    onTimeChange(row.id, nextStart, nextEnd);
    if (timeTimer.current) clearTimeout(timeTimer.current);
    timeTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/timetable/rows/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start_time: nextStart, end_time: nextEnd }),
        });
      } catch {}
    }, 800);
  };

  return (
    <tr
      ref={provided.innerRef}
      {...provided.draggableProps}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={[
        bg,
        "border-b border-slate-100 dark:border-slate-800 group transition-colors",
        isDragging ? "shadow-xl ring-2 ring-indigo-300 dark:ring-indigo-700 opacity-95" : "",
        !isLocked ? "hover:bg-slate-50/60 dark:hover:bg-slate-800/20" : "",
      ].join(" ")}
    >
      {/* # / drag handle */}
      {visibleCols.includes("order") && (
        <td className="border-r border-slate-100 dark:border-slate-800 w-10 px-1.5 py-2.5 text-center align-middle">
          {isLocked ? (
            <Lock className="w-3 h-3 text-slate-300 dark:text-slate-600 mx-auto" />
          ) : (
            <div
              {...provided.dragHandleProps}
              className="flex items-center justify-center cursor-grab active:cursor-grabbing"
              title="Kéo để di chuyển"
            >
              <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>
          )}
        </td>
      )}

      {/* Khung giờ */}
      {visibleCols.includes("time") && (
        <td className="border-r border-slate-100 dark:border-slate-800 w-28 px-2 py-2.5 align-middle">
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <input
              type="time"
              defaultValue={row.start_time}
              onChange={(e) => handleLocalTimeChange("start", e.target.value)}
              className="bg-transparent border-none p-0 focus:ring-0 w-12 outline-none text-[11px]"
            />
            <span>–</span>
            <input
              type="time"
              defaultValue={row.end_time}
              onChange={(e) => handleLocalTimeChange("end", e.target.value)}
              className="bg-transparent border-none p-0 focus:ring-0 w-12 outline-none text-[11px]"
            />
          </div>
        </td>
      )}

      {/* Tên công việc */}
      {visibleCols.includes("title") && (
        <td className="border-r border-slate-100 dark:border-slate-800 w-36 px-2 py-1.5 align-middle">
          {isLocked ? (
            <div className="flex items-start gap-1.5 px-1 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0 mt-1.5" />
              <textarea
                ref={titleRef}
                defaultValue={row.title}
                onChange={(e) => { handleLocalTitleChange(e.target.value); autoResizeTitle(); }}
                placeholder="Tên công việc..."
                rows={1}
                className={`w-full bg-transparent border-none outline-none focus:ring-0 text-[12px] font-semibold text-slate-700 dark:text-slate-200 resize-none p-0 leading-snug overflow-hidden ${row.row_type === "break" ? "italic text-slate-400 dark:text-slate-500" : ""}`}
                style={{ minHeight: 20 }}
              />
            </div>
          ) : (
            <textarea
              ref={titleRef}
              defaultValue={row.title}
              onChange={(e) => { handleLocalTitleChange(e.target.value); autoResizeTitle(); }}
              placeholder="Tên công việc..."
              rows={1}
              className="w-full bg-transparent border-none outline-none focus:ring-0 text-[12px] font-medium text-slate-700 dark:text-slate-300 resize-none placeholder:text-slate-300 dark:placeholder:text-slate-700 px-1 py-1 leading-snug overflow-hidden"
              style={{ minHeight: 20 }}
            />
          )}
        </td>
      )}

      {/* Ghi chú */}
      {visibleCols.includes("notes") && <NoteCell row={row} />}

      {/* Day cells */}
      {DAY_COLS.filter((d) => visibleCols.includes(d.key)).map((d) => {
        const cell = getCell(d.key);
        const items = Array.isArray(cell?.content) ? (cell!.content as string[]) : [];
        return (
          <td key={d.key} className="border-r border-slate-100 dark:border-slate-800 px-1.5 py-1.5 align-top last:border-r-0 relative" style={{ minWidth: 150 }}>
            <CellEditor
              cellId={cell?.id}
              items={items}
              isDeadline={cell?.is_deadline ?? false}
              colLabel={d.label}
              onChange={(next) => onCellChange(row.id, d.key, next)}
            />
          </td>
        );
      })}

      {/* Trash icon — free rows only, shown on hover */}
      {!isLocked && (
        <td className="w-8 px-1 py-2.5 align-middle">
          <button
            onClick={() => onDelete(row.id)}
            className={`w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all ${hovered ? "opacity-100" : "opacity-0"}`}
            title="Xóa hàng này"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      )}
      {isLocked && <td className="w-8" />}
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
  const saveOrderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/timetable/config")
      .then((r) => r.json())
      .then(({ config }) => {
        if (!config || !config.is_onboarded) { setShowOnboarding(true); }
        else {
          setConfig(config);
          // Restore saved column visibility
          if (Array.isArray(config.visible_columns) && config.visible_columns.length > 0) {
            setVisibleCols(config.visible_columns as string[]);
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
      const res = await fetch("/api/timetable");
      const data = await res.json();
      if (data.rows) setRows([...data.rows].sort((a: TimetableRow, b: TimetableRow) => a.order - b.order));
    } catch {}
    setLoadingRows(false);
  }, []);

  const handleOnboardingComplete = async (newConfig: any, generatedRows: any[]) => {
    setConfig(newConfig);
    setRows([...generatedRows].sort((a, b) => a.order - b.order));
    setShowOnboarding(false);
    if (newConfig.sync_task_manager) {
      try { await fetch("/api/timetable/sync-tasks", { method: "POST" }); fetchRows(); } catch {}
    }
  };

  // ── Sync ─────────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/timetable/sync-tasks", { method: "POST" });
      await fetchRows();
      toast.success("Đồng bộ task thành công!");
    } catch { toast.error("Đồng bộ thất bại."); }
    setSyncing(false);
  };

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/timetable/export");
      if (!res.ok) {
        toast.error("Không thể xuất file Excel.");
        setExporting(false);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      a.download = `TKB_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Xuất file Excel thành công! 🎉");
    } catch {
      toast.error("Đã xảy ra lỗi khi xuất file Excel.");
    } finally {
      setExporting(false);
    }
  };

  const validateAndSave = async () => {
    // Zero-duration guard
    const zeroDur = rows.find((r) => !r.is_locked && rowDuration(r) <= 0);
    if (zeroDur) {
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
      return;
    }

    // Build payload — include all rows with their current cells
    const payload = {
      rows: rows.map((r) => ({
        id:         r.id,
        title:      r.title,
        row_type:   r.row_type,
        start_time: r.start_time,
        end_time:   r.end_time,
        is_locked:  r.is_locked,
        order:      r.order,
        cells:      r.cells.map((c) => ({
          column_name: c.column_name,
          content:     c.content,
          task_ids:    c.task_ids,
          is_deadline: c.is_deadline,
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
        toast.error(err.error ?? "Lưu thất bại.");
        return;
      }
      const data = await res.json();
      // Re-hydrate rows from server response to keep IDs consistent
      setRows([...data.rows].sort((a: TimetableRow, b: TimetableRow) => a.order - b.order));
      toast.success("Đã lưu thời khóa biểu! 💾");
    } catch {
      toast.error("Không thể kết nối server. Vui lòng thử lại.");
    }
  };

  const handleRegenerate = async () => {
    if (!config) {
      setShowOnboarding(true);
      return;
    }
    const confirmed = window.confirm("Hành động này sẽ xóa toàn bộ bảng hiện tại và tạo lại bảng mới dựa trên cấu hình gần nhất. Bạn có chắc chắn không?");
    if (!confirmed) return;

    setLoadingRows(true);
    try {
      const res = await fetch("/api/timetable/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_focus_time: config.max_focus_time,
          is_job_flexible: config.is_job_flexible,
          best_energy_time: config.best_energy_time,
          best_learning_time: config.best_learning_time,
          max_learning_time: config.max_learning_time,
          sync_task_manager: config.sync_task_manager,
        }),
      });
      if (!res.ok) throw new Error("Lỗi khi tạo lại bảng");
      const data = await res.json();
      setRows([...data.rows].sort((a: TimetableRow, b: TimetableRow) => a.order - b.order));
      setConfig(data.config);
      toast.success("Đã tạo lại thời khóa biểu mới! ✨");
    } catch (err) {
      toast.error("Không thể tạo lại bảng. Vui lòng thử lại.");
    } finally {
      setLoadingRows(false);
    }
  };

  // ── Insert row ────────────────────────────────────────────────────────────
  const handleInsertRow = async (afterOrder: number, startTime: string) => {
    try {
      const res = await fetch("/api/timetable/rows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ afterOrder, startTime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Optimistic insert
      setRows((prev) => {
        const next = prev.map((r) =>
          !r.is_locked && r.order > afterOrder ? { ...r, order: r.order + 1 } : r,
        );
        next.push(data.row);
        return next.sort((a, b) => a.order - b.order);
      });
    } catch (e: any) {
      toast.error(e.message ?? "Không thể thêm hàng.");
    }
  };

  // ── Delete row ────────────────────────────────────────────────────────────
  const handleDeleteRow = async (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (row?.is_locked) return;
    setRows((prev) => prev.filter((r) => r.id !== id)); // optimistic
    try {
      const res = await fetch(`/api/timetable/rows/${id}`, { method: "DELETE" });
      if (!res.ok) { fetchRows(); toast.error("Xóa thất bại."); }
    } catch { fetchRows(); toast.error("Xóa thất bại."); }
  };

  // ── Cell change (optimistic) ──────────────────────────────────────────────
  const handleCellChange = (rowId: string, colKey: string, items: string[]) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id !== rowId ? r : {
          ...r,
          cells: r.cells.map((c) =>
            c.column_name === colKey ? { ...c, content: items } : c,
          ),
        },
      ),
    );
  };

  // ── Title change (optimistic) ─────────────────────────────────────────────
  const handleTitleChange = (rowId: string, title: string) => {
    setRows((prev) => prev.map((r) => r.id !== rowId ? r : { ...r, title }));
  };

  // ── Time change (optimistic) ──────────────────────────────────────────────
  const handleTimeChange = (rowId: string, start_time: string, end_time: string) => {
    setRows((prev) => prev.map((r) => r.id !== rowId ? r : { ...r, start_time, end_time }));
  };

  // ── DnD ──────────────────────────────────────────────────────────────────
  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.index === destination.index) return;

    const dragged = rows.find((r) => r.id === draggableId);
    if (!dragged || dragged.is_locked) return;

    const newRows = [...rows];
    const [removed] = newRows.splice(source.index, 1);
    newRows.splice(destination.index, 0, removed);

    const anchorStartIdx = newRows.findIndex((r) => r.row_type === "anchor_start");
    const anchorEndIdx   = newRows.findIndex((r) => r.row_type === "anchor_end");
    if (anchorStartIdx !== 0 || anchorEndIdx !== newRows.length - 1) {
      toast.error("Không thể di chuyển qua hàng neo cố định.");
      return;
    }

    const withOrder = newRows.map((r, i) => ({ ...r, order: i }));
    setRows(withOrder);

    if (saveOrderTimer.current) clearTimeout(saveOrderTimer.current);
    saveOrderTimer.current = setTimeout(async () => {
      const freeIds = withOrder.filter((r) => !r.is_locked).map((r) => r.id);
      try {
        await fetch("/api/timetable/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: freeIds }),
        });
      } catch { toast.error("Không thể lưu thứ tự."); }
    }, 600);
  }, [rows]);

  // ── Section tracking ──────────────────────────────────────────────────────
  const firstAfternoonIndex = rows.findIndex(r => toMins(r.start_time) >= toMins("13:30"));

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {showOnboarding && !loadingConfig && (
        <TimetableOnboardingModal onComplete={handleOnboardingComplete} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <nav className="flex gap-2 text-xs font-inter text-on-surface-variant/70 mb-1.5">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-primary font-semibold">Thời gian biểu</span>
          </nav>
          <h1 className="font-manrope font-bold text-headline-lg text-on-surface leading-tight">
            Thời khóa biểu tuần làm việc
          </h1>
          <p className="mt-1 text-xs text-on-surface-variant font-inter">Tối ưu hóa năng suất làm việc của bạn bằng phương pháp Time-boxing.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
          {config?.sync_task_manager && (
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Đang đồng bộ..." : "Đồng bộ Tasks"}
            </button>
          )}
          {/* Export button */}
          {rows.length > 0 && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all disabled:opacity-50"
              title="Xuất file Excel"
            >
              {exporting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              {exporting ? "Đang xuất..." : "Xuất Excel"}
            </button>
          )}
          {/* Settings popover */}
          {config && (
            <TimetableSettingsPopover
              visibleCols={visibleCols}
              syncTaskManager={config.sync_task_manager}
              onColumnsChange={(cols) => setVisibleCols(cols)}
              onSyncChange={(enabled) => setConfig((c) => c ? { ...c, sync_task_manager: enabled } : c)}
            />
          )}
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Xóa và tạo lại bảng mới theo cấu hình đã lưu"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tạo lại bảng
          </button>
          <button onClick={validateAndSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all">
            Lưu thời khóa biểu
          </button>
        </div>
      </header>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        {loadingConfig || loadingRows ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />Đang tải...
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <Calendar className="w-10 h-10 opacity-30" />
            <p className="text-sm">Chưa có thời khóa biểu nào.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm bg-white dark:bg-slate-900">
            <div className="overflow-x-auto">
              <DragDropContext onDragEnd={onDragEnd}>
                <table className="w-full border-collapse text-sm" style={{ minWidth: 1500 }}>
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                      {visibleCols.includes("order") && <th className="border-r border-slate-200 dark:border-slate-700 w-10 px-2 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-center">#</th>}
                      {visibleCols.includes("time") && <th className="border-r border-slate-200 dark:border-slate-700 w-28 px-2 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Khung giờ</th>}
                      {visibleCols.includes("title") && <th className="border-r border-slate-200 dark:border-slate-700 w-36 px-2 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tên công việc</th>}
                      {visibleCols.includes("notes") && <th className="border-r border-slate-200 dark:border-slate-700 w-48 px-2 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Ghi chú</th>}
                      {DAY_COLS.filter((d) => visibleCols.includes(d.key)).map((d) => (
                        <th key={d.key} className="border-r border-slate-200 dark:border-slate-700 px-2 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide last:border-r-0" style={{ minWidth: 150 }}>
                          {d.label}
                        </th>
                      ))}
                      <th className="w-8" />
                    </tr>
                  </thead>

                  {/* Morning header */}
                  <tbody>
                    <tr className="bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900">
                      <td colSpan={5 + DAY_COLS.length} className="px-4 py-1.5">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                          ☀️ BUỔI SÁNG &nbsp;|&nbsp; 08:00 – 12:00
                        </span>
                      </td>
                    </tr>
                  </tbody>

                  <Droppable droppableId="timetable" type="ROW">
                    {(drop) => (
                      <tbody ref={drop.innerRef} {...drop.droppableProps}>
                        {rows.map((row, index) => {
                          const showAfternoon = index === firstAfternoonIndex;

                          // Can we show a (+) boundary above this row?
                          const prevRow = index > 0 ? rows[index - 1] : null;
                          const showBoundary = prevRow && !prevRow.is_locked && !row.is_locked;

                          return (
                            <>
                              {/* Afternoon divider */}
                              {showAfternoon && (
                                <tr key={`div-${row.id}`} className="bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900">
                                  <td colSpan={5 + DAY_COLS.length} className="px-4 py-1.5">
                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                      🌤️ BUỔI CHIỀU &nbsp;|&nbsp; 13:30 – 18:30
                                    </span>
                                  </td>
                                </tr>
                              )}

                              {/* Row boundary (+) */}
                              {showBoundary && prevRow && (
                                <RowBoundary
                                  key={`boundary-${row.id}`}
                                  aboveRow={prevRow}
                                  onInsert={handleInsertRow}
                                />
                              )}

                              <Draggable key={row.id} draggableId={row.id} index={index} isDragDisabled={row.is_locked}>
                                {(drag, snap) => (
                                  <TimetableTableRow
                                    row={row}
                                    provided={drag}
                                    snapshot={snap}
                                    onDelete={handleDeleteRow}
                                    onCellChange={handleCellChange}
                                    onTitleChange={handleTitleChange}
                                    onTimeChange={handleTimeChange}
                                    visibleCols={visibleCols}
                                  />
                                )}
                              </Draggable>
                            </>
                          );
                        })}
                        {drop.placeholder}
                      </tbody>
                    )}
                  </Droppable>
                </table>
              </DragDropContext>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {rows.length > 0 && (
        <div className="shrink-0 px-4 pb-4 flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-600">
          <div className="flex items-center gap-1"><Lock className="w-3 h-3" /><span>Hàng neo cố định</span></div>
          <div className="flex items-center gap-1"><GripVertical className="w-3 h-3" /><span>Kéo thả</span></div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" /><span>Deadline hôm nay</span></div>
          <div className="flex items-center gap-1"><span className="font-mono text-indigo-400">+</span><span>Di chuột giữa 2 hàng để thêm</span></div>
          <div className="flex items-center gap-1"><span className="italic">double-click</span><span>ô ngày để sửa</span></div>
        </div>
      )}
    </div>
  );
}
