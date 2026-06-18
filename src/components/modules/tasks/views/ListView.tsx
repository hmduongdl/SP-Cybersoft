"use client";

import React from "react";
import { useTaskStore, TaskStatus } from "@/store/useTaskStore";
import { CalendarDays, CheckCircle2, Circle, Edit2 } from "lucide-react";

export function ListView() {
  const { tasks, updateTask, setSelectedTaskId } = useTaskStore();

  const toggleStatus = (id: string, currentStatus: TaskStatus) => {
    updateTask(id, { status: currentStatus === "DONE" ? "TODO" : "DONE" });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
            <th className="p-4 w-12 text-center"></th>
            <th className="p-4 w-1/2">Tên công việc</th>
            <th className="p-4 w-1/4">Thẻ tag</th>
            <th className="p-4 w-1/6">Hạn chót</th>
            <th className="p-4 w-12 text-center">Sửa</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((task) => {
            const isDone = task.status === "DONE";
            return (
              <tr key={task.id} onClick={() => setSelectedTaskId(task.id)} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                <td className="p-4 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatus(task.id, task.status);
                    }}
                    className="text-slate-300 hover:text-indigo-500 transition-colors"
                  >
                    {isDone ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5" />}
                  </button>
                </td>
                <td className="p-4">
                  <p className={`font-semibold text-sm ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {task.title}
                  </p>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {task.tags?.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                        style={{ backgroundColor: tag.color ? `${tag.color}20` : '#e2e8f0', color: tag.color || '#475569' }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  {task.due_date && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <CalendarDays className="w-4 h-4" />
                      <span>{new Date(task.due_date).toLocaleDateString('vi-VN')}</span>
                    </div>
                  )}
                </td>
                <td className="p-4 text-center">
                  <button className="text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all">
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
