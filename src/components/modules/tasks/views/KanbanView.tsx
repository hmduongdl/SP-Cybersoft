"use client";

import React from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useTaskStore, TaskStatus } from "@/store/useTaskStore";
import { Calendar, MoreHorizontal, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { isPast, parseISO, format, differenceInDays } from "date-fns";

const COLS = [
  { key: 'TODO',        label: 'Cần làm',  dot: '#44495a', bgClass: 'bg-[#f1f5f9] dark:bg-slate-800/80' },
  { key: 'IN_PROGRESS', label: 'Đang làm', dot: '#b45309', bgClass: 'bg-[#fef3c7] dark:bg-slate-800/80' },
  { key: 'DONE',        label: 'Xong',     dot: '#0d5c34', bgClass: 'bg-[#dcfce7] dark:bg-slate-800/80' },
];

export function KanbanView() {
  const { 
    tasks: allTasks, 
    currentWorkspaceId,
    filterStatus,
    updateTask, 
    setSelectedTaskId, 
    setAddTaskModalOpen,
    selectedTagId
  } = useTaskStore();

  // Filter tasks based on current workspace and selected filter
  const tasks = allTasks.filter(t => {
    if (currentWorkspaceId !== "ALL" && t.workspace_id !== currentWorkspaceId) return false;
    
    if (filterStatus === 'today') {
      if (!t.due_date) return false;
      const todayStr = new Date().toISOString().split('T')[0];
      return t.due_date.startsWith(todayStr);
    }
    
    if (filterStatus === 'upcoming') {
      if (!t.due_date) return true;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (new Date(t.due_date) < todayStart) return false;
    }
    
    if (selectedTagId) {
      const hasTag = t.tags?.some(tag => tag.id === selectedTagId) || (t as any).tag?.id === selectedTagId;
      if (!hasTag) return false;
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
      <div className="w-full h-full flex-1 overflow-y-hidden overflow-x-auto min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch font-inter h-full min-w-[700px] min-h-0">
          {COLS.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className={cn("col-span-1 rounded-2xl p-3 flex flex-col gap-2 min-h-0 h-full overflow-hidden transition-colors", col.bgClass)}>
              
              {/* Header */}
              <div className="flex items-center justify-between mb-1 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
                  <span className="text-[13px] font-semibold text-[#131b2e] dark:text-slate-100">{col.label}</span>
                  <span className="text-[10px] bg-white dark:bg-slate-800 text-on-muted dark:text-slate-300 px-2 py-0.5 rounded-full shadow-card">
                    {columnTasks.length}
                  </span>
                </div>
                <button className="text-on-muted hover:text-on-surface dark:text-slate-400 dark:hover:text-slate-200 transition-colors duration-150 cursor-pointer">
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
                      "flex-1 flex flex-col gap-2 min-h-[150px] rounded-xl transition-colors duration-150 overflow-y-auto no-scrollbar",
                      snapshot.isDraggingOver ? "bg-surface-high/30 dark:bg-slate-800/50" : ""
                    )}
                  >
                    {columnTasks.map((task, index) => {
                      const isDone = task.status === 'DONE';
                      const hasDueDate = !!task.due_date;
                      const isOverdue = hasDueDate && isPast(parseISO(task.due_date!)) && !isDone;
                      const isNearingDeadline = task.status === 'IN_PROGRESS' && hasDueDate && !isDone && !isOverdue && differenceInDays(parseISO(task.due_date!), new Date()) <= 1;
                      
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
                                  "bg-white dark:bg-slate-900 rounded-xl p-3 cursor-grab transition-all duration-150 select-none border border-transparent",
                                  snapshot.isDragging ? "rotate-2 scale-105 shadow-float" : "hover:shadow-card dark:hover:shadow-slate-900/50 hover:-translate-y-px",
                                  isDone && "opacity-60",
                                  isNearingDeadline && "animate-pulse border-red-300 dark:border-red-500/50 shadow-[0_0_12px_rgba(248,113,113,0.2)] dark:shadow-[0_0_12px_rgba(248,113,113,0.1)]",
                                  isOverdue && "border-red-400 dark:border-red-500/50 bg-red-50/30 dark:bg-red-950/20"
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
                                  "text-[12px] font-inter text-[#131b2e] dark:text-slate-100 leading-[1.4] mt-2",
                                  isDone && "line-through text-on-muted dark:text-slate-500"
                                )}>
                                  {task.title}
                                </p>

                                {/* Footer */}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                  <span className="text-[10px] text-[#44495a] dark:text-slate-400 flex items-center gap-1">
                                    <Clock size={10} /> {hasDueDate ? format(parseISO(task.due_date!), 'dd/MM/yyyy') : 'No date'}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-[6px] h-[6px] rounded-full" style={{ background: COLS.find(c => c.key === task.status)?.dot || "#6b7280" }} />
                                    {task.creator?.avatar_url ? (
                                      <img src={task.creator.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-[#d8e2ff] dark:bg-indigo-500/20 flex items-center justify-center text-[8px] font-semibold text-[#0050cb] dark:text-indigo-300">
                                        {task.creator?.name ? task.creator.name.substring(0, 2).toUpperCase() : 'US'}
                                      </div>
                                    )}
                                  </div>
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
                className="border-[1.5px] border-dashed border-outline dark:border-slate-700 rounded-xl py-2.5 text-[11px] text-on-muted dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors duration-150 mt-1 cursor-pointer flex-shrink-0"
              >
                + Thêm công việc
              </button>

            </div>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}
