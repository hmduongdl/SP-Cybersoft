"use client";

import React, { useEffect, useMemo } from "react";
import { useTaskStore, TaskStatus } from "@/store/useTaskStore";
import { X, Calendar, FileText } from "lucide-react";
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
      className="text-[9px] font-semibold px-2.5 py-1 rounded-full inline-block"
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
    updateTaskNote 
  } = useTaskStore();

  const task = useMemo(() => tasks.find((t) => t.id === selectedTaskId), [tasks, selectedTaskId]);

  const editor = useCreateBlockNote({
    initialContent: task?.note?.content ? task.note.content : undefined,
  });

  // Keep editor content in sync when selected task changes
  useEffect(() => {
    if (editor && task) {
      // Re-initialize editor content if it changes
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

  const saveTask = () => {
    // Changes are saved optimistically via updateTask, can be a no-op
  };

  const loadTask = (id: string) => {
    setSelectedTaskId(id);
  };

  // Clickable citation pill rendering helper
  const renderCitation = (id: string) => (
    <button 
      onClick={() => loadTask(id)}
      className="inline-flex items-center gap-1 text-[10px] font-semibold bg-primary-container text-primary px-1.5 py-0.5 rounded-md mx-0.5 cursor-pointer hover:bg-primary-container/80 transition-colors duration-150"
    >
      <FileText size={10} /> task:{id}
    </button>
  );

  if (!selectedTaskId || !task) return null;

  const isDone = task.status === 'DONE';
  const hasDueDate = !!task.due_date;
  const isOverdue = hasDueDate && isPast(parseISO(task.due_date!)) && !isDone;
  
  // Support both tag object format and tags array format
  const displayTag = (task as any).tag || (task.tags && task.tags.length > 0 ? task.tags[0] : null);

  return (
    <AnimatePresence>
      {selectedTaskId && task && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-on-surface/20 backdrop-blur-[2px] z-40"
            onClick={handleClose}
          />

          {/* Panel - slides up from bottom, offset by 220px to leave the left sidebar visible */}
          <motion.div
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-[220px] right-0 h-[55vh] z-50 bg-white rounded-t-2xl shadow-float flex flex-col font-inter"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 rounded-full bg-outline-variant" />
            </div>

            {/* Header row */}
            <div className="px-6 pb-4 flex items-start gap-4 border-b-0 shrink-0">
              {/* Status cycle button */}
              <button 
                onClick={() => cycleStatus(task)}
                className="mt-1 flex-shrink-0 cursor-pointer"
              >
                <StatusBadge status={task.status} />
              </button>

              {/* Title (editable) */}
              <input
                value={task.title}
                onChange={e => updateTaskTitle(e.target.value)}
                onBlur={saveTask}
                className="flex-1 font-inter font-bold text-[22px] text-on-surface bg-transparent outline-none tracking-[-0.02em] placeholder:text-on-muted"
                placeholder="Tiêu đề công việc"
              />

              {/* Meta: tag + due_date + close */}
              <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                {displayTag && (
                  <span 
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full animate-in fade-in"
                    style={{ background: `${displayTag.color}22` || "#6b728022", color: displayTag.color || "#6b7280" }}
                  >
                    {displayTag.name}
                  </span>
                )}
                {hasDueDate && (
                  <span className={cn(
                    "flex items-center gap-1 text-[11px] bg-surface-low px-2.5 py-1 rounded-full",
                    isOverdue ? "text-error-text" : "text-on-muted"
                  )}>
                    <Calendar size={11} />
                    {format(parseISO(task.due_date!), 'dd/MM/yyyy')}
                  </span>
                )}
                <button 
                  onClick={handleClose}
                  className="w-7 h-7 rounded-xl bg-surface-mid flex items-center justify-center text-on-muted hover:text-on-surface cursor-pointer transition-colors duration-150"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* BlockNote editor — fills remaining height */}
            <div className="flex-1 overflow-y-auto px-6 pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-manrope text-sm font-bold text-on-surface">Ghi chú & Nội dung</h3>
                <button 
                  onClick={handleSaveNote}
                  className="text-xs font-semibold px-3 py-1.5 bg-primary-container text-primary rounded-xl hover:bg-primary-container/80 transition-colors duration-150 cursor-pointer"
                >
                  Lưu & Đồng bộ AI
                </button>
              </div>
              <div className="-mx-12">
                <BlockNoteView editor={editor} theme="light" />
              </div>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
