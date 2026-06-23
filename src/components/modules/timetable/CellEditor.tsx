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
  const [showTooltip, setShowTooltip] = useState(false);
  const [clicked, setClicked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close tooltip/clicked state when popover opens
  useEffect(() => {
    if (open) {
      setShowTooltip(false);
      setClicked(false);
    }
  }, [open]);

  // Sync if parent items change (e.g. after sync-tasks)
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  // Close on outside click (both editor and clicked tooltip)
  useEffect(() => {
    if (!open && !clicked) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (open) setOpen(false);
        if (clicked) {
          setClicked(false);
          setShowTooltip(false);
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, clicked]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    };
  }, []);

  const showTooltipWithCancel = () => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    setShowTooltip(true);
  };

  const hideTooltipWithDelay = () => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    tooltipTimeout.current = setTimeout(() => {
      if (!clicked) setShowTooltip(false);
    }, 150);
  };

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Debounced API save
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
      } catch {}
    }, 700);
  };

  const push = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || localItems.includes(trimmed)) return;
    const next = [...localItems, trimmed];
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
    if (e.key === "Enter" && inputVal.trim()) {
      e.preventDefault();
      push(inputVal);
    }
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Backspace" && !inputVal && localItems.length > 0) {
      remove(localItems.length - 1);
    }
  };

  // ── Closed state: read-only preview ─────────────────────────────────────
  if (!open) {
    if (isDeadline) {
      const hasMore = localItems.length > 2;
      return (
        <div ref={containerRef} className="relative">
          <div
            className="rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-1.5 py-1 cursor-pointer hover:brightness-95 transition-all max-h-24 overflow-hidden relative"
            onDoubleClick={() => !readOnly && setOpen(true)}
            title="Double-click để sửa"
          >
            <div className="flex items-center gap-1 mb-0.5">
              <AlertTriangle className="w-2.5 h-2.5 text-red-500 shrink-0" />
              <span className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase tracking-wide">Hạn chót</span>
            </div>
            {localItems.length > 0 && (
              <ul className="space-y-0.5">
                {(hasMore ? localItems.slice(0, 2) : localItems).map((item, i) => (
                  <li key={i} className="flex items-start gap-1 text-[11px] text-red-700 dark:text-red-300 font-medium leading-tight line-clamp-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    <span className="line-clamp-2 text-[11px] leading-tight flex-1">{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {hasMore && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextClicked = !clicked;
                  setClicked(nextClicked);
                  setShowTooltip(nextClicked);
                }}
                onMouseEnter={showTooltipWithCancel}
                onMouseLeave={hideTooltipWithDelay}
                className="mt-1 text-[10px] font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 block select-none text-left"
              >
                + {localItems.length - 2} công việc nữa
              </button>
            )}
          </div>

          {showTooltip && (
            <div
              onMouseEnter={showTooltipWithCancel}
              onMouseLeave={hideTooltipWithDelay}
              className="absolute z-[60] left-0 bottom-full mb-1 w-64 bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl shadow-2xl p-3 text-slate-100 animate-in fade-in slide-in-from-bottom-1 duration-150 pointer-events-auto"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Hạn chót ({localItems.length})
              </p>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {localItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-red-300 leading-snug">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    <span className="break-words">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (localItems.length === 0) {
      return (
        <div
          className={`min-h-[28px] flex items-center ${readOnly ? "" : "cursor-pointer group"}`}
          onDoubleClick={() => !readOnly && setOpen(true)}
          title={readOnly ? undefined : "Double-click để thêm"}
        >
          {!readOnly && (
            <span className="text-[11px] text-slate-300 dark:text-slate-600 italic group-hover:text-indigo-400 dark:group-hover:text-indigo-500 transition-colors select-none">
              + Thêm công việc
            </span>
          )}
          {readOnly && <span className="text-[11px] text-slate-300 dark:text-slate-700 italic">—</span>}
        </div>
      );
    }

    if (localItems.length === 1) {
      return (
        <div
          className={`min-h-[28px] flex items-start ${readOnly ? "" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded px-0.5 -mx-0.5 transition-colors"}`}
          onDoubleClick={() => !readOnly && setOpen(true)}
          title={readOnly ? undefined : "Double-click để sửa"}
        >
          <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug pt-0.5 line-clamp-2">
            {localItems[0]}
          </span>
        </div>
      );
    }

    const hasMore = localItems.length > 2;
    return (
      <div ref={containerRef} className="relative">
        <div
          className={`min-h-[28px] max-h-24 overflow-hidden relative cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded px-0.5 -mx-0.5 transition-colors`}
          onDoubleClick={() => !readOnly && setOpen(true)}
          title={readOnly ? undefined : "Double-click để sửa"}
        >
          <ul className="space-y-0.5">
            {(hasMore ? localItems.slice(0, 2) : localItems).map((item, i) => (
              <li key={i} className="flex items-start gap-1 text-[11px] text-slate-600 dark:text-slate-300 leading-tight line-clamp-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                <span className="line-clamp-2 text-[11px] leading-tight flex-1">{item}</span>
              </li>
            ))}
          </ul>
          {hasMore && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const nextClicked = !clicked;
                setClicked(nextClicked);
                setShowTooltip(nextClicked);
              }}
              onMouseEnter={showTooltipWithCancel}
              onMouseLeave={hideTooltipWithDelay}
              className="mt-1 text-[10px] font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 block select-none text-left"
            >
              + {localItems.length - 2} công việc nữa
            </button>
          )}
        </div>

        {showTooltip && (
          <div
            onMouseEnter={showTooltipWithCancel}
            onMouseLeave={hideTooltipWithDelay}
            className="absolute z-[60] left-0 bottom-full mb-1 w-64 bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl shadow-2xl p-3 text-slate-100 animate-in fade-in slide-in-from-bottom-1 duration-150 pointer-events-auto"
          >
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Danh sách công việc ({localItems.length})
            </p>
            <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {localItems.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-200 leading-snug">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  <span className="break-words">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ── Open state: inline popover editor ────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      {/* Mini popover panel */}
      <div className="absolute z-50 top-0 left-0 w-56 bg-slate-950/70 border border-slate-800 rounded-xl shadow-xl p-2.5 space-y-2 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            {colLabel}
          </span>
          <button
            onClick={() => setOpen(false)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Tag pills */}
        {localItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {localItems.map((item, i) => (
              <span
                key={i}
                className={[
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium leading-tight",
                  isDeadline
                    ? "bg-red-950/50 text-red-300 border border-red-800"
                    : "bg-slate-800 text-slate-200 border border-slate-700",
                ].join(" ")}
              >
                <span className="max-w-[140px] truncate">{item}</span>
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
            className="flex-1 min-w-0 bg-transparent text-[12px] text-slate-200 placeholder:text-slate-500 outline-none"
          />
          <button
            onClick={() => push(inputVal)}
            disabled={!inputVal.trim()}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-indigo-500 text-white disabled:opacity-30 hover:bg-indigo-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <p className="text-[10px] text-slate-400">
          <kbd className="font-mono bg-slate-800 px-1 rounded">Enter</kbd> thêm &nbsp;·&nbsp;
          <kbd className="font-mono bg-slate-800 px-1 rounded">Esc</kbd> đóng &nbsp;·&nbsp;
          <kbd className="font-mono bg-slate-800 px-1 rounded">⌫</kbd> xóa cuối
        </p>
      </div>

      {/* Invisible backdrop to capture click outside within same td */}
      <div className="min-h-[28px]" />
    </div>
  );
}
