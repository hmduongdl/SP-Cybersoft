"use client";

import React, { useEffect, useMemo } from "react";
import { useTaskStore, TaskStatus } from "@/store/useTaskStore";
import { X, Calendar, FileText, CheckCircle, Tag, User, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { isPast, parseISO, format } from "date-fns";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

const STATUS_MAP = {
  TODO:        { label: 'Cần làm',  bg: '#f2f3ff', color: '#44495a' },
  IN_PROGRESS: { label: 'Đang làm', bg: '#fff3cd', color: '#b45309' },
  DONE:        { label: 'Xong',     bg: '#d5f8e8', color: '#0d5c34' },
};

function StatusBadge({ status }: { status: TaskStatus }) {
  const s = STATUS_MAP[status] || STATUS_MAP.TODO;
  return (
    <span 
      className="text-[10px] font-semibold px-2.5 py-1 rounded-md inline-block cursor-pointer hover:opacity-80 transition-opacity"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export function TaskDetailPanel() {
  const { 
    selectedTaskId, 
    setSelectedTaskId, 
    tasks, 
    updateTask, 
    updateTaskNote,
    deleteTask,
    currentWorkspace
  } = useTaskStore();

  const task = useMemo(() => tasks.find((t) => t.id === selectedTaskId), [tasks, selectedTaskId]);

  const editor = useCreateBlockNote({
    initialContent: task?.note?.content ? task.note.content : undefined,
  });

  useEffect(() => {
    if (editor && task) {
      const currentContent = task.note?.content;
      if (currentContent) {
        editor.replaceBlocks(editor.document, currentContent);
      } else {
        editor.replaceBlocks(editor.document, [{ type: "paragraph", content: [] }]);
      }
    }
  }, [selectedTaskId, editor]);

  const handleClose = () => {
    setSelectedTaskId(null);
  };

  const handleSaveNote = async () => {
    if (editor && selectedTaskId) {
      const content = editor.document;
      await updateTaskNote(selectedTaskId, content);
      alert("Lưu thành công!");
      handleClose();
    }
  };

  const handleDelete = async () => {
    if (confirm("Bạn có chắc chắn muốn xóa công việc này không?")) {
      try {
        await deleteTask(selectedTaskId!);
        handleClose();
      } catch (err: any) {
        alert(err.message || "Không thể xóa công việc.");
      }
    }
  };

  const cycleStatus = (t: any) => {
    let nextStatus: TaskStatus = "TODO";
    if (t.status === "TODO") nextStatus = "IN_PROGRESS";
    else if (t.status === "IN_PROGRESS") nextStatus = "DONE";
    else nextStatus = "TODO";
    updateTask(t.id, { status: nextStatus });
  };

  const updateTaskTitle = (newTitle: string) => {
    if (task) {
      updateTask(task.id, { title: newTitle });
    }
  };

  const updateTaskDescription = (newDesc: string) => {
    if (task) {
      updateTask(task.id, { description: newDesc });
    }
  };

  const saveTask = () => {};

  if (!selectedTaskId || !task) return null;

  const isDone = task.status === 'DONE';
  const hasDueDate = !!task.due_date;
  const isOverdue = hasDueDate && isPast(parseISO(task.due_date!)) && !isDone;
  const displayTag = (task as any).tag || (task.tags && task.tags.length > 0 ? task.tags[0] : null);
  const taskWorkspaceName = useTaskStore.getState().workspaces.find(w => w.id === task.workspace_id)?.name || "Dự án chung";

  return (
    <AnimatePresence>
      {selectedTaskId && task && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/40"
            onClick={handleClose}
          />

          {/* Slide-over Panel from right */}
          <motion.div
            initial={{ x: '100%' }} 
            animate={{ x: 0 }} 
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-full sm:w-[600px] md:w-[650px] bg-white border-l border-slate-100 shadow-2xl z-50 flex flex-col font-inter"
          >
            <div className="flex-1 overflow-y-auto pt-6 pb-24 px-6 md:px-10">
              
              {/* Header Navigation */}
              <div className="flex items-center justify-between mb-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚀</span> 
                  <span className="font-semibold text-slate-700">
                    {taskWorkspaceName}
                  </span>
                </div>
                <button 
                  onClick={handleClose}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Title Input */}
              <input
                value={task.title}
                onChange={e => updateTaskTitle(e.target.value)}
                onBlur={saveTask}
                className="w-full text-2xl font-bold text-slate-900 border-none outline-none focus:ring-0 p-0 mb-2 bg-transparent placeholder:text-slate-300"
                placeholder="Nhập tiêu đề công việc..."
              />

              {/* Description Input */}
              <textarea
                value={task.description || ""}
                onChange={e => updateTaskDescription(e.target.value)}
                onBlur={saveTask}
                className="w-full text-sm text-slate-600 border-none outline-none focus:ring-0 p-0 mb-4 bg-transparent placeholder:text-slate-400 resize-none min-h-[40px]"
                placeholder="Thêm mô tả công việc (tùy chọn)..."
                rows={2}
              />

              {/* Properties Grid */}
              <div className="border-y border-slate-100 py-3 my-4 space-y-1">
                {/* Status */}
                <div className="grid grid-cols-[120px_1fr] items-center gap-4 py-1 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <CheckCircle size={14} /> Trạng thái
                  </div>
                  <div onClick={() => cycleStatus(task)}>
                    <StatusBadge status={task.status} />
                  </div>
                </div>

                {/* Due Date */}
                <div className="grid grid-cols-[120px_1fr] items-center gap-4 py-1 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar size={14} /> Ngày hết hạn
                  </div>
                  <div className={cn("text-slate-700 flex items-center gap-2 hover:bg-slate-50 px-2 py-1 rounded-md w-fit cursor-pointer", isOverdue && "text-red-600 font-semibold")}>
                    {hasDueDate ? format(parseISO(task.due_date!), 'dd/MM/yyyy') : 'Trống'}
                  </div>
                </div>

                {/* Tags */}
                <div className="grid grid-cols-[120px_1fr] items-center gap-4 py-1 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Tag size={14} /> Nhãn Tags
                  </div>
                  <div className="flex items-center gap-2">
                    {displayTag ? (
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-md" style={{ background: `${displayTag.color}22` || "#f1f5f9", color: displayTag.color || "#475569" }}>
                        {displayTag.name}
                      </span>
                    ) : (
                      <span className="text-slate-400 hover:bg-slate-50 px-2 py-1 rounded-md cursor-pointer">Trống</span>
                    )}
                  </div>
                </div>

                {/* Assignee */}
                <div className="grid grid-cols-[120px_1fr] items-center gap-4 py-1 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <User size={14} /> Người làm
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 hover:bg-slate-50 px-2 py-1 rounded-md w-fit cursor-pointer">
                    {task.creator?.avatar_url ? (
                      <img src={task.creator.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-[#d8e2ff] flex items-center justify-center text-[9px] font-semibold text-[#0050cb]">
                        {task.creator?.name ? task.creator.name.substring(0, 2).toUpperCase() : 'US'}
                      </div>
                    )}
                    <span>{task.creator?.name || 'Người dùng'}</span>
                  </div>
                </div>
              </div>

              {/* BlockNote Editor Area */}
              <div className="mt-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  📝 Ghi chú & Nội dung
                </h3>
                <div className="flex-1 min-h-[300px] text-sm text-slate-800 focus:outline-none -mx-10 mt-2">
                  <BlockNoteView editor={editor} theme="light" />
                </div>
              </div>

            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="border-t border-slate-100 p-4 bg-slate-50/80 backdrop-blur-sm shrink-0 flex items-center justify-between gap-3">
              <button 
                onClick={handleDelete}
                className="px-4 py-2 flex items-center gap-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 bg-transparent rounded-lg transition-colors"
                title="Xóa công việc này"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Xóa</span>
              </button>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleSaveNote}
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 hover:shadow transition-all"
                >
                  Lưu & Đóng
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

