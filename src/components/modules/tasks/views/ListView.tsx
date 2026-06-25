"use client";

import React, { useState, useMemo } from "react";
import { useTaskStore, TaskStatus } from "@/store/useTaskStore";
import { useSession } from "next-auth/react";
import { Check, Minus, Pencil } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
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
  const { data: session } = useSession();
  const updateTask = useTaskStore(s => s.updateTask);
  const setSelectedTaskId = useTaskStore(s => s.setSelectedTaskId);
  const timeFilter = useTaskStore(s => s.timeFilter);
  const taskTotal = useTaskStore(s => s.taskTotal);
  const isLoadingMore = useTaskStore(s => s.isLoadingMore);
  const loadMoreTasks = useTaskStore(s => s.loadMoreTasks);
  const getFilteredTasks = useTaskStore(s => s.getFilteredTasks);

  const [sortOption, setSortOption] = useState("newest");
  const currentUserId = session?.user?.id;

  const tasks = useMemo(() => {
    return getFilteredTasks(currentUserId);
  }, [getFilteredTasks, currentUserId]);

  const sortedTasks = useMemo(() => {
    let currentSort = sortOption;
    // Tự động chuyển sort sang deadline gần nhất nếu đang xem Sắp tới / Hôm nay
    if ((timeFilter === 'upcoming' || timeFilter === 'today') && sortOption === 'newest') {
      currentSort = 'due_date';
    }

    return [...tasks].sort((a, b) => {
      if (currentSort === 'due_date') {
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (currentSort === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (currentSort === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (currentSort === 'az') {
        return a.title.localeCompare(b.title);
      }
      if (currentSort === 'status') {
        const order = { "TODO": 1, "IN_PROGRESS": 2, "DONE": 3 };
        return (order[a.status as keyof typeof order] || 0) - (order[b.status as keyof typeof order] || 0);
      }
      return 0;
    });
  }, [tasks, sortOption, timeFilter]);

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
      {/* Toolbar / Filters */}
      <div className="flex items-center justify-end px-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Sắp xếp:</span>
          <select 
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 outline-none focus:ring-0 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <option value="newest">Thứ tự thêm (Mới nhất lên trên)</option>
            <option value="due_date">Ngày đến hạn (Gần nhất lên trên)</option>
            <option value="oldest">Thứ tự thêm (Cũ nhất lên trên)</option>
            <option value="az">Theo tên (A-Z)</option>
            <option value="status">Trạng thái (Cần làm - Đang làm - Xong)</option>
          </select>
        </div>
      </div>

      <div className="bg-surface-mid dark:bg-slate-900 rounded-2xl overflow-y-auto flex-1 min-h-0 shadow-ambient dark:shadow-none border border-transparent dark:border-slate-800 font-inter">
        {/* Table header */}
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

        {/* Rows — NO dividers, spacing only */}
        <div className="flex flex-col">
          {sortedTasks.map(task => {
            const isDone = task.status === 'DONE';
            const hasDueDate = !!task.due_date;
            const isOverdue = hasDueDate && isPast(parseISO(task.due_date!)) && !isDone;
            
            // Support both tag object format and tags array format
            const displayTag = (task as any).tag || (task.tags && task.tags.length > 0 ? task.tags[0] : null);

            // Get row background class based on status
            const rowBgClass = 
              task.status === 'IN_PROGRESS' ? 'bg-amber-50/30 hover:bg-amber-50/60 dark:bg-amber-900/10 dark:hover:bg-amber-900/20' :
              task.status === 'DONE' ? 'bg-emerald-50/30 hover:bg-emerald-50/60 dark:bg-emerald-900/10 dark:hover:bg-emerald-900/20' :
              'hover:bg-surface-low dark:hover:bg-slate-800/50';

            return (
              <div 
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={cn("grid grid-cols-[2fr_1fr_1fr_1fr_40px] px-5 py-4 transition-colors duration-150 cursor-pointer items-center group", rowBgClass)}
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
                        : task.status === 'IN_PROGRESS'
                        ? "bg-amber-100 border-amber-500 dark:bg-amber-900/40 dark:border-amber-500"
                        : "border-outline dark:border-slate-600 hover:border-primary dark:hover:border-indigo-400"
                    )}
                  >
                    {isDone && <Check size={11} className="text-success-text stroke-[3]" />}
                    {task.status === 'IN_PROGRESS' && <Minus size={11} className="text-amber-600 dark:text-amber-400 stroke-[3]" />}
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
                  hasDueDate && isOverdue ? "text-error-text dark:text-red-400" : "text-on-muted dark:text-slate-400"
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
                  className="text-on-muted hover:text-on-surface dark:text-slate-500 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer p-1 rounded-xl hover:bg-surface-high dark:hover:bg-slate-800"
                >
                  <Pencil size={13} />
                </button>

              </div>
            );
          })}
        </div>

        {/* Load more */}
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
