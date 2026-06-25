"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { X, Plus, AlertTriangle } from "lucide-react";

interface Props {
  cellId?: string;
  items: string[];
  isDeadline?: boolean;
  colLabel: string;
  readOnly?: boolean;
  onChange: (newItems: string[]) => void;
}

export default function CellEditor({
  cellId,
  items,
  isDeadline = false,
  colLabel,
  readOnly = false,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [localItems, setLocalItems] = useState<string[]>(items);
  const [showOverflow, setShowOverflow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overflowTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if parent items change
  useEffect(() => { setLocalItems(items); }, [items]);

  // Close on outside click
  useEffect(() => {
    if (!open && !showOverflow) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowOverflow(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, showOverflow]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (overflowTimeout.current) clearTimeout(overflowTimeout.current);
    };
  }, []);

  const persistToApi = (nextItems: string[]) => {
    if (!cellId) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        await fetch(`/api/timetable/cells/${cellId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: nextItems }),
        });
      } catch { }
    }, 700);
  };

  const push = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || localItems.includes(trimmed)) return;
    const next = [trimmed, ...localItems];
    setLocalItems(next);
    onChange(next);
    persistToApi(next);
    setInputVal("");
  };

  const remove = (idx: number) => {
    const next = localItems.filter((_, i) => i !== idx);
    setLocalItems(next);
    onChange(next);
    persistToApi(next);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputVal.trim()) { e.preventDefault(); push(inputVal); }
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Backspace" && !inputVal && localItems.length > 0) remove(0);
  };

  // ── Closed state: compact chip/pill preview ──────────────────────────────
  if (!open) {
    const emptyEl = (
      <div
        className={`min-h-[24px] flex items-center ${readOnly ? "" : "cursor-pointer group"}`}
        onDoubleClick={() => !readOnly && setOpen(true)}
        title={readOnly ? undefined : "Double-click để thêm"}
      >
        {!readOnly && (
          <span className="text-[10px] text-slate-300 dark:text-slate-700 italic group-hover:text-indigo-400 dark:group-hover:text-indigo-500 transition-colors select-none">
            + Thêm
          </span>
        )}
        {readOnly && <span className="text-[10px] text-slate-300 dark:text-slate-700 italic">—</span>}
      </div>
    );

    if (localItems.length === 0) return emptyEl;

    return (
      <div ref={containerRef} className="relative">
        <div
          className={`flex flex-col gap-1 min-h-[24px] pr-0.5 ${readOnly ? "" : "cursor-pointer"}`}
          onDoubleClick={() => !readOnly && setOpen(true)}
          title={readOnly ? undefined : "Double-click để sửa"}
        >
          {/* Deadline badge header */}
          {isDeadline && (
            <div className="flex items-center gap-1 mb-0.5 shrink-0">
              <AlertTriangle className="w-2 h-2 text-red-500 shrink-0" />
              <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide">Deadline</span>
            </div>
          )}

          {/* Bullet list */}
          <ul className="flex flex-col gap-1 mt-0.5">
            {localItems.map((item, i) => (
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
      </div>
    );
  }

  // ── Open state: inline popover editor ──────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      <div className="absolute z-50 top-0 left-0 w-60 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-xl p-2.5 space-y-2 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{colLabel}</span>
          <button
            onClick={() => setOpen(false)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Tag pills */}
        {localItems.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {localItems.map((item, i) => (
              <span
                key={i}
                className={[
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium leading-tight",
                  isDeadline
                    ? "bg-red-950/50 text-red-300 border border-red-800"
                    : "bg-slate-800 text-slate-200 border border-slate-700",
                ].join(" ")}
              >
                <span className="max-w-[120px] truncate">{item}</span>
                <button
                  onClick={() => remove(i)}
                  className="shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex items-center gap-1.5 bg-slate-900 rounded-lg px-2 py-1.5 border border-slate-800 focus-within:border-indigo-500 transition-colors">
          <input
            ref={inputRef}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Nhập rồi nhấn Enter..."
            className="flex-1 min-w-0 bg-transparent text-[11px] text-slate-200 placeholder:text-slate-500 outline-none"
          />
          <button
            onClick={() => push(inputVal)}
            disabled={!inputVal.trim()}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-indigo-500 text-white disabled:opacity-30 hover:bg-indigo-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <p className="text-[9px] text-slate-500">
          <kbd className="font-mono bg-slate-800 px-1 rounded">Enter</kbd> thêm &nbsp;·&nbsp;
          <kbd className="font-mono bg-slate-800 px-1 rounded">Esc</kbd> đóng &nbsp;·&nbsp;
          <kbd className="font-mono bg-slate-800 px-1 rounded">⌫</kbd> xóa cuối
        </p>
      </div>
      <div className="min-h-[24px]" />
    </div>
  );
}
