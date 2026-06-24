"use client";

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from "react";
import {
  ChevronRight, Calendar, RefreshCw,
  Lock, GripVertical, Trash2, Plus, AlertCircle, FileSpreadsheet,
  Coffee, X, AlertTriangle, ArrowUpDown,
} from "lucide-react";
import {
  DragDropContext, Droppable, Draggable,
  type DropResult, type DraggableProvided, type DraggableStateSnapshot,
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
}

// ─── Time helpers ─────────────────────────────────────────────────────────────
function toMins(t: string) {
  const [h, m] = t.split(":").map(Number); return h * 60 + m;
}
function rowDuration(row: TimetableRow) {
  return toMins(row.end_time) - toMins(row.start_time);
}

// ─── WeekendMiniEditor — inline chip-input for one day ───────────────────────
// Used inside the WeekendCell popup. Does NOT open its own popup.
function WeekendMiniEditor({
  label,
  dayKey,
  cell,
  isDeadline,
  onPersist,
}: {
  label: string;
  dayKey: "sat" | "sun";
  cell: TimetableCell | undefined;
  isDeadline: boolean;
  onPersist: (items: string[]) => void;
}) {
  const [items, setItems] = useState<string[]>(
    Array.isArray(cell?.content) ? (cell!.content as string[]) : [],
  );
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if cell changes externally
  useEffect(() => {
    setItems(Array.isArray(cell?.content) ? (cell!.content as string[]) : []);
  }, [cell?.content]);

  const persist = (next: string[]) => {
    onPersist(next);
    if (!cell?.id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/timetable/cells/${cell.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: next }),
        });
      } catch { }
    }, 700);
  };

  const push = () => {
    const v = input.trim();
    if (!v || items.includes(v)) return;
    const next = [...items, v];
    setItems(next);
    persist(next);
    setInput("");
  };

  const remove = (i: number) => {
    const next = items.filter((_, idx) => idx !== i);
    setItems(next);
    persist(next);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) { e.preventDefault(); push(); }
    if (e.key === "Backspace" && !input && items.length > 0) remove(items.length - 1);
  };

  const deadlineStyle = "bg-red-950/50 text-red-300 border border-red-800/70";
  const normalStyle   = "bg-slate-800 text-slate-200 border border-slate-700";

  return (
    <div className="flex flex-col gap-1.5">
      {/* Section header */}
      <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded ${isDeadline ? "bg-red-950/30" : "bg-slate-800/60"}`}>
        {isDeadline && <AlertTriangle className="w-2.5 h-2.5 text-red-400 shrink-0" />}
        <span className={`text-[9px] font-bold uppercase tracking-widest ${isDeadline ? "text-red-400" : "text-slate-400"}`}>
          {label}
        </span>
        {isDeadline && <span className="text-[8px] text-red-500 italic ml-auto">deadline</span>}
      </div>

      {/* Chips */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {items.map((item, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-tight ${isDeadline ? deadlineStyle : normalStyle}`}
            >
              <span className="max-w-[90px] truncate">{item}</span>
              <button
                onClick={() => remove(i)}
                className="shrink-0 text-slate-500 hover:text-red-400 transition-colors"
              >
                <X className="w-2 h-2" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-1 bg-slate-900 rounded-lg px-2 py-1 border border-slate-800 focus-within:border-indigo-500 transition-colors">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Nhập + Enter..."
          className="flex-1 min-w-0 bg-transparent text-[10px] text-slate-300 placeholder:text-slate-600 outline-none"
        />
        <button
          onClick={push}
          disabled={!input.trim()}
          className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-indigo-500 text-white disabled:opacity-30 hover:bg-indigo-600 transition-colors"
        >
          <Plus className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}

// ─── WeekendCell — merged T7/CN preview + edit popup ─────────────────────────
function WeekendCell({
  satCell,
  sunCell,
  onSatChange,
  onSunChange,
}: {
  satCell: TimetableCell | undefined;
  sunCell: TimetableCell | undefined;
  onSatChange: (items: string[]) => void;
  onSunChange: (items: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const satItems = Array.isArray(satCell?.content) ? (satCell!.content as string[]) : [];
  const sunItems = Array.isArray(sunCell?.content) ? (sunCell!.content as string[]) : [];
  const satDeadline = satCell?.is_deadline ?? false;
  const sunDeadline = sunCell?.is_deadline ?? false;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Chip renderer helper ─────────────────────────────────────────────────
  const renderHalf = (
    label: string,
    items: string[],
    isDeadline: boolean,
    emptyText: string,
  ) => {
    const chipCls = isDeadline
      ? "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/70"
      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80";
    const labelCls = isDeadline ? "text-red-500 dark:text-red-400" : "text-slate-400 dark:text-slate-600";

    return (
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {/* Day label */}
        <div className={`flex items-center gap-0.5 mb-0.5`}>
          {isDeadline && <AlertTriangle className="w-2 h-2 text-red-500 shrink-0" />}
          <span className={`text-[8px] font-bold uppercase tracking-widest ${labelCls}`}>{label}</span>
        </div>

        {items.length === 0 ? (
          <span className="text-[9px] text-slate-300 dark:text-slate-700 italic">{emptyText}</span>
        ) : (
          <>
            {items.slice(0, 2).map((item, i) => (
              <div
                key={i}
                className={`text-[10px] px-1.5 py-0.5 rounded leading-tight truncate ${chipCls}`}
              >
                {item}
              </div>
            ))}
            {items.length > 2 && (
              <span className="text-[9px] font-semibold text-indigo-500 dark:text-indigo-400 pl-0.5">
                +{items.length - 2} thêm
              </span>
            )}
          </>
        )}
      </div>
    );
  };

  // ── Preview (closed) ─────────────────────────────────────────────────────
  if (!open) {
    return (
      <div
        ref={containerRef}
        className="relative flex gap-1.5 min-h-[28px] cursor-pointer group"
        onDoubleClick={() => setOpen(true)}
        title="Double-click để sửa T7 / CN"
      >
        {renderHalf("T7", satItems, satDeadline, "—")}

        {/* Vertical divider */}
        <div className="w-px self-stretch bg-slate-100 dark:bg-slate-800 shrink-0" />

        {renderHalf("CN", sunItems, sunDeadline, "—")}

        {/* Edit hint on hover */}
        <div className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-[1px]">
          <span className="text-[9px] text-slate-400 dark:text-slate-500 italic">dbl-click</span>
        </div>
      </div>
    );
  }

  // ── Edit popup ───────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      <div className="absolute z-50 top-0 left-1/2 -translate-x-1/2 w-[340px] bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl shadow-slate-950/60 text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-200">Cuối tuần</span>
            <span className="text-[10px] text-slate-500 font-mono">T7 · CN</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Two-column editors */}
        <div className="grid grid-cols-2 divide-x divide-slate-800">
          <div className="p-3">
            <WeekendMiniEditor
              label="Thứ 7"
              dayKey="sat"
              cell={satCell}
              isDeadline={satDeadline}
              onPersist={onSatChange}
            />
          </div>
          <div className="p-3">
            <WeekendMiniEditor
              label="Chủ Nhật"
              dayKey="sun"
              cell={sunCell}
              isDeadline={sunDeadline}
              onPersist={onSunChange}
            />
          </div>
        </div>

        <div className="px-4 pb-2.5">
          <p className="text-[9px] text-slate-600">
            <kbd className="font-mono bg-slate-800 px-1 rounded text-slate-500">Enter</kbd> thêm &nbsp;·&nbsp;
            <kbd className="font-mono bg-slate-800 px-1 rounded text-slate-500">⌫</kbd> xóa cuối
          </p>
        </div>
      </div>
      <div className="min-h-[28px]" />
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
function BreakRow({ row, provided, colCount }: { row: TimetableRow; provided: DraggableProvided; colCount: number }) {
  return (
    <tr
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className="border-b border-slate-100 dark:border-slate-800/60"
    >
      <td colSpan={colCount} className="px-3 py-1 bg-slate-50/80 dark:bg-slate-800/30">
        <div className="flex items-center gap-2">
          <Coffee className="w-2.5 h-2.5 text-slate-400 dark:text-slate-600 shrink-0" />
          <span className="text-[10px] text-slate-400 dark:text-slate-600 italic">{row.title || "Giải lao"}</span>
          <span className="text-[10px] text-slate-300 dark:text-slate-700 font-mono">{row.start_time} – {row.end_time}</span>
          <span className="text-[10px] text-slate-300 dark:text-slate-700">({rowDuration(row)} phút)</span>
        </div>
      </td>
    </tr>
  );
}

// ─── Main TimetableTableRow ───────────────────────────────────────────────────
function TimetableTableRow({
  row, provided, snapshot, onDelete, onCellChange, onTitleChange, onTimeChange, visibleCols, showWeekend,
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

  return (
    <tr
      ref={provided.innerRef}
      {...provided.draggableProps}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={[
        "border-b border-slate-100 dark:border-slate-800 group transition-colors",
        isDragging
          ? "shadow-xl ring-2 ring-indigo-300 dark:ring-indigo-700 opacity-95 bg-white dark:bg-slate-900"
          : "bg-white dark:bg-slate-900",
        !isDragging && !isLocked ? "hover:bg-slate-50/70 dark:hover:bg-slate-800/20" : "",
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

      {/* Time (sticky) */}
      <td className="sticky left-7 z-10 bg-inherit border-r border-slate-100 dark:border-slate-800 w-[88px] px-2 py-2 align-middle">
        <div className="flex flex-col gap-0.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">
          <div>{row.start_time}</div>
          <div className="h-px w-full bg-slate-100 dark:bg-slate-800 my-0.5" />
          <div>{row.end_time}</div>
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

      {/* Notes (sticky) */}
      {visibleCols.includes("notes") && (
        <td className="sticky left-[223px] z-10 bg-inherit border-r border-slate-100 dark:border-slate-800 w-32 px-2 py-1.5 align-top">
          <NoteCell row={row} />
        </td>
      )}

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
            onSatChange={(items) => onCellChange(row.id, "sat", items)}
            onSunChange={(items) => onCellChange(row.id, "sun", items)}
          />
        </td>
      )}

      {/* Delete / Edit */}
      <td className="w-10 px-0.5 align-middle text-center">
        {!isLocked && (
          <div className={`flex items-center justify-center gap-1 transition-opacity ${hovered ? "opacity-100" : "opacity-0"}`}>
            <button
              onClick={() => {
                // We dispatch a custom event to open the modal from the parent
                window.dispatchEvent(new CustomEvent('openEditRowModal', { detail: row }));
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all"
              title="Chỉnh sửa"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
            </button>
            <button
              onClick={() => onDelete(row.id)}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
              title="Xóa hàng này"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </td>
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

  useEffect(() => {
    const handleOpenEdit = (e: any) => {
      setEditingRow(e.detail);
    };
    window.addEventListener('openEditRowModal', handleOpenEdit);
    return () => window.removeEventListener('openEditRowModal', handleOpenEdit);
  }, []);
  const saveOrderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const res = await fetch("/api/timetable");
      const data = await res.json();
      if (data.rows) setRows([...data.rows].sort((a: TimetableRow, b: TimetableRow) => a.order - b.order));
    } catch { }
    setLoadingRows(false);
  }, []);

  const handleOnboardingComplete = async (newConfig: any, generatedRows: any[]) => {
    setConfig(newConfig);
    setRows([...generatedRows].sort((a, b) => a.order - b.order));
    setShowOnboarding(false);
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

  const validateAndSave = async () => {
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

    const payload = {
      rows: rows.map((r) => ({
        id: r.id, title: r.title, row_type: r.row_type,
        start_time: r.start_time, end_time: r.end_time,
        is_locked: r.is_locked, order: r.order,
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
      if (!res.ok) { const err = await res.json(); toast.error(err.error ?? "Lưu thất bại."); return; }
      const data = await res.json();
      setRows([...data.rows].sort((a: TimetableRow, b: TimetableRow) => a.order - b.order));
      toast.success("Đã lưu thời khóa biểu! 💾");
    } catch { toast.error("Không thể kết nối server. Vui lòng thử lại."); }
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
      fetchRows();
    } catch {
      toast.error("Không thể cập nhật công việc.");
    }
  };

  const handleDeleteRow = async (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (row?.is_locked) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    try {
      const res = await fetch(`/api/timetable/rows/${id}`, { method: "DELETE" });
      if (!res.ok) { fetchRows(); toast.error("Xóa thất bại."); }
    } catch { fetchRows(); toast.error("Xóa thất bại."); }
  };

  const handleCellChange = (rowId: string, colKey: string, items: string[]) => {
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
    setRows((prev) => prev.map((r) => r.id !== rowId ? r : { ...r, title }));
  };

  const handleTimeChange = (rowId: string, start_time: string, end_time: string) => {
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

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    const dragged = rows.find((r) => r.id === draggableId);
    if (!dragged || dragged.is_locked) return;

    const midIndex = rows.findIndex(r => r.row_type === "anchor_mid");
    const mRows = midIndex >= 0 ? rows.slice(0, midIndex + 1) : rows.filter(r => toMins(r.start_time) < toMins("13:30"));
    const aRows = midIndex >= 0 ? rows.slice(midIndex + 1) : rows.filter(r => toMins(r.start_time) >= toMins("13:30"));

    if (source.droppableId === "morning") mRows.splice(source.index, 1);
    else aRows.splice(source.index, 1);

    if (destination.droppableId === "morning") mRows.splice(destination.index, 0, dragged);
    else aRows.splice(destination.index, 0, dragged);

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

  // ── Derived state ─────────────────────────────────────────────────────────
  const midIndex = rows.findIndex(r => r.row_type === "anchor_mid");
  const morningRows = midIndex >= 0 ? rows.slice(0, midIndex + 1) : rows.filter(r => toMins(r.start_time) < toMins("13:30"));
  const afternoonRows = midIndex >= 0 ? rows.slice(midIndex + 1) : rows.filter(r => toMins(r.start_time) >= toMins("13:30"));
  
  const showWeekend = visibleCols.includes("weekend");
  const activeWeekdays = WEEKDAY_COLS.filter((d) => visibleCols.includes(d.key));

  // Total col count: drag + time + title + notes? + weekdays + weekend? + delete
  const totalColCount =
    1 + 1 + 1 +
    (visibleCols.includes("notes") ? 1 : 0) +
    activeWeekdays.length +
    (showWeekend ? 1 : 0) +
    1;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      {showOnboarding && !loadingConfig && (
        <TimetableOnboardingModal onComplete={handleOnboardingComplete} />
      )}

      <EditRowModal
        isOpen={!!editingRow}
        onClose={() => setEditingRow(null)}
        row={editingRow}
        onSave={handleEditRowSave}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
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
              onColumnsChange={(cols) => setVisibleCols(cols)}
              onSyncChange={(enabled) => setConfig((c) => c ? { ...c, sync_task_manager: enabled } : c)}
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all">
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
          <DragDropContext onDragEnd={onDragEnd}>
            <table
              className="border-collapse text-sm bg-white dark:bg-slate-900"
              style={{ width: "100%", tableLayout: "fixed" }}
            >
              {/* colgroup: pin meta widths, weekdays + weekend share the rest */}
              <colgroup>
                <col style={{ width: 28 }} />   {/* drag */}
                <col style={{ width: 88 }} />   {/* time */}
                <col style={{ width: 128 }} />  {/* title */}
                {visibleCols.includes("notes") && <col style={{ width: 128 }} />}
                {activeWeekdays.map((d) => <col key={d.key} />)}
                {/* weekend col is 1.6× a weekday col to accommodate two sub-columns */}
                {showWeekend && <col style={{ width: "13%" }} />}
                <col style={{ width: 40 }} />   {/* actions */}
              </colgroup>

              {/* ── THEAD ─────────────────────────────────────────────── */}
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800/80 border-r border-slate-200 dark:border-slate-700 w-7 px-1 py-2.5 text-center">#</th>
                  <th className="sticky left-7 z-20 bg-slate-50 dark:bg-slate-800/80 border-r border-slate-200 dark:border-slate-700 px-2 py-2.5 text-left">Khung giờ</th>
                  <th className="sticky left-[95px] z-20 bg-slate-50 dark:bg-slate-800/80 border-r border-slate-200 dark:border-slate-700 px-2 py-2.5 text-left">Công việc</th>
                  {visibleCols.includes("notes") && (
                    <th className="sticky left-[223px] z-20 bg-slate-50 dark:bg-slate-800/80 border-r border-slate-200 dark:border-slate-700 px-2 py-2.5 text-left">Ghi chú</th>
                  )}
                  {activeWeekdays.map((d) => (
                    <th key={d.key} className="border-r border-slate-200 dark:border-slate-700 px-2 py-2.5 text-center">
                      <span className="hidden sm:inline">{d.fullLabel}</span>
                      <span className="sm:hidden">{d.label}</span>
                    </th>
                  ))}
                  {/* Weekend merged header */}
                  {showWeekend && (
                    <th className="border-r border-slate-200 dark:border-slate-700 px-0 py-0 text-center last:border-r-0">
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
                  <th className="w-10 text-center" />
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
                      return (
                        <Draggable key={row.id} draggableId={row.id} index={index} isDragDisabled={row.is_locked}>
                          {(drag, snap) => (
                            isBreakRow ? (
                              <BreakRow row={row} provided={drag} colCount={totalColCount} />
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
                      return (
                        <Draggable key={row.id} draggableId={row.id} index={index} isDragDisabled={row.is_locked}>
                          {(drag, snap) => (
                            isBreakRow ? (
                              <BreakRow row={row} provided={drag} colCount={totalColCount} />
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
