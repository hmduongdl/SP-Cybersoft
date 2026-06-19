"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useTaskStore } from "@/store/useTaskStore";
import { X, Calendar as CalendarIcon, Tag as TagIcon, LayoutGrid } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

export function TaskDetailPanel() {
  const { selectedTaskId, setSelectedTaskId, tasks, updateTask, updateTaskNote } = useTaskStore();

  const task = useMemo(() => tasks.find((t) => t.id === selectedTaskId), [tasks, selectedTaskId]);

  const editor = useCreateBlockNote({
    initialContent: task?.note?.content ? task.note.content : undefined,
  });

  const handleClose = () => {
    setSelectedTaskId(null);
  };

  const handleSaveNote = async () => {
    if (editor && selectedTaskId) {
      const content = editor.document;
      await updateTaskNote(selectedTaskId, content);
      // Giả lập kích hoạt trigger RAG Vector
    }
  };

  if (!selectedTaskId || !task) return null;

  return (
    <AnimatePresence>
      {selectedTaskId && task && (
        <>
          {/* Backdrop */}
          <motion.div
            key="task-detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-on-surface/20 backdrop-blur-[2px] z-40"
            onClick={handleClose}
          />

          {/* Bottom Drawer Panel */}
          <motion.div
            key="task-detail-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 h-[50vh] bg-white rounded-t-2xl z-50 flex flex-col shadow-float"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-outline" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 shrink-0">
              <div className="flex items-center gap-3">
                <select
                  value={task.status}
                  onChange={(e) => updateTask(task.id, { status: e.target.value as any })}
                  className={clsx(
                    "text-xs font-bold px-3 py-1.5 rounded-lg border-0 outline-none cursor-pointer focus:ring-2 focus:ring-primary/30",
                    task.status === "TODO" ? "bg-surface-low text-on-muted" :
                    task.status === "IN_PROGRESS" ? "bg-warn-bg text-warn-text" :
                    "bg-success-bg text-success-text"
                  )}
                >
                  <option value="TODO">Cần làm</option>
                  <option value="IN_PROGRESS">Đang làm</option>
                  <option value="DONE">Hoàn thành</option>
                </select>
                <span className="text-outline">|</span>
                <span className="text-xs text-on-muted font-medium">Task ID: {task.id.slice(0, 8)}</span>
              </div>
              <button 
                onClick={handleClose}
                className="p-2 rounded-xl text-on-muted hover:text-on-surface hover:bg-surface-low transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
              {/* Title */}
              <input 
                type="text"
                value={task.title}
                onChange={(e) => updateTask(task.id, { title: e.target.value })}
                className="w-full text-2xl font-bold text-on-surface placeholder:text-outline outline-none border-none bg-transparent font-manrope"
                placeholder="Nhập tiêu đề công việc..."
              />

              {/* Properties */}
              <div className="space-y-4 rounded-xl p-4 bg-surface-low/50">
                <div className="flex items-center gap-4 text-sm">
                  <div className="w-32 flex items-center gap-2 text-on-muted">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Ngày hết hạn</span>
                  </div>
                  <input 
                    type="date" 
                    value={task.due_date ? task.due_date.split('T')[0] : ''}
                    onChange={(e) => updateTask(task.id, { due_date: e.target.value })}
                    className="flex-1 bg-transparent border-0 outline-none text-on-surface focus:ring-0 p-0"
                  />
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="w-32 flex items-center gap-2 text-on-muted">
                    <LayoutGrid className="w-4 h-4" />
                    <span>Workspace</span>
                  </div>
                  <span className="flex-1 font-medium text-on-surface">Workspace Hiện Tại</span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="w-32 flex items-center gap-2 text-on-muted">
                    <TagIcon className="w-4 h-4" />
                    <span>Tags</span>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-2">
                    {task.tags?.map(tag => (
                      <span key={tag.id} className="px-2.5 py-1 rounded-md text-[11px] font-semibold" style={{ backgroundColor: tag.color ? `${tag.color}20` : '#e2e8f0', color: tag.color || '#475569' }}>
                        {tag.name}
                      </span>
                    ))}
                    <button className="px-2.5 py-1 rounded-md text-[11px] font-medium text-on-muted hover:bg-surface-mid transition-colors bg-surface-low">
                      + Thêm tag
                    </button>
                  </div>
                </div>
              </div>

              {/* BlockNote Editor */}
              <div className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-on-surface">Ghi chú & Nội dung</h3>
                  <button 
                    onClick={handleSaveNote}
                    className="text-xs font-semibold px-3 py-1.5 bg-primary-container text-primary rounded-lg hover:bg-primary-container/80 transition-colors"
                  >
                    Lưu & Đồng bộ AI
                  </button>
                </div>
                <div className="-mx-12">
                  <BlockNoteView editor={editor} theme="light" />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
