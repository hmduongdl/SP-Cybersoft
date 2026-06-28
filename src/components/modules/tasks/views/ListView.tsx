"use client";

import React, { useState, useMemo } from "react";
import { useTaskStore, TaskStatus } from "@/store/useTaskStore";
import { useFilteredTasks } from "@/hooks/useFilteredTasks";
import { Check, Minus, Pencil } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn, safeParseISO } from "@/lib/utils";
import { isPast, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_MAP = {
  TODO:        { label: 'Cần làm',  bg: '#f2f3ff', color: '#44495a' },
  IN_PROGRESS: { label: 'Đang làm', bg: '#fff3cd', color: '#b45309' },
  DONE:        { label: 'Xong',     bg: '#d5f8e8', color: '#0d5c34' },
};

function StatusBadge({ status }: { status: TaskStatus }) {
  const s = STATUS_MAP[status] || STATUS_MAP.TODO;
  return (
    <span
      className="text-[9px] font-semibold px-2.5 py-1 rounded-full inline-block text-center w-[80px]"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export function ListView() {
  const updateTask = useTaskStore(s => s.updateTask);
  const setSelectedTaskId = useTaskStore(s => s.setSelectedTaskId);
  const activeFilter = useTaskStore(s => s.activeFilter);
  const taskTotal = useTaskStore(s => s.taskTotal);
  const isLoadingMore = useTaskStore(s => s.isLoadingMore);
  const loadMoreTasks = useTaskStore(s => s.loadMoreTasks);

  const tasks = useFilteredTasks();

  const sortedTasks = useMemo(() => {
    // Schwartzian transform: pre-compute values to avoid expensive Date parsing in the sort loop
    const mapped = tasks.map(task => {
      const createdTime = task.createdAt ? new Date(task.createdAt).getTime() : 0;
      // Using toDateString() as a cache key for the day of creation
      const createdDay = task.createdAt ? new Date(task.createdAt).toDateString() : "";
      const dueTime = task.due_date ? new Date(task.due_date).getTime() : Infinity;
      return {
        task,
        isDone: task.status === 'DONE',
        createdTime,
        createdDay,
        dueTime,
      };
    });

    mapped.sort((a, b) => {
      // 1. DONE task goes to bottom
      if (a.isDone && !b.isDone) return 1;
      if (!a.isDone && b.isDone) return -1;

      // 2. Same day -> closest due date first
      if (a.createdDay === b.createdDay) {
        if (a.dueTime !== b.dueTime) {
          return a.dueTime - b.dueTime;
        }
      }

      // 3. Newest added first
      return b.createdTime - a.createdTime;
    });

    return mapped.map(item => item.task);
  }, [tasks]);

  const cycleStatus = (task: any) => {
    let nextStatus: TaskStatus = "TODO";
    if (task.status === "TODO") nextStatus = "IN_PROGRESS";
    else if (task.status === "IN_PROGRESS") nextStatus = "DONE";
    else nextStatus = "TODO";
    updateTask(task.id, { status: nextStatus });
  };

  const openEdit = (task: any) => {
    setSelectedTaskId(task.id);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="bg-surface-mid dark:bg-slate-900 rounded-2xl overflow-y-auto flex-1 min-h-0 shadow-ambient dark:shadow-none border border-transparent dark:border-slate-800 font-inter mt-2">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] px-5 py-3 bg-surface-low dark:bg-slate-900 border-b border-transparent dark:border-slate-800 select-none items-center">
          {['TIÊU ĐỀ', 'THẺ TAG', 'HẠN CHÓT', 'TRẠNG THÁI', ''].map(h => (
            <span 
              key={h} 
              className="text-[9px] font-semibold tracking-[.08em] uppercase text-on-muted dark:text-slate-400"
            >
              {h}
            </span>
          ))}
        </div>

        <div className="flex flex-col">
          <AnimatePresence mode="popLayout">
            {sortedTasks.map(task => {
              const isDone = task.status === 'DONE';
              const dueDate = safeParseISO(task.due_date);
              const hasDueDate = !!dueDate;
              const isOverdue = hasDueDate && isPast(dueDate) && !isDone;
              const displayTag = (task as any).tag || (task.tags && task.tags.length > 0 ? task.tags[0] : null);
              const rowBgClass = 
                task.status === 'IN_PROGRESS' ? 'bg-amber-50/30 hover:bg-amber-50/60 dark:bg-amber-900/10 dark:hover:bg-amber-900/20' :
                task.status === 'DONE' ? 'bg-emerald-50/30 hover:bg-emerald-50/60 dark:bg-emerald-900/10 dark:hover:bg-emerald-900/20' :
                'hover:bg-surface-low dark:hover:bg-slate-800/50';

              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={task.status}
                  exit={{ opacity: 0, scale: 0.95 }}
                  variants={{
                    TODO: { scale: [1, 1.015, 1], opacity: 1 },
                    IN_PROGRESS: { scale: [1, 1.015, 1], opacity: 1 },
                    DONE: { scale: [1, 1.015, 1], opacity: 1 }
                  }}
                  transition={{ 
                    layout: { type: "spring", bounce: 0.35, duration: 0.6 },
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.3, ease: "easeInOut" }
                  }}
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={cn("grid grid-cols-[2fr_1fr_1fr_1fr_40px] px-5 py-4 transition-colors duration-300 cursor-pointer items-center group", rowBgClass)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={e => { e.stopPropagation(); cycleStatus(task); }}
                    className={cn(
                      "w-5 h-5 rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors duration-300 cursor-pointer",
                      isDone
                        ? "bg-success-bg border-success-text"
                        : task.status === 'IN_PROGRESS'
                        ? "bg-amber-100 border-amber-500 dark:bg-amber-900/40 dark:border-amber-500"
                        : "border-outline dark:border-slate-600 hover:border-primary dark:hover:border-indigo-400"
                    )}
                  >
                    <AnimatePresence mode="wait">
                      {isDone ? (
                        <motion.div
                          key="done"
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center justify-center"
                        >
                          <Check size={11} className="text-success-text stroke-[3]" />
                        </motion.div>
                      ) : task.status === 'IN_PROGRESS' ? (
                        <motion.div
                          key="progress"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center justify-center"
                        >
                          <Minus size={11} className="text-amber-600 dark:text-amber-400 stroke-[3]" />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </button>
                  {task.assignees && task.assignees.length > 0 ? (
                    <div className="flex items-center -space-x-2">
                      {task.assignees.slice(0, 2).map(a => (
                        <UserAvatar key={a.id} src={a.avatar_url} name={a.name} className="!w-6 !h-6 !text-[9px]" />
                      ))}
                      {task.assignees.length > 2 && (
                        <span className="text-[10px] text-slate-500 ml-1 font-medium">+{task.assignees.length - 2}</span>
                      )}
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-dashed border-slate-300 dark:border-slate-600 flex-shrink-0" />
                  )}
                  <span className={cn(
                    "text-[13px] text-on-surface dark:text-white truncate",
                    isDone && "line-through text-on-muted dark:text-slate-500"
                  )}>
                    {task.title}
                  </span>
                </div>

                <div>
                  {displayTag && (
                    <span 
                      className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${displayTag.color}22` || "#6b728022", color: displayTag.color || "#6b7280" }}
                    >
                      {displayTag.name}
                    </span>
                  )}
                </div>

                <span className={cn(
                  "text-[12px]",
                  hasDueDate && isOverdue ? "text-error-text dark:text-red-400" : "text-on-muted dark:text-slate-400"
                )}>
                  {dueDate ? format(dueDate, 'dd/MM/yyyy') : '—'}
                </span>

                <div>
                  <StatusBadge status={task.status} />
                </div>

                <button 
                  onClick={e => { e.stopPropagation(); openEdit(task); }}
                  className="text-on-muted hover:text-on-surface dark:text-slate-500 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer p-1 rounded-xl hover:bg-surface-high dark:hover:bg-slate-800"
                >
                  <Pencil size={13} />
                </button>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>

        {sortedTasks.length > 0 && sortedTasks.length < taskTotal && (
          <div className="flex justify-center py-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={loadMoreTasks}
              disabled={isLoadingMore}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-[#0050cb] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoadingMore ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[#0050cb] border-t-transparent rounded-full animate-spin" />
                  Đang tải...
                </>
              ) : (
                <>
                  <span>Tải thêm</span>
                  <span className="text-on-muted font-normal">
                    ({sortedTasks.length}/{taskTotal})
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
