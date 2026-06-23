import React, { useState } from "react";
import {
  Type,
  Hash,
  List,
  Layers,
  Calendar,
  CheckSquare,
  Link as LinkIcon,
  Mail,
  Phone,
} from "lucide-react";

export type PropertyType =
  | "TEXT"
  | "NUMBER"
  | "SELECT"
  | "MULTI_SELECT"
  | "DATE"
  | "CHECKBOX"
  | "URL"
  | "EMAIL"
  | "PHONE";

export interface CustomPropertyDefinition {
  id: string;
  name: string;
  type: PropertyType;
  options?: string[]; // Used for SELECT and MULTI_SELECT
}

interface PropertyRowProps {
  property: CustomPropertyDefinition;
  value: any;
  onChange: (newValue: any) => void;
}

const getTypeIcon = (type: PropertyType) => {
  switch (type) {
    case "TEXT":
      return <Type className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    case "NUMBER":
      return <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    case "SELECT":
      return <List className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    case "MULTI_SELECT":
      return <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    case "DATE":
      return <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    case "CHECKBOX":
      return <CheckSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    case "URL":
      return <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    case "EMAIL":
      return <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    case "PHONE":
      return <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    default:
      return <Type className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  }
};

export const PropertyRow: React.FC<PropertyRowProps> = ({
  property,
  value,
  onChange,
}) => {
  const renderInput = () => {
    const inputClasses =
      "w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-slate-300 focus:outline-none focus:bg-white transition-all rounded px-2 py-1 text-xs text-slate-700 min-h-[28px]";

    switch (property.type) {
      case "TEXT":
      case "URL":
      case "EMAIL":
      case "PHONE":
        let inputType = "text";
        if (property.type === "URL") inputType = "url";
        if (property.type === "EMAIL") inputType = "email";
        if (property.type === "PHONE") inputType = "tel";

        return (
          <input
            type={inputType}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputClasses}
            placeholder="Trống"
          />
        );

      case "NUMBER":
        return (
          <input
            type="number"
            value={value !== undefined && value !== null ? value : ""}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val === "" ? null : Number(val));
            }}
            className={inputClasses}
            placeholder="Trống"
          />
        );

      case "CHECKBOX":
        return (
          <div className="flex items-center px-2 min-h-[28px]">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-slate-700 focus:ring-0 cursor-pointer"
            />
          </div>
        );

      case "DATE":
        return (
          <input
            type="date"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClasses} cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100`}
          />
        );

      case "SELECT":
        return (
          <div className="relative w-full">
            <select
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              className={`${inputClasses} appearance-none cursor-pointer pr-6`}
            >
              <option value="" className="text-slate-400">
                Trống
              </option>
              {property.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        );

      case "MULTI_SELECT":
        // For simplicity, mimicking a text input that takes comma separated values
        // A true notion-style multi-select would use a custom popover with badges.
        return (
          <input
            type="text"
            value={Array.isArray(value) ? value.join(", ") : value || ""}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val ? val.split(",").map((s) => s.trim()) : []);
            }}
            className={inputClasses}
            placeholder="Tách bằng dấu phẩy..."
          />
        );

      default:
        return <div className="px-2 text-slate-400">Unsupported type</div>;
    }
  };

  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-4 py-1 text-xs text-slate-700 hover:bg-slate-50/50 rounded-md transition-colors group">
      {/* Cột trái: Icon + Tên */}
      <div className="flex items-center gap-2 px-1 text-slate-500 group-hover:text-slate-600 transition-colors">
        {getTypeIcon(property.type)}
        <span className="truncate flex-1 select-none">{property.name}</span>
      </div>

      {/* Cột phải: Input */}
      <div className="flex-1 w-full max-w-[300px]">
        {renderInput()}
      </div>
    </div>
  );
};
