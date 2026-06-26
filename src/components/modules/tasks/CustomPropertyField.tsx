"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Hash, Link, Mail, Phone, Calendar, CheckSquare, ChevronDown, X, Type, AlignLeft, Trash2 } from "lucide-react";
import { format } from "date-fns";

// ── Types ──
export interface CustomPropertyDefinition {
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
  onDelete?: () => void;
}

export const TYPE_ICONS: Record<string, React.ElementType> = {
  TEXT: AlignLeft,
  NUMBER: Hash,
  SELECT: ChevronDown,
  MULTI_SELECT: ChevronDown,
  DATE: Calendar,
  CHECKBOX: CheckSquare,
  URL: Link,
  EMAIL: Mail,
  PHONE: Phone,
};

export const TYPE_LABELS: Record<string, string> = {
  TEXT: "Văn bản",
  NUMBER: "Số",
  SELECT: "Chọn một",
  MULTI_SELECT: "Nhiều lựa chọn",
  DATE: "Ngày",
  CHECKBOX: "Hộp kiểm",
  URL: "URL",
  EMAIL: "Email",
  PHONE: "Điện thoại",
};

// ── Shared popover hook ──
function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, cb]);
}

// ── Sub-components per type ──

function TextValue({ value, placeholder = "Trống", onChange }: { value: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <input
      className="w-full bg-transparent outline-none text-on-surface placeholder:text-on-muted/50 px-2 py-1 rounded hover:bg-surface-high focus:bg-surface-high transition-colors text-xs"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function NumberValue({ value, onChange }: { value: string | number; onChange: (v: number | null) => void }) {
  return (
    <input
      type="number"
      className="w-full bg-transparent outline-none text-on-surface placeholder:text-on-muted/50 px-2 py-1 rounded hover:bg-surface-high focus:bg-surface-high transition-colors text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      placeholder="Trống"
      value={value === "" || value == null ? "" : value}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    />
  );
}

function CheckboxValue({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
        checked ? "bg-primary border-primary" : "border-outline hover:border-primary"
      )}
    >
      {checked && <CheckSquare size={9} className="text-white" strokeWidth={3} />}
    </button>
  );
}

const dayOfWeek = (y: number, m: number) => {
  const d = new Date(y, m, 1).getDay();
  return d === 0 ? 6 : d - 1; // Mon=0
};
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function DateValue({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const date = value ? new Date(value) : null;
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(date || new Date());
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClick(ref, close);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-on-surface px-2 py-1 rounded hover:bg-surface-high transition-colors text-xs"
      >
        <Calendar size={11} className="text-on-muted shrink-0" />
        {date ? format(date, "dd/MM/yyyy") : <span className="text-on-muted/60">Trống</span>}
        {date && (
          <X size={11} className="text-on-muted hover:text-error-text ml-1 shrink-0"
            onClick={(e) => { e.stopPropagation(); onChange(null); }} />
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-60 bg-surface-bright border border-outline rounded-xl shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))}
              className="p-1 hover:bg-surface-high rounded text-on-muted hover:text-on-surface transition-colors">‹</button>
            <span className="text-xs font-semibold text-on-surface">
              {format(month, "MM/yyyy")}
            </span>
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))}
              className="p-1 hover:bg-surface-high rounded text-on-muted hover:text-on-surface transition-colors">›</button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
            {["T2","T3","T4","T5","T6","T7","CN"].map(d => (
              <span key={d} className="text-[9px] font-medium text-on-muted py-0.5">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: dayOfWeek(month.getFullYear(), month.getMonth()) }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth(month.getFullYear(), month.getMonth()) }, (_, i) => {
              const day = i + 1;
              const d = new Date(month.getFullYear(), month.getMonth(), day);
              const sel = date && sameDay(date, d);
              const today = sameDay(new Date(), d);
              return (
                <button key={day} type="button"
                  onClick={() => { onChange(new Date(month.getFullYear(), month.getMonth(), day).toISOString()); setOpen(false); }}
                  className={cn(
                    "text-[11px] w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-colors",
                    sel && "bg-primary text-white font-semibold",
                    !sel && today && "border border-primary text-primary",
                    !sel && !today && "text-on-surface hover:bg-surface-high"
                  )}
                >{day}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SelectValue({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClick(ref, close);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface-high transition-colors text-xs min-w-[80px]">
        {value
          ? <span className="px-1.5 py-0.5 rounded bg-primary-container text-primary font-medium text-[10px]">{value}</span>
          : <span className="text-on-muted/60">Trống</span>
        }
        <ChevronDown size={11} className="text-on-muted ml-auto shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] bg-surface-bright border border-outline rounded-xl shadow-xl py-1 overflow-hidden">
          <button type="button" onClick={() => { onChange(""); setOpen(false); }}
            className="w-full px-3 py-1.5 text-xs text-on-muted hover:bg-surface-high transition-colors text-left">
            Trống
          </button>
          {options.map(opt => (
            <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left",
                value === opt ? "bg-primary-container text-primary font-medium" : "text-on-surface hover:bg-surface-high"
              )}>
              <span className="flex-1">{opt}</span>
              {value === opt && <span className="text-primary text-[10px]">✓</span>}
            </button>
          ))}
          {options.length === 0 && (
            <p className="px-3 py-2 text-xs text-on-muted/60 italic">Chưa có lựa chọn</p>
          )}
        </div>
      )}
    </div>
  );
}

function MultiSelectValue({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClick(ref, close);

  const toggle = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt];
    onChange(next);
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-1 flex-wrap px-2 py-1 rounded hover:bg-surface-high transition-colors min-w-[80px]">
        {selected.length === 0
          ? <span className="text-on-muted/60 text-xs">Trống</span>
          : selected.map(s => (
              <span key={s} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary-container text-primary flex items-center gap-0.5">
                {s}
                <X size={9} className="shrink-0 hover:text-error-text cursor-pointer"
                  onClick={e => { e.stopPropagation(); toggle(s); }} />
              </span>
            ))
        }
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-52 bg-surface-bright border border-outline rounded-xl shadow-xl py-1 overflow-hidden">
          {options.map(opt => {
            const active = selected.includes(opt);
            return (
              <button key={opt} type="button" onClick={() => toggle(opt)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                  active ? "bg-primary-container/60" : "hover:bg-surface-high"
                )}>
                <div className={cn(
                  "w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0",
                  active ? "bg-primary border-primary" : "border-outline"
                )}>
                  {active && <span className="text-[8px] text-white leading-none">✓</span>}
                </div>
                <span className={active ? "text-primary font-medium" : "text-on-surface"}>{opt}</span>
              </button>
            );
          })}
          {options.length === 0 && (
            <p className="px-3 py-2 text-xs text-on-muted/60 italic">Chưa có lựa chọn</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──
export function CustomPropertyField({ property, value, onChange, onDelete }: Props) {
  const Icon = TYPE_ICONS[property.type] || Type;

  const renderValue = () => {
    switch (property.type) {
      case "TEXT":
      case "URL":
      case "EMAIL":
      case "PHONE":
        return <TextValue value={value?.value_text ?? ""} onChange={onChange} />;

      case "NUMBER":
        return <NumberValue value={value?.value_number ?? ""} onChange={onChange} />;

      case "CHECKBOX":
        return <CheckboxValue checked={value?.value_boolean ?? false} onChange={onChange} />;

      case "DATE":
        return <DateValue value={value?.value_date ?? null} onChange={onChange} />;

      case "SELECT": {
        const opts = (property.options as string[]) || [];
        return <SelectValue options={opts} value={value?.value_text ?? ""} onChange={onChange} />;
      }

      case "MULTI_SELECT": {
        const opts = (property.options as string[]) || [];
        let sel: string[] = [];
        try { const raw = value?.value_text; sel = raw ? JSON.parse(raw) : []; if (!Array.isArray(sel)) sel = []; } catch { sel = []; }
        return <MultiSelectValue options={opts} selected={sel} onChange={onChange} />;
      }

      default:
        return <span className="text-on-muted/60 px-2 py-1 text-xs">—</span>;
    }
  };

  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-2 py-0.5 group">
      <div className="flex items-center gap-1.5 text-on-muted text-xs px-2 py-1 rounded hover:bg-surface-high transition-colors cursor-default">
        <Icon size={12} className="shrink-0 opacity-60" />
        <span className="truncate">{property.name}</span>
        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 hover:text-error-text rounded transition-all shrink-0"
            title="Xóa thuộc tính"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
      <div className="min-w-0">
        {renderValue()}
      </div>
    </div>
  );
}
