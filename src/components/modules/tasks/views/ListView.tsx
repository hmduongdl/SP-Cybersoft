"use client";

import React from "react";
import { useTaskStore, TaskStatus } from "@/store/useTaskStore";
import { Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPast, parseISO, format } from "date-fns";

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
  const { 
    tasks: allTasks, 
    currentWorkspaceId,
    filterStatus,
    updateTask, 
    setSelectedTaskId 
  } = useTaskStore();

  // Filter tasks based on current workspace and selected filter
  const tasks = allTasks.filter(t => {
    if (t.workspace_id !== currentWorkspaceId) return false;
    
    if (filterStatus === 'today') {
      if (!t.due_date) return false;
      const todayStr = new Date().toISOString().split('T')[0];
      return t.due_date.startsWith(todayStr);
    }
    
    if (filterStatus === 'upcoming') {
      if (!t.due_date) return true;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return new Date(t.due_date) >= todayStart;
    }
    
    return true;
  });

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
    <div className="bg-white rounded-2xl overflow-hidden shadow-ambient font-inter">
      
      {/* Table header */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] px-5 py-3 bg-surface-low select-none items-center">
        {['TIÊU ĐỀ', 'THẺ TAG', 'HẠN CHÓT', 'TRẠNG THÁI', ''].map(h => (
          <span 
            key={h} 
            className="text-[9px] font-semibold tracking-[.08em] uppercase text-on-muted"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows — NO dividers, spacing only */}
      <div className="flex flex-col">
        {tasks.map(task => {
          const isDone = task.status === 'DONE';
          const hasDueDate = !!task.due_date;
          const isOverdue = hasDueDate && isPast(parseISO(task.due_date!)) && !isDone;
          
          // Support both tag object format and tags array format
          const displayTag = (task as any).tag || (task.tags && task.tags.length > 0 ? task.tags[0] : null);

          return (
            <div 
              key={task.id}
              onClick={() => setSelectedTaskId(task.id)}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] px-5 py-4 hover:bg-surface-low transition-colors duration-150 cursor-pointer items-center group"
            >
              
              {/* Title */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Status toggle circle */}
                <button 
                  onClick={e => { e.stopPropagation(); cycleStatus(task); }}
                  className={cn(
                    "w-5 h-5 rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer",
                    isDone
                      ? "bg-success-bg border-success-text"
                      : "border-outline hover:border-primary"
                  )}
                >
                  {isDone && <Check size={11} className="text-success-text stroke-[3]" />}
                </button>
                <span className={cn(
                  "text-[13px] text-on-surface truncate",
                  isDone && "line-through text-on-muted"
                )}>
                  {task.title}
                </span>
              </div>

              {/* Tag */}
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

              {/* Due date */}
              <span className={cn(
                "text-[12px]",
                hasDueDate && isOverdue ? "text-error-text" : "text-on-muted"
              )}>
                {task.due_date ? format(parseISO(task.due_date), 'dd/MM/yyyy') : '—'}
              </span>

              {/* Status badge */}
              <div>
                <StatusBadge status={task.status} />
              </div>

              {/* Edit */}
              <button 
                onClick={e => { e.stopPropagation(); openEdit(task); }}
                className="text-on-muted hover:text-on-surface opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer p-1 rounded-xl hover:bg-surface-high"
              >
                <Pencil size={13} />
              </button>

            </div>
          );
        })}
      </div>
    </div>
  );
}
