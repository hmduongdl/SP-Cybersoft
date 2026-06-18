"use client";

import React from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useTaskStore, TaskStatus } from "@/store/useTaskStore";
import { CalendarDays, MoreHorizontal } from "lucide-react";
import { clsx } from "clsx";

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: "TODO", title: "Cần làm", color: "bg-slate-200" },
  { id: "IN_PROGRESS", title: "Đang làm", color: "bg-amber-200" },
  { id: "DONE", title: "Hoàn thành", color: "bg-emerald-200" },
];

export function KanbanView() {
  const { tasks, updateTask, setSelectedTaskId } = useTaskStore();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId !== destination.droppableId) {
      updateTask(draggableId, { status: destination.droppableId as TaskStatus });
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-6 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col w-80 shrink-0 bg-slate-100/50 rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${col.color}`} />
                  <h3 className="font-bold text-slate-700 text-sm">{col.title}</h3>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>
                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={clsx(
                      "flex-1 flex flex-col gap-3 min-h-[150px] transition-colors rounded-xl",
                      snapshot.isDraggingOver ? "bg-slate-200/50" : ""
                    )}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setSelectedTaskId(task.id)}
                            className={clsx(
                              "bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-grab",
                              snapshot.isDragging ? "shadow-lg rotate-2 scale-105" : ""
                            )}
                          >
                            <div className="flex flex-wrap gap-1.5 mb-2">
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
                            <h4 className="text-sm font-semibold text-slate-800 mb-2 leading-snug">
                              {task.title}
                            </h4>
                            {task.due_date && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                <CalendarDays className="w-3.5 h-3.5" />
                                <span>{new Date(task.due_date).toLocaleDateString('vi-VN')}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
