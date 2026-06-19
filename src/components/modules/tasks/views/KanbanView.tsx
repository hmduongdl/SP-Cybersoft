"use client";

import React from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useTaskStore, TaskStatus } from "@/store/useTaskStore";
import { Calendar, CalendarDays, MoreHorizontal } from "lucide-react";
import { clsx } from "clsx";

const COLUMNS: { id: TaskStatus; title: string; dotColor: string }[] = [
  { id: "TODO", title: "Cần làm", dotColor: "bg-gray-400" },
  { id: "IN_PROGRESS", title: "Đang làm", dotColor: "bg-amber-500" },
  { id: "DONE", title: "Hoàn thành", dotColor: "bg-green-500" },
];

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
    default: return 'bg-[#ef9f27]'; // mid
  }
};

const getInitials = (name: string) => {
  if (!name) return "";
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
};

export function KanbanView() {
  const { 
    tasks: allTasks, 
    currentWorkspaceId,
    filterStatus,
    updateTask, 
    setSelectedTaskId, 
    setAddTaskModalOpen 
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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId !== destination.droppableId) {
      updateTask(draggableId, { status: destination.droppableId as TaskStatus });
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-4 pb-4 items-start font-inter">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col w-[300px] shrink-0 bg-surface-low rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <span className="text-[13px] font-semibold text-on-surface">{col.title}</span>
                  <span className="text-[10px] font-medium text-on-muted bg-white px-2 py-0.5 rounded-full shadow-sm">
                    {columnTasks.length}
                  </span>
                </div>
                <button className="text-on-muted hover:text-on-surface transition-colors">
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={clsx(
                      "flex-1 flex flex-col gap-2 min-h-[150px] rounded-xl transition-colors",
                      snapshot.isDraggingOver ? "bg-surface-high/50" : ""
                    )}
                  >
                    {columnTasks.map((task, index) => {
                      const isDone = task.status === 'DONE';
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone;

                      return (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setSelectedTaskId(task.id)}
                              className={clsx(
                                "bg-white rounded-xl p-3 cursor-grab transition-all duration-200",
                                snapshot.isDragging ? "rotate-2 scale-105" : "hover:-translate-y-[1px]",
                                isDone ? "opacity-[0.65]" : ""
                              )}
                              style={{
                                ...provided.draggableProps.style,
                                boxShadow: snapshot.isDragging ? '0 12px 32px rgba(19,27,46,.12)' : '0 4px 12px rgba(19,27,46,.04)',
                              }}
                              onMouseEnter={(e) => {
                                if (!snapshot.isDragging) e.currentTarget.style.boxShadow = '0 8px 24px rgba(19,27,46,.08)';
                              }}
                              onMouseLeave={(e) => {
                                if (!snapshot.isDragging) e.currentTarget.style.boxShadow = '0 4px 12px rgba(19,27,46,.04)';
                              }}
                            >
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {task.tags?.map((tag) => (
                                  <span
                                    key={tag.id}
                                    className={clsx(
                                      "px-2 py-0.5 rounded-full text-[9px] font-semibold",
                                      getTagStyles(tag.name)
                                    )}
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                              <p className={clsx(
                                "text-sm leading-[1.45] font-medium",
                                isDone ? "text-on-muted line-through" : "text-on-surface"
                              )}>
                                {task.title}
                              </p>
                              
                              <div className="flex items-center justify-between mt-3">
                                <span className={clsx(
                                  "flex items-center gap-1 text-[10px]",
                                  isOverdue ? "text-error-text" : "text-on-muted"
                                )}>
                                  <Calendar size={10} />
                                  {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Chưa đặt'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <div className={clsx("w-[6px] h-[6px] rounded-full", getPriorityDot(task.priority))} />
                                  {task.assignee && (
                                    <div className="w-5 h-5 rounded-full bg-primary-container flex items-center justify-center text-[8px] font-bold text-primary">
                                      {getInitials(task.assignee.name)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    
                    {/* Add task ghost card */}
                    <button 
                      onClick={() => {
                        // Optional: we can set default status if needed, but for now just open modal
                        setAddTaskModalOpen(true);
                      }}
                      className="w-full mt-2 border-[1.5px] border-dashed border-outline-variant rounded-xl py-2.5 text-[11px] text-on-muted hover:bg-white transition-colors"
                    >
                      + Thêm công việc
                    </button>
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
