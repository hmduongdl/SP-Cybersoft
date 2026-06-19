"use client";

import React, { useState } from "react";
import { X, CalendarDays, Tag, Flag, CircleDashed } from "lucide-react";
import { useTaskStore, TaskStatus } from "@/store/useTaskStore";
import { clsx } from "clsx";

export function AddTaskModal() {
  const { isAddTaskModalOpen, setAddTaskModalOpen, addTask } = useTaskStore();

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [priority, setPriority] = useState<"high" | "mid" | "low">("mid");
  const [dueDate, setDueDate] = useState("");

  if (!isAddTaskModalOpen) return null;

  const handleClose = () => {
    setAddTaskModalOpen(false);
    // Reset form
    setTitle("");
    setStatus("TODO");
    setPriority("mid");
    setDueDate("");
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    const newTask = {
      id: `task-${Date.now()}`,
      title,
      status,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      workspace_id: "ws-1",
      creator_id: "user-1",
      is_archived: false,
    };

    await addTask(newTask);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#131b2e]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in font-inter">
      <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-ambient max-w-2xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header - minimal like Notion */}
        <div className="flex justify-end p-4 pb-0">
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-surface-low text-on-muted hover:text-on-surface rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-8 pb-4 flex flex-col gap-6 overflow-y-auto">
          {/* Title Input */}
          <input
            type="text"
            placeholder="Tên công việc không có tiêu đề"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-3xl font-bold font-manrope text-on-surface placeholder:text-outline-variant border-none outline-none bg-transparent"
            autoFocus
          />

          {/* Properties - Notion Style Table/List */}
          <div className="flex flex-col gap-3">
            {/* Status Property */}
            <div className="flex items-center gap-4 group">
              <div className="w-[120px] shrink-0 flex items-center gap-1.5 text-sm text-on-muted">
                <CircleDashed className="w-4 h-4 text-outline/60" />
                <span>Trạng thái</span>
              </div>
              <div className="flex-1">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="bg-transparent hover:bg-surface-low border border-transparent hover:border-outline-variant rounded-md px-2 py-1 text-sm font-medium outline-none transition-colors w-auto cursor-pointer"
                >
                  <option value="TODO">Cần làm</option>
                  <option value="IN_PROGRESS">Đang làm</option>
                  <option value="DONE">Hoàn thành</option>
                </select>
              </div>
            </div>

            {/* Priority Property */}
            <div className="flex items-center gap-4 group">
              <div className="w-[120px] shrink-0 flex items-center gap-1.5 text-sm text-on-muted">
                <Flag className="w-4 h-4 text-outline/60" />
                <span>Độ ưu tiên</span>
              </div>
              <div className="flex-1">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="bg-transparent hover:bg-surface-low border border-transparent hover:border-outline-variant rounded-md px-2 py-1 text-sm font-medium outline-none transition-colors w-auto cursor-pointer"
                >
                  <option value="high">Cao</option>
                  <option value="mid">Trung bình</option>
                  <option value="low">Thấp</option>
                </select>
              </div>
            </div>

            {/* Due Date Property */}
            <div className="flex items-center gap-4 group">
              <div className="w-[120px] shrink-0 flex items-center gap-1.5 text-sm text-on-muted">
                <CalendarDays className="w-4 h-4 text-outline/60" />
                <span>Hạn chót</span>
              </div>
              <div className="flex-1">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-transparent hover:bg-surface-low border border-transparent hover:border-outline-variant rounded-md px-2 py-1 text-sm font-medium outline-none transition-colors cursor-pointer text-on-surface"
                />
              </div>
            </div>

            {/* Tags Property */}
            <div className="flex items-center gap-4 group">
              <div className="w-[120px] shrink-0 flex items-center gap-1.5 text-sm text-on-muted">
                <Tag className="w-4 h-4 text-outline/60" />
                <span>Thẻ tag</span>
              </div>
              <div className="flex-1">
                <div className="text-sm text-on-muted/60 italic px-2 py-1">
                  Trống
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-outline-variant/30 my-2" />

          {/* Note / Description placeholder */}
          <textarea
            placeholder="Thêm mô tả chi tiết công việc..."
            className="w-full min-h-[120px] text-sm text-on-surface placeholder:text-on-muted/50 border-none outline-none resize-none bg-transparent"
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/30 flex items-center justify-end gap-3 mt-auto bg-surface-low/50 rounded-b-3xl">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold text-on-muted hover:bg-surface-mid rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className={clsx(
              "px-5 py-2 text-sm font-semibold rounded-xl shadow-sm transition-all",
              title.trim() 
                ? "bg-primary hover:bg-primary/90 text-white" 
                : "bg-surface-mid text-on-muted/40 cursor-not-allowed"
            )}
          >
            Tạo công việc
          </button>
        </div>

      </div>
    </div>
  );
}
