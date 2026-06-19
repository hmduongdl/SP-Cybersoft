"use client";

import React from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useTaskStore, TaskStatus } from "@/store/useTaskStore";
import { Calendar, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { isPast, parseISO, format } from "date-fns";

const COLS = [
  { key: 'TODO',        label: 'Cần làm',  dot: '#44495a' },
  { key: 'IN_PROGRESS', label: 'Đang làm', dot: '#b45309' },
  { key: 'DONE',        label: 'Xong',     dot: '#0d5c34' },
];

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
      <div className="grid grid-cols-3 gap-4 pb-4 items-start font-inter">
        {COLS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="bg-surface-low rounded-2xl p-3.5 flex flex-col gap-2">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
                  <span className="text-[13px] font-semibold text-on-surface">{col.label}</span>
                  <span className="text-[10px] bg-white text-on-muted px-2 py-0.5 rounded-full shadow-card">
                    {columnTasks.length}
                  </span>
                </div>
                <button className="text-on-muted hover:text-on-surface transition-colors duration-150 cursor-pointer">
                  <MoreHorizontal size={15} />
                </button>
              </div>

              {/* Task cards wrapper with Droppable area */}
              <Droppable droppableId={col.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-grow flex flex-col gap-2 min-h-[250px] rounded-xl transition-colors duration-150",
                      snapshot.isDraggingOver ? "bg-surface-high/30" : ""
                    )}
                  >
                    {columnTasks.map((task, index) => {
                      const isDone = task.status === 'DONE';
                      const hasDueDate = !!task.due_date;
                      const isOverdue = hasDueDate && isPast(parseISO(task.due_date!)) && !isDone;
                      
                      // Support both tag object format and tags array format
                      const displayTag = (task as any).tag || (task.tags && task.tags.length > 0 ? task.tags[0] : null);

                      return (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                              }}
                            >
                              <motion.div
                                layout
                                initial={{ opacity: 0, y: 8 }} 
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => setSelectedTaskId(task.id)}
                                className={cn(
                                  "bg-white rounded-xl p-3 cursor-grab transition-all duration-150 select-none",
                                  snapshot.isDragging ? "rotate-2 scale-105 shadow-float" : "hover:shadow-card hover:-translate-y-px",
                                  isDone && "opacity-60"
                               )}
                              >
                                {/* Tag pill */}
                                {displayTag && (
                                  <span 
                                    className="inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full mb-2"
                                    style={{ 
                                      background: `${displayTag.color}25` || "#6b728025", 
                                      color: displayTag.color || "#6b7280" 
                                    }}
                                  >
                                    {displayTag.name}
                                  </span>
                                )}

                                {/* Title */}
                                <p className={cn(
                                  "text-[13px] text-on-surface leading-[1.45]",
                                  isDone && "line-through text-on-muted"
                                )}>
                                  {task.title}
                                </p>

                                {/* Footer */}
                                <div className="flex items-center justify-between mt-3">
                                  {hasDueDate ? (
                                    <span className={cn(
                                      "flex items-center gap-1 text-[10px]",
                                      isOverdue ? "text-error-text" : "text-on-muted"
                                    )}>
                                      <Calendar size={10} />
                                      {format(parseISO(task.due_date!), 'dd/MM/yyyy')}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-on-muted">Chưa đặt</span>
                                  )}
                                  
                                  {/* Status indicator dot */}
                                  <div 
                                    className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                                    style={{ background: COLS.find(c => c.key === task.status)?.dot || "#6b7280" }} 
                                  />
                                </div>
                              </motion.div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* Add task ghost */}
              <button 
                onClick={() => setAddTaskModalOpen(true)}
                className="border-[1.5px] border-dashed border-outline rounded-xl py-2.5 text-[11px] text-on-muted hover:bg-white transition-colors duration-150 mt-1 cursor-pointer"
              >
                + Thêm công việc
              </button>

            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
