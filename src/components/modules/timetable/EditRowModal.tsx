"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Trash2, Plus, ArrowRight, Link as LinkIcon, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TimetableRow } from "@/app/timetable/page";
import { useRouter } from "next/navigation";
import { useTaskStore } from "@/store/useTaskStore";

type TaskItem = { text: string; taskId: string | null };

interface EditRowModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: TimetableRow | null;
  onSave: (rowId: string, data: Record<string, unknown>, options?: { silent?: boolean }) => Promise<void>;
  onDelete: (rowId: string) => Promise<void>;
}

const AUTO_SAVE_MS = 800;

export default function EditRowModal({ isOpen, onClose, row, onSave, onDelete }: EditRowModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");

  const [dayItems, setDayItems] = useState<Record<string, TaskItem[]>>({});
  const [dayInputs, setDayInputs] = useState<Record<string, string>>({});

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const skipAutoSave = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (isOpen && row) {
      setTitle(row.title || "");
      setStartTime(row.start_time || "");
      setEndTime(row.end_time || "");

      const notesCell = row.cells?.find(c => c.column_name === "notes");
      setNotes(Array.isArray(notesCell?.content) ? notesCell.content.join("\n") : "");

      const newDayItems: Record<string, TaskItem[]> = {};
      ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].forEach(day => {
        const cell = row.cells?.find(c => c.column_name === day);
        const contents = Array.isArray(cell?.content) ? cell.content as string[] : [];
        const taskIds = Array.isArray(cell?.task_ids) ? cell.task_ids as string[] : [];
        newDayItems[day] = contents.map((text, i) => ({ text, taskId: taskIds[i] || null }));
      });
      setDayItems(newDayItems);
      setDayInputs({});
      setSaveStatus("idle");
      skipAutoSave.current = true;
      setTimeout(() => { skipAutoSave.current = false; }, 150);
    }
  }, [isOpen, row]);

  const buildPayload = useCallback(() => {
    const parsedDayContents: Record<string, string[]> = {};
    const parsedDayTaskIds: Record<string, string[]> = {};

    Object.entries(dayItems).forEach(([day, items]) => {
      parsedDayContents[day] = items.map(i => i.text);
      parsedDayTaskIds[day] = items.map(i => i.taskId || "");
    });

    return {
      title,
      start_time: startTime,
      end_time: endTime,
      notes: notes.split("\n").map(t => t.trim()).filter(t => t),
      cells: parsedDayContents,
      taskIds: parsedDayTaskIds,
    };
  }, [title, startTime, endTime, notes, dayItems]);

  const persist = useCallback(async (silent = true) => {
    if (!row || !title.trim() || !startTime || !endTime) return;

    setSaveStatus("saving");
    try {
      const promise = onSave(row.id, buildPayload(), { silent });
      pendingSave.current = promise;
      await promise;
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    } finally {
      pendingSave.current = null;
    }
  }, [row, title, startTime, endTime, buildPayload, onSave]);

  // Debounced auto-save
  useEffect(() => {
    if (!isOpen || !row || skipAutoSave.current) return;
    if (!title.trim() || !startTime || !endTime) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persist(true);
    }, AUTO_SAVE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [title, startTime, endTime, notes, dayItems, isOpen, row, persist]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleClose = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (pendingSave.current) {
      await pendingSave.current.catch(() => {});
    } else if (isOpen && row && !skipAutoSave.current && title.trim() && startTime && endTime) {
      await persist(true).catch(() => {});
    }
    onClose();
  };

  const handleAddItem = (day: string) => {
    const text = dayInputs[day]?.trim();
    if (!text) return;
    setDayItems(prev => ({
      ...prev,
      [day]: [{ text, taskId: null }, ...(prev[day] || [])]
    }));
    setDayInputs(prev => ({ ...prev, [day]: "" }));
  };

  const handleRemoveItem = (day: string, index: number) => {
    setDayItems(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index)
    }));
  };

  const handleUpdateItemText = (day: string, index: number, newText: string) => {
    setDayItems(prev => ({
      ...prev,
      [day]: prev[day].map((item, i) => i === index ? { ...item, text: newText } : item)
    }));
  };

  const handleOpenTask = (taskId: string) => {
    useTaskStore.getState().setSelectedTaskId(taskId);
    router.push("/tasks");
    handleClose();
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
            onClick={handleClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-full sm:w-[500px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide truncate">
                  Chỉnh sửa Công Việc
                </h2>
                {saveStatus === "saving" && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                    <Loader2 className="w-3 h-3 animate-spin" /> Đang lưu...
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 shrink-0">
                    <Check className="w-3 h-3" /> Đã lưu
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="text-[10px] text-red-500 shrink-0">Lưu thất bại</span>
                )}
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="space-y-6">

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

                  {Object.entries({ mon: "Thứ 2", tue: "Thứ 3", wed: "Thứ 4", thu: "Thứ 5", fri: "Thứ 6", sat: "Thứ 7", sun: "Chủ nhật" }).map(([dayKey, label]) => {
                    const items = dayItems[dayKey] || [];
                    return (
                      <div key={dayKey} className="space-y-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          {label}
                        </label>

                        <div className="flex flex-col gap-1.5">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 group">
                              {item.taskId ? (
                                <div
                                  onClick={() => handleOpenTask(item.taskId!)}
                                  className="flex-1 flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                  title="Chuyển đến Task Manager để xem chi tiết"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <LinkIcon className="w-3 h-3 text-indigo-500 shrink-0" />
                                    <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 truncate">
                                      {item.text}
                                    </span>
                                  </div>
                                  <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0 opacity-50 group-hover:opacity-100" />
                                </div>
                              ) : (
                                <div className="flex-1 flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0 mx-1" />
                                  <input
                                    value={item.text}
                                    onChange={(e) => handleUpdateItemText(dayKey, idx, e.target.value)}
                                    className="flex-1 min-w-0 bg-transparent text-[11px] text-slate-700 dark:text-slate-200 outline-none"
                                  />
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemoveItem(dayKey, idx)}
                                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                                title="Xóa"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <input
                            value={dayInputs[dayKey] || ""}
                            onChange={(e) => setDayInputs(prev => ({ ...prev, [dayKey]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddItem(dayKey);
                              }
                            }}
                            placeholder="Nhập công việc..."
                            className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-[11px] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddItem(dayKey)}
                            disabled={!dayInputs[dayKey]?.trim()}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 disabled:opacity-50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shrink-0"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0 flex items-center justify-between">
              <div>
                {!row.is_locked && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm("Bạn có chắc chắn muốn xóa hàng này?")) {
                        await onDelete(row.id);
                        onClose();
                      }
                    }}
                    className="px-4 py-2 flex items-center gap-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} /> Xóa hàng
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-all"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
