"use client";

import React from "react";
import { useTaskStore, TaskStatus } from "@/store/useTaskStore";
import { CalendarDays, Edit2, Check } from "lucide-react";
import { clsx } from "clsx";

const getTagStyles = (tagName: string) => {
  switch (tagName.toLowerCase()) {
    case 'frontend': return 'bg-[#d8e2ff] text-[#0050cb]';
    case 'backend': return 'bg-[#ede0ff] text-[#6200ea]';
    case 'ui/ux': return 'bg-[#d5f8e8] text-[#0d5c34]';
    case 'ai': return 'bg-[#fff3cd] text-[#b45309]';
    default: return 'bg-slate-100 text-slate-600';
  }
};

const getPriorityDot = (priority: string | undefined) => {
  switch (priority?.toLowerCase()) {
    case 'high': return 'bg-[#e24b4a]';
    case 'low': return 'bg-[#1d9e75]';
    default: return 'bg-[#ef9f27]';
  }
};

const getPriorityLabel = (priority: string | undefined) => {
  switch (priority?.toLowerCase()) {
    case 'high': return 'Cao';
    case 'low': return 'Thấp';
    default: return 'TB';
  }
};

export function ListView() {
  const { tasks, updateTask, setSelectedTaskId } = useTaskStore();

  const toggleStatus = (id: string, currentStatus: TaskStatus) => {
    updateTask(id, { status: currentStatus === "DONE" ? "TODO" : "DONE" });
  };

  return (
    <div className="overflow-hidden font-inter" style={{ boxShadow: '0 8px 24px rgba(19,27,46,.05)' }}>
      <table className="w-full text-left border-none bg-white rounded-2xl">
        <thead className="bg-[#f2f3ff]">
          <tr className="text-[#44495a] font-bold text-[9px] uppercase tracking-[0.1em]">
            <th className="py-4 px-6 w-12 text-center"></th>
            <th className="py-4 px-4 w-[35%]">Tên công việc</th>
            <th className="py-4 px-4 w-[25%]">Thẻ tag</th>
            <th className="py-4 px-4 w-1/6">Hạn chót</th>
            <th className="py-4 px-4 w-24">Ưu tiên</th>
            <th className="py-4 px-6 w-12 text-center">Sửa</th>
          </tr>
        </thead>
        <tbody className="divide-none">
          {tasks.map((task) => {
            const isDone = task.status === "DONE";
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone;

            return (
              <tr 
                key={task.id} 
                onClick={() => setSelectedTaskId(task.id)} 
                className={clsx(
                  "hover:bg-[#f2f3ff] transition-colors group cursor-pointer",
                  isDone ? "opacity-60" : ""
                )}
              >
                <td className="py-4 px-6 text-center align-middle">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatus(task.id, task.status);
                    }}
                    className={clsx(
                      "w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-colors",
                      isDone 
                        ? "bg-[#0d5c34] border-[#0d5c34] text-white" 
                        : "border-[#c4c8da] bg-transparent hover:border-[#0050cb]"
                    )}
                  >
                    {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                </td>
                <td className="py-4 px-4 align-middle">
                  <p className={clsx(
                    "font-medium text-[13px]",
                    isDone ? "text-[#44495a] line-through" : "text-[#131b2e]"
                  )}>
                    {task.title}
                  </p>
                </td>
                <td className="py-4 px-4 align-middle">
                  <div className="flex flex-wrap gap-1.5">
                    {task.tags?.map((tag) => (
                      <span
                        key={tag.id}
                        className={clsx(
                          "px-2 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap",
                          getTagStyles(tag.name)
                        )}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-4 px-4 align-middle">
                  <div className={clsx(
                    "flex items-center gap-1.5 text-xs font-medium",
                    isOverdue ? "text-[#ba1a1a]" : "text-[#44495a]"
                  )}>
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : '—'}</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-middle">
                  <div className="flex items-center gap-1.5">
                    <div className={clsx("w-2 h-2 rounded-full", getPriorityDot(task.priority))} />
                    <span className="text-xs text-[#44495a] font-medium">{getPriorityLabel(task.priority)}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-center align-middle">
                  <button className="text-[#c4c8da] hover:text-[#0050cb] opacity-0 group-hover:opacity-100 transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
