"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";

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
  const DEADLINE_PREFIX = "[DEADLINE] ";
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [localItems, setLocalItems] = useState<string[]>(items);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalItems(items); }, [items]);

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

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
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

  const hasItemDeadline = localItems.some((item) => item.startsWith(DEADLINE_PREFIX));
  const getItemMeta = (item: string) => {
    const markedDeadline = item.startsWith(DEADLINE_PREFIX);
    const isItemDeadline = markedDeadline || (isDeadline && !hasItemDeadline);
    const displayItem = markedDeadline ? item.slice(DEADLINE_PREFIX.length) : item;
    return { isItemDeadline, displayItem };
  };

  // ── Closed state ───────────────────────────────────────────────────────────
  if (!open) {
    if (localItems.length === 0) {
      return (
        <div
          className={`min-h-[28px] flex items-center rounded-lg ${readOnly ? "" : "cursor-pointer group hover:bg-surface-container-low/80"}`}
          onDoubleClick={() => !readOnly && setOpen(true)}
          title={readOnly ? undefined : "Double-click để thêm"}
        >
          {!readOnly && (
            <span className="text-[10px] text-on-surface-variant/40 italic group-hover:text-primary transition-colors select-none px-1">
              + Thêm
            </span>
          )}
          {readOnly && <span className="text-[10px] text-on-surface-variant/30 italic px-1">—</span>}
        </div>
      );
    }

    return (
      <div ref={containerRef} className="relative">
        <div
          className={`flex flex-col gap-1 min-h-[28px] ${readOnly ? "" : "cursor-pointer"}`}
          onDoubleClick={() => !readOnly && setOpen(true)}
          title={readOnly ? undefined : "Double-click để sửa"}
        >
          <div className="flex flex-col gap-1">
            {localItems.map((item, i) => {
              const { isItemDeadline, displayItem } = getItemMeta(item);
              return (
                <span
                  key={i}
                  className={[
                    "block text-[10.5px] leading-snug break-words rounded-md px-1.5 py-0.5 border",
                    isItemDeadline
                      ? "bg-error-bg/80 text-error-text border-error-text/15 font-medium"
                      : "bg-surface-container-low text-on-surface border-outline/30",
                  ].join(" ")}
                >
                  {displayItem}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Open state: popover editor ─────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      <div className="absolute z-50 top-0 left-0 w-64 bg-surface-container-lowest border border-outline/40 rounded-xl shadow-2xl p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{colLabel}</span>
          <button
            onClick={() => setOpen(false)}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {localItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {localItems.map((item, i) => {
              const { isItemDeadline, displayItem } = getItemMeta(item);
              return (
                <span
                  key={i}
                  className={[
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium leading-tight border",
                    isItemDeadline
                      ? "bg-error-bg text-error-text border-error-text/20"
                      : "bg-surface-container-low text-on-surface border-outline/30",
                  ].join(" ")}
                >
                  <span className="max-w-[140px] truncate">{displayItem}</span>
                  <button
                    onClick={() => remove(i)}
                    className="shrink-0 text-on-surface-variant hover:text-error-text transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-1.5 bg-surface-container-low rounded-lg px-2.5 py-2 border border-outline/30 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <input
            ref={inputRef}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Nhập rồi Enter..."
            className="flex-1 min-w-0 bg-transparent text-xs text-on-surface placeholder:text-on-surface-variant/50 outline-none"
          />
          <button
            onClick={() => push(inputVal)}
            disabled={!inputVal.trim()}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg gradient-primary text-white disabled:opacity-30 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-[9px] text-on-surface-variant/60">
          <kbd className="font-mono bg-surface-container-low px-1 rounded">Enter</kbd> thêm ·{" "}
          <kbd className="font-mono bg-surface-container-low px-1 rounded">Esc</kbd> đóng ·{" "}
          <kbd className="font-mono bg-surface-container-low px-1 rounded">⌫</kbd> xóa cuối
        </p>
      </div>
      <div className="min-h-[28px]" />
    </div>
  );
}
