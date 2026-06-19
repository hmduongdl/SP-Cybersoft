"use client";

import React, { useState } from "react";
import { useTaskStore, TaskStatus } from "@/store/useTaskStore";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_MAP = {
  TODO:        { label: 'Cần làm',  bg: '#f2f3ff', color: '#44495a' },
  IN_PROGRESS: { label: 'Đang làm', bg: '#fff3cd', color: '#b45309' },
  DONE:        { label: 'Xong',     bg: '#d5f8e8', color: '#0d5c34' },
};

export function AddTaskModal() {
  const { 
    isAddTaskModalOpen, 
    setAddTaskModalOpen, 
    addTask,
    tags,
    currentWorkspaceId
  } = useTaskStore();

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [tagId, setTagId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleClose = () => {
    setAddTaskModalOpen(false);
    // Reset form
    setTitle("");
    setStatus("TODO");
    setTagId("");
    setDueDate("");
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    // Find selected tag from store to attach to task
    const selectedTag = tags.find(t => t.id === tagId);

    const newTask = {
      id: `task-${Date.now()}`,
      title,
      status,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      workspace_id: currentWorkspaceId || "ws-1",
      creator_id: "user-1",
      is_archived: false,
      tags: selectedTag ? [selectedTag] : [],
    };

    await addTask(newTask);
    handleClose();
  };

  const currentStatusConfig = STATUS_MAP[status] || STATUS_MAP.TODO;

  return (
    <AnimatePresence>
      {isAddTaskModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-on-surface/30 backdrop-blur-[4px] z-50 flex items-center justify-center p-6"
          onClick={handleClose}
        >
          {/* Modal */}
          <motion.div
            initial={{ scale: .96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: .96, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-float w-full max-w-[480px] p-6"
          >
            {/* Title input */}
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Tên công việc..."
              className="w-full font-manrope font-bold text-[20px] text-on-surface bg-transparent outline-none placeholder:text-on-muted mb-5 tracking-[-0.02em]"
            />

            {/* Meta row: status + tag + due_date */}
            <div className="flex items-center gap-2 flex-wrap mb-5">
              {/* Status selector */}
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full border-0 outline-none cursor-pointer"
                style={{ background: currentStatusConfig.bg, color: currentStatusConfig.color }}
              >
                <option value="TODO">Cần làm</option>
                <option value="IN_PROGRESS">Đang làm</option>
                <option value="DONE">Xong</option>
              </select>

              {/* Tag selector */}
              <select
                value={tagId}
                onChange={e => setTagId(e.target.value)}
                className="text-[11px] bg-surface-mid text-on-muted px-3 py-1.5 rounded-full border-0 outline-none cursor-pointer"
              >
                <option value="">+ Thêm tag</option>
                {tags.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>

              {/* Due date */}
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="text-[11px] bg-surface-mid text-on-muted px-3 py-1.5 rounded-full border-0 outline-none cursor-pointer"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-[12px] text-on-muted hover:text-on-surface transition-colors duration-150 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim()}
                className="px-5 py-2 bg-gradient-to-r from-primary to-primary-end text-white text-[12px] font-semibold rounded-xl disabled:opacity-40 transition-opacity duration-150 cursor-pointer"
              >
                Tạo task
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

