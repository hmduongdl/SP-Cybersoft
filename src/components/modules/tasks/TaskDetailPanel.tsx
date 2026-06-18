"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useTaskStore } from "@/store/useTaskStore";
import { X, Calendar as CalendarIcon, Tag as TagIcon, LayoutGrid } from "lucide-react";
import { clsx } from "clsx";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

export function TaskDetailPanel() {
  const { selectedTaskId, setSelectedTaskId, tasks, updateTask, updateTaskNote } = useTaskStore();
  const [isClosing, setIsClosing] = useState(false);

  const task = useMemo(() => tasks.find((t) => t.id === selectedTaskId), [tasks, selectedTaskId]);

  const editor = useCreateBlockNote({
    initialContent: task?.note?.content ? task.note.content : undefined,
  });

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedTaskId(null);
      setIsClosing(false);
    }, 300); // Wait for transition
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
    <>
      {/* Overlay */}
      <div 
        className={clsx(
          "fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity duration-300",
          isClosing ? "opacity-0" : "opacity-100"
        )}
        onClick={handleClose}
      />

      {/* Panel */}
      <div 
        className={clsx(
          "fixed top-0 right-0 h-full w-full md:w-[600px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out border-l border-slate-200",
          isClosing ? "translate-x-full" : "translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <select
              value={task.status}
              onChange={(e) => updateTask(task.id, { status: e.target.value as any })}
              className={clsx(
                "text-xs font-bold px-3 py-1.5 rounded-lg border-0 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500",
                task.status === "TODO" ? "bg-slate-100 text-slate-600" :
                task.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-700" :
                "bg-emerald-100 text-emerald-700"
              )}
            >
              <option value="TODO">Cần làm</option>
              <option value="IN_PROGRESS">Đang làm</option>
              <option value="DONE">Hoàn thành</option>
            </select>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">Task ID: {task.id.slice(0, 8)}</span>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <input 
            type="text"
            value={task.title}
            onChange={(e) => updateTask(task.id, { title: e.target.value })}
            className="w-full text-2xl font-bold text-slate-800 placeholder:text-slate-300 outline-none border-none bg-transparent"
            placeholder="Nhập tiêu đề công việc..."
          />

          {/* Properties */}
          <div className="space-y-4 rounded-xl border border-slate-100 p-4 bg-slate-50/50">
            <div className="flex items-center gap-4 text-sm">
              <div className="w-32 flex items-center gap-2 text-slate-500">
                <CalendarIcon className="w-4 h-4" />
                <span>Ngày hết hạn</span>
              </div>
              <input 
                type="date" 
                value={task.due_date ? task.due_date.split('T')[0] : ''}
                onChange={(e) => updateTask(task.id, { due_date: e.target.value })}
                className="flex-1 bg-transparent border-0 outline-none text-slate-700 focus:ring-0 p-0"
              />
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="w-32 flex items-center gap-2 text-slate-500">
                <LayoutGrid className="w-4 h-4" />
                <span>Workspace</span>
              </div>
              <span className="flex-1 font-medium text-slate-700">Workspace Hiện Tại</span>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="w-32 flex items-center gap-2 text-slate-500">
                <TagIcon className="w-4 h-4" />
                <span>Tags</span>
              </div>
              <div className="flex-1 flex flex-wrap gap-2">
                {task.tags?.map(tag => (
                  <span key={tag.id} className="px-2.5 py-1 rounded-md text-[11px] font-semibold" style={{ backgroundColor: tag.color ? `${tag.color}20` : '#e2e8f0', color: tag.color || '#475569' }}>
                    {tag.name}
                  </span>
                ))}
                <button className="px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:bg-slate-200 transition-colors bg-slate-100">
                  + Thêm tag
                </button>
              </div>
            </div>
          </div>

          {/* BlockNote Editor */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700">Ghi chú & Nội dung</h3>
              <button 
                onClick={handleSaveNote}
                className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                Lưu & Đồng bộ AI
              </button>
            </div>
            <div className="-mx-12">
              <BlockNoteView editor={editor} theme="light" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
