"use client";

import { useState, useMemo } from "react";
import { twMerge } from "tailwind-merge";

const DAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const HOURS = Array.from({ length: 14 }, (_, i) => `${i + 7}:00`);

interface ScheduleEntry {
  id: string;
  title: string;
  day: number;
  startHour: number;
  duration: number;
  color: string;
}

const COLORS = [
  "bg-blue-100 border-blue-300 text-blue-800",
  "bg-green-100 border-green-300 text-green-800",
  "bg-purple-100 border-purple-300 text-purple-800",
  "bg-orange-100 border-orange-300 text-orange-800",
  "bg-pink-100 border-pink-300 text-pink-800",
  "bg-teal-100 border-teal-300 text-teal-800",
];

export default function TimetablePage() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    day: 0,
    startHour: 7,
    duration: 1,
  });

  const addEntry = () => {
    if (!form.title.trim()) return;
    setEntries((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: form.title,
        day: form.day,
        startHour: form.startHour,
        duration: form.duration,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      },
    ]);
    setForm({ title: "", day: 0, startHour: 7, duration: 1 });
    setShowForm(false);
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const getEntryStyle = (entry: ScheduleEntry) => {
    const top = (entry.startHour - 7) * 64;
    const height = entry.duration * 64;
    return { top: `${top}px`, height: `${height}px` };
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Thời gian biểu</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? "Đóng" : "+ Thêm mới"}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-white rounded-lg border shadow-sm flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Tiêu đề</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="border rounded px-3 py-1.5 text-sm w-48"
              placeholder="Nhập tiêu đề..."
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Ngày</label>
            <select
              value={form.day}
              onChange={(e) => setForm((f) => ({ ...f, day: +e.target.value }))}
              className="border rounded px-3 py-1.5 text-sm"
            >
              {DAYS.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Bắt đầu</label>
            <select
              value={form.startHour}
              onChange={(e) => setForm((f) => ({ ...f, startHour: +e.target.value }))}
              className="border rounded px-3 py-1.5 text-sm"
            >
              {Array.from({ length: 14 }, (_, i) => (
                <option key={i} value={i + 7}>{i + 7}:00</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Số tiết</label>
            <select
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: +e.target.value }))}
              className="border rounded px-3 py-1.5 text-sm"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n} tiết</option>
              ))}
            </select>
          </div>
          <button
            onClick={addEntry}
            className="px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
          >
            Lưu
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto border rounded-lg bg-white">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[800px]">
          {/* Header row */}
          <div className="border-b border-r bg-gray-50" />
          {DAYS.map((day) => (
            <div
              key={day}
              className="border-b border-r bg-gray-50 px-2 py-2 text-center text-sm font-semibold text-gray-600"
            >
              {day}
            </div>
          ))}

          {/* Time slots */}
          {HOURS.map((hour, idx) => (
            <div key={hour} className="contents">
              <div className="border-b border-r px-2 py-3 text-xs text-gray-400 text-right pr-2">
                {hour}
              </div>
              {DAYS.map((_, dayIdx) => (
                <div
                  key={dayIdx}
                  className="border-b border-r relative"
                  style={{ height: "64px" }}
                />
              ))}
            </div>
          ))}

          {/* Entries overlay */}
          {DAYS.map((_, dayIdx) => (
            <div key={dayIdx} className="contents">
              {entries
                .filter((e) => e.day === dayIdx)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className={twMerge(
                      "absolute left-0 right-0 mx-0.5 rounded border px-2 py-1 text-xs cursor-pointer hover:opacity-80 transition-opacity overflow-hidden",
                      entry.color
                    )}
                    style={{
                      ...getEntryStyle(entry),
                      gridColumn: dayIdx + 2,
                      gridRow: "auto",
                      zIndex: 10,
                    }}
                    onClick={() => removeEntry(entry.id)}
                    title="Click để xoá"
                  >
                    <div className="font-medium truncate">{entry.title}</div>
                    <div className="opacity-70">
                      {entry.startHour}:00 - {entry.startHour + entry.duration}:00
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>

        {entries.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            Chưa có mục nào. Nhấn &quot;+ Thêm mới&quot; để tạo thời gian biểu.
          </div>
        )}
      </div>
    </div>
  );
}
