"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Hash,
  Link,
  Mail,
  Phone,
  Calendar,
  CheckSquare,
  ChevronDown,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";

// ── Types ──
interface CustomPropertyDefinition {
  id: string;
  name: string;
  type: string;
  options?: string[] | null;
}

interface CustomPropertyValue {
  id?: string;
  value_text?: string | null;
  value_number?: number | null;
  value_boolean?: boolean | null;
  value_date?: string | null;
}

interface Props {
  property: CustomPropertyDefinition;
  value?: CustomPropertyValue | null;
  onChange: (newValue: any) => void;
}

// ── Icon map by type ──
const TYPE_ICONS: Record<string, React.ElementType> = {
  TEXT: Hash,
  NUMBER: Hash,
  SELECT: ChevronDown,
  MULTI_SELECT: ChevronDown,
  DATE: Calendar,
  CHECKBOX: CheckSquare,
  URL: Link,
  EMAIL: Mail,
  PHONE: Phone,
};

// ── Page filter for desktop — used by DATE picker ──
const page = (d: Date) => Math.floor(d.getTime() / (1000 * 60 * 60 * 24));

// ── Single Row Component ──
export function CustomPropertyField({ property, value, onChange }: Props) {
  const Icon = TYPE_ICONS[property.type] || Hash;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const renderInput = () => {
    switch (property.type) {
      case "TEXT":
      case "URL":
      case "EMAIL":
      case "PHONE": {
        const current = value?.value_text ?? "";
        return (
          <input
            className="w-full bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 focus:bg-slate-100 dark:focus:bg-white/5 transition-colors"
            placeholder="Chưa nhập..."
            value={current}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      }

      case "NUMBER": {
        const current = value?.value_number ?? "";
        return (
          <input
            type="number"
            className="w-full bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 focus:bg-slate-100 dark:focus:bg-white/5 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            placeholder="0"
            value={current === "" ? "" : current}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          />
        );
      }

      case "CHECKBOX": {
        const checked = value?.value_boolean ?? false;
        return (
          <button
            type="button"
            onClick={() => onChange(!checked)}
            className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
              checked
                ? "bg-primary border-primary text-white"
                : "border-slate-300 dark:border-slate-600 hover:border-primary"
            )}
          >
            {checked && <CheckSquare size={10} className="text-white" />}
          </button>
        );
      }

      case "DATE": {
        const date = value?.value_date ? new Date(value.value_date) : null;
        const [calOpen, setCalOpen] = useState(false);
        const [calMonth, setCalMonth] = useState(date || new Date());
        const calRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
          const h = (e: MouseEvent) => {
            if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false);
          };
          document.addEventListener("mousedown", h);
          return () => document.removeEventListener("mousedown", h);
        }, []);

        const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
        const firstDay = (y: number, m: number) => new Date(y, m, 1).getDay();

        const selectDay = (d: number) => {
          const picked = new Date(calMonth.getFullYear(), calMonth.getMonth(), d);
          onChange(picked.toISOString());
          setCalOpen(false);
        };

        return (
          <div className="relative" ref={calRef}>
            <button
              type="button"
              onClick={() => setCalOpen(!calOpen)}
              className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Calendar size={12} className="text-slate-400" />
              {date ? format(date, "dd/MM/yyyy") : <span className="text-slate-400">Chọn ngày</span>}
              {date && (
                <X
                  size={12}
                  className="text-slate-400 hover:text-red-500 ml-1"
                  onClick={(e) => { e.stopPropagation(); onChange(null); }}
                />
              )}
            </button>
            {calOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1))}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-xs"
                  >
                    ←
                  </button>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {format(calMonth, "MM/yyyy")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1))}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-xs"
                  >
                    →
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-0.5 text-center">
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                    <span key={d} className="text-[10px] font-medium text-slate-400 py-1">
                      {d}
                    </span>
                  ))}
                  {Array.from({ length: firstDay(calMonth.getFullYear(), calMonth.getMonth()) }, (_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth(calMonth.getFullYear(), calMonth.getMonth()) }, (_, i) => {
                    const day = i + 1;
                    const d = new Date(calMonth.getFullYear(), calMonth.getMonth(), day);
                    const sel = date && page(date) === page(d);
                    const today = page(new Date()) === page(d);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => selectDay(day)}
                        className={cn(
                          "text-xs w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                          sel && "bg-primary text-white",
                          !sel && today && "border border-primary text-primary",
                          !sel && !today && "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      }

      case "SELECT": {
        const options = (property.options as string[]) || [];
        const current = value?.value_text ?? "";
        return (
          <div className="relative">
            <select
              className="w-full bg-transparent outline-none text-slate-700 dark:text-slate-200 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 focus:bg-slate-100 dark:focus:bg-white/5 transition-colors cursor-pointer appearance-none"
              value={current}
              onChange={(e) => onChange(e.target.value)}
            >
              <option value="">Chưa chọn</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        );
      }

      case "MULTI_SELECT": {
        const options = (property.options as string[]) || [];
        let selected: string[] = [];
        try {
          const raw = value?.value_text;
          selected = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(selected)) selected = [];
        } catch {
          selected = [];
        }

        return (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1.5 flex-wrap px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              {selected.length === 0 && <span className="text-slate-400">Chưa chọn</span>}
              {selected.map((s) => (
                <span
                  key={s}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center gap-1"
                >
                  {s}
                  <X
                    size={10}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(selected.filter((x) => x !== s));
                    }}
                  />
                </span>
              ))}
            </button>
            {open && (
              <div className="absolute top-full left-0 mt-1 z-50 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5">
                {options.map((opt) => {
                  const active = selected.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        const next = active
                          ? selected.filter((x) => x !== opt)
                          : [...selected, opt];
                        onChange(next);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors",
                        active
                          ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      )}
                    >
                      <div
                        className={cn(
                          "w-3.5 h-3.5 rounded border flex items-center justify-center",
                          active
                            ? "bg-primary border-primary"
                            : "border-slate-300 dark:border-slate-600"
                        )}
                      >
                        {active && <span className="text-[8px] text-white">✓</span>}
                      </div>
                      {opt}
                    </button>
                  );
                })}
                {options.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">Không có lựa chọn</p>
                )}
              </div>
            )}
          </div>
        );
      }

      default:
        return <span className="text-slate-400 px-2 py-1">Không hỗ trợ</span>;
    }
  };

  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-4 py-1.5 text-xs text-slate-700 dark:text-slate-300">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <Icon size={13} />
        <span>{property.name}</span>
      </div>
      {renderInput()}
    </div>
  );
}
