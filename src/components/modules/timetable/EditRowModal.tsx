"use client";

import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TimetableRow } from "@/app/timetable/page";

interface EditRowModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: TimetableRow | null;
  onSave: (rowId: string, data: any) => Promise<void>;
}

export default function EditRowModal({ isOpen, onClose, row, onSave }: EditRowModalProps) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  
  // Day contents (array of strings joined by newlines for textarea)
  const [dayContents, setDayContents] = useState<Record<string, string>>({});
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && row) {
      setTitle(row.title || "");
      setStartTime(row.start_time || "");
      setEndTime(row.end_time || "");
      
      const notesCell = row.cells?.find(c => c.column_name === "notes");
      setNotes(Array.isArray(notesCell?.content) ? notesCell.content.join("\n") : "");

      const newDayContents: Record<string, string> = {};
      ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].forEach(day => {
        const cell = row.cells?.find(c => c.column_name === day);
        newDayContents[day] = Array.isArray(cell?.content) ? cell.content.join("\n") : "";
      });
      setDayContents(newDayContents);
      
      setSubmitting(false);
    }
  }, [isOpen, row]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row || !title.trim() || !startTime || !endTime) return;
    
    setSubmitting(true);
    try {
      const parsedDayContents: Record<string, string[]> = {};
      Object.entries(dayContents).forEach(([day, text]) => {
        parsedDayContents[day] = text.split("\n").map(t => t.trim()).filter(t => t);
      });

      await onSave(row.id, {
        title,
        start_time: startTime,
        end_time: endTime,
        notes: notes.split("\n").map(t => t.trim()).filter(t => t),
        cells: parsedDayContents
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDayChange = (day: string, val: string) => {
    setDayContents(prev => ({ ...prev, [day]: val }));
  };

  if (!row) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-full sm:w-[500px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Chỉnh sửa Công Việc
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <form id="edit-row-form" onSubmit={handleSubmit} className="space-y-6">
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Tên công việc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={row.is_locked}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-100 disabled:opacity-60"
                  />
                  {row.is_locked && <p className="text-[10px] text-amber-600">Đây là hàng cố định, không thể đổi tên.</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Bắt đầu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-100 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Kết thúc <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Ghi chú
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Nhập ghi chú..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                    Danh sách công việc trong tuần
                  </h3>
                  <p className="text-[10px] text-slate-500">Mỗi công việc trên một dòng.</p>
                  
                  {Object.entries({ mon: "Thứ 2", tue: "Thứ 3", wed: "Thứ 4", thu: "Thứ 5", fri: "Thứ 6", sat: "Thứ 7", sun: "Chủ nhật" }).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        {label}
                      </label>
                      <textarea
                        value={dayContents[key] || ""}
                        onChange={(e) => handleDayChange(key, e.target.value)}
                        rows={2}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-100 resize-y"
                      />
                    </div>
                  ))}
                </div>

              </form>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 bg-slate-100 dark:bg-slate-800/80 rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                form="edit-row-form"
                disabled={submitting || (!row.is_locked && !title.trim())}
                className="px-5 py-2 flex items-center gap-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? "Đang lưu..." : <><Check size={14} /> Lưu thay đổi</>}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
