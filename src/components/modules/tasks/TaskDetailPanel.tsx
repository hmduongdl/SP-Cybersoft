"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useTaskStore, TaskStatus } from "@/store/useTaskStore";
import { X, Calendar, CheckCircle, Tag, User, Trash2, Search, Plus, LayoutGrid, Check, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { isPast, parseISO, format } from "date-fns";
import { toast } from "sonner";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { CustomPropertyField, TYPE_ICONS, TYPE_LABELS, CustomPropertyDefinition } from "./CustomPropertyField";
import { TaskNoteEditor } from "./TaskNoteEditor";

// Helper: convert a user-facing value back to DB column fields for optimistic updates
function valueToFields(type: string, value: any) {
  if (type === "NUMBER") return { value_number: value, value_text: null, value_boolean: null, value_date: null };
  if (type === "CHECKBOX") return { value_boolean: value, value_text: null, value_number: null, value_date: null };
  if (type === "DATE") return { value_date: value, value_text: null, value_number: null, value_boolean: null };
  if (type === "MULTI_SELECT" && Array.isArray(value)) return { value_text: JSON.stringify(value), value_number: null, value_boolean: null, value_date: null };
  return { value_text: value ?? null, value_number: null, value_boolean: null, value_date: null };
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  TODO: 'bg-primary-container text-on-muted',
  IN_PROGRESS: 'bg-warn-bg text-warn-text',
  DONE: 'bg-success-bg text-success-text',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang làm',
  DONE: 'Xong',
};

function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold px-2.5 py-1 rounded-md inline-block cursor-pointer hover:brightness-110 transition-all",
        STATUS_STYLES[status] || STATUS_STYLES.TODO
      )}
    >
      {STATUS_LABELS[status] || STATUS_LABELS.TODO}
    </span>
  );
}

export function TaskDetailPanel() {
  const {
    selectedTaskId,
    setSelectedTaskId,
    tasks,
    updateTask,
    deleteTask,
    users,
    fetchUsers,
    workspaces
  } = useTaskStore();

  const task = useMemo(() => tasks.find((t) => t.id === selectedTaskId), [tasks, selectedTaskId]);

  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // ── Custom Properties state ──
  // Property defs are derived from the embedded definition in customProperties — no extra fetch needed
  const [showAddProp, setShowAddProp] = useState(false);
  const [addPropName, setAddPropName] = useState("");
  const [addPropType, setAddPropType] = useState("TEXT");
  const addPropInputRef = useRef<HTMLInputElement>(null);
  const addPropRef = useRef<HTMLDivElement>(null);

  const [noteSaveStatus, setNoteSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error" | "synced"
  >("idle");
  const [editingDueDate, setEditingDueDate] = useState(false);

  // Cache workspace defs to avoid redundant fetches
  const wsDefsCache = useRef<Record<string, CustomPropertyDefinition[]>>({});

  const PROPERTY_TYPES = Object.entries(TYPE_LABELS).map(([type, label]) => ({
    type, label, icon: TYPE_ICONS[type],
  }));

  // Close add-prop form when clicking outside
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (addPropRef.current && !addPropRef.current.contains(e.target as Node)) {
        setShowAddProp(false);
        setAddPropName("");
        setAddPropType("TEXT");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Focus name input when add-prop opens
  useEffect(() => {
    if (showAddProp) {
      requestAnimationFrame(() => addPropInputRef.current?.focus());
    }
  }, [showAddProp]);

  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const handleSaveProperty = useCallback((defId: string, newValue: any) => {
    if (!task) return;
    // Optimistic update in local store immediately
    const currentProps = (task.customProperties || []) as any[];
    const optimistic = currentProps.map((cp: any) =>
      cp.definition_id === defId ? { ...cp, _pending: true, ...valueToFields(cp.definition?.type, newValue) } : cp
    );
    useTaskStore.getState().updateTask(task.id, { customProperties: optimistic } as any);

    const existing = debounceTimers.current.get(defId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tasks/${task.id}/properties`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ definition_id: defId, value: newValue }),
        });
        if (res.ok) {
          const updated = await res.json();
          useTaskStore.getState().updateTask(task.id, {
            customProperties: [
              ...(useTaskStore.getState().tasks.find(t => t.id === task.id)?.customProperties || []).filter((cp: any) => cp.definition_id !== defId),
              updated,
            ],
          } as any);
        }
      } catch (err) {
        console.error("Failed to save property", err);
      }
      debounceTimers.current.delete(defId);
    }, 600);
    debounceTimers.current.set(defId, timer);
  }, [task]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach(t => clearTimeout(t));
      debounceTimers.current.clear();
    };
  }, []);

  const handleDeleteProperty = useCallback(async (defId: string) => {
    if (!task) return;
    if (!confirm(`Xóa thuộc tính này khỏi workspace?`)) return;

    try {
      const res = await fetch(`/api/workspaces/${task.workspace_id}/properties/${defId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Không thể xóa thuộc tính");
        return;
      }
      // Remove from local state
      useTaskStore.getState().updateTask(task.id, {
        customProperties: (task.customProperties || []).filter((cp: any) => cp.definition_id !== defId),
      } as any);
      toast.success("Đã xóa thuộc tính");
    } catch (err) {
      console.error("Failed to delete property", err);
      toast.error("Có lỗi xảy ra");
    }
  }, [task]);

  const handleCreateProperty = useCallback(async () => {
    if (!task || !addPropName.trim()) return;

    const name = addPropName.trim();
    const type = addPropType;
    const tempId = `temp_${Date.now()}`;

    // Close form immediately — feels instant
    setShowAddProp(false);
    setAddPropName("");
    setAddPropType("TEXT");

    // Optimistic add: inject a placeholder property into the task
    const optimisticProp: any = {
      id: tempId,
      task_id: task.id,
      definition_id: tempId,
      definition: { id: tempId, name, type, options: [] },
      value_text: null, value_number: null, value_boolean: null, value_date: null,
      _isOptimistic: true,
    };
    useTaskStore.getState().updateTask(task.id, {
      customProperties: [...(task.customProperties || []), optimisticProp],
    } as any);

    try {
      // 1. Create the definition
      const defRes = await fetch(`/api/workspaces/${task.workspace_id}/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      });
      if (!defRes.ok) {
        // Rollback optimistic
        useTaskStore.getState().updateTask(task.id, {
          customProperties: (task.customProperties || []).filter((cp: any) => cp.definition_id !== tempId),
        } as any);
        return;
      }
      const def = await defRes.json();
      // Invalidate cache for this workspace
      delete wsDefsCache.current[task.workspace_id];

      // 2. Create the initial value (fire-and-forget style; replace optimistic with real)
      const valRes = await fetch(`/api/tasks/${task.id}/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ definition_id: def.id, value: null }),
      });

      const currentProps = useTaskStore.getState().tasks.find(t => t.id === task.id)?.customProperties || [];
      if (valRes.ok) {
        const val = await valRes.json();
        useTaskStore.getState().updateTask(task.id, {
          customProperties: [
            ...(currentProps as any[]).filter((cp: any) => cp.definition_id !== tempId),
            val,
          ],
        } as any);
      } else {
        // Replace optimistic with a real-def version (value empty)
        useTaskStore.getState().updateTask(task.id, {
          customProperties: [
            ...(currentProps as any[]).filter((cp: any) => cp.definition_id !== tempId),
            { ...optimisticProp, id: def.id, definition_id: def.id, definition: def, _isOptimistic: false },
          ],
        } as any);
      }
    } catch (err) {
      console.error("Failed to create property", err);
    }
  }, [task, addPropName, addPropType]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowAssigneePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setNoteSaveStatus("idle");
  }, [selectedTaskId]);

  // Detect dark mode for BlockNote theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);

    const observer = new MutationObserver(() => {
      const isDarkNow = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDarkNow);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Reset editing state when switching tasks
  useEffect(() => {
    setEditingDueDate(false);
  }, [selectedTaskId]);

  const handleClose = useCallback(() => {
    setSelectedTaskId(null);
  }, [setSelectedTaskId]);

  const handleDelete = async () => {
    if (confirm("Bạn có chắc chắn muốn xóa công việc này không?")) {
      try {
        await deleteTask(selectedTaskId!);
        handleClose();
      } catch (err: any) {
        alert(err.message || "Không thể xóa công việc.");
      }
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

  const updateTaskDescription = (newDesc: string) => {
    if (task) {
      updateTask(task.id, { description: newDesc });
    }
  };

  const updateTaskWorkspace = (newWsId: string) => {
    if (task) updateTask(task.id, { workspace_id: newWsId });
  };

  if (!selectedTaskId || !task) return null;

  const isDone = task.status === 'DONE';
  const hasDueDate = !!task.due_date;
  const isOverdue = hasDueDate && isPast(parseISO(task.due_date!)) && !isDone;
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
            className="fixed inset-0 z-40 bg-slate-950/40"
            onClick={handleClose}
          />

          {/* Slide-over Panel from right */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-full sm:w-[600px] md:w-[650px] bg-surface-mid dark:bg-surface-mid border-l border-outline dark:border-slate-800/80 shadow-2xl z-50 flex flex-col font-inter"
          >
            <div className="flex-1 overflow-y-auto pt-6 pb-24 px-6 md:px-10">

              {/* Header Navigation */}
              <div className="flex items-center justify-between mb-6 text-sm text-on-muted">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚀</span>
                  <select
                    value={task.workspace_id}
                    onChange={e => updateTaskWorkspace(e.target.value)}
                    className="font-semibold text-on-surface bg-transparent outline-none cursor-pointer hover:bg-surface-high px-1 py-0.5 rounded-md transition-colors"
                  >
                    {workspaces.map(ws => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-on-muted hover:text-on-surface hover:bg-surface-high transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Title Input */}
              <input
                value={task.title}
                onChange={e => updateTaskTitle(e.target.value)}
                className="w-full text-2xl font-bold text-on-surface border-none outline-none focus:ring-0 p-0 mb-2 bg-transparent placeholder:text-on-muted/60"
                placeholder="Nhập tiêu đề công việc..."
              />

              {/* Description Input */}
              <textarea
                value={task.description || ""}
                onChange={e => updateTaskDescription(e.target.value)}
                className="w-full text-sm text-on-muted border-none outline-none focus:ring-0 p-0 mb-4 bg-transparent placeholder:text-on-muted/70 resize-none min-h-[40px]"
                placeholder="Thêm mô tả công việc (tùy chọn)..."
                rows={2}
              />

              {/* Properties Grid */}
              <div className="border-y border-outline dark:border-slate-800/60 py-3 my-4 space-y-1">
                {/* Status */}
                <div className="grid grid-cols-[120px_1fr] items-center gap-4 py-1 text-xs">
                  <div className="flex items-center gap-2 text-on-muted">
                    <CheckCircle size={14} /> Trạng thái
                  </div>
                  <div onClick={() => cycleStatus(task)}>
                    <StatusBadge status={task.status} />
                  </div>
                </div>

                {/* Due Date */}
                <div className="grid grid-cols-[120px_1fr] items-center gap-4 py-1 text-xs">
                  <div className="flex items-center gap-2 text-on-muted">
                    <Calendar size={14} /> Ngày hết hạn
                  </div>
                  {editingDueDate ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        value={task.due_date ? format(parseISO(task.due_date!), 'yyyy-MM-dd') : ''}
                        onChange={e => {
                          const val = e.target.value;
                          updateTask(task.id, { due_date: val ? new Date(val).toISOString() : null });
                        }}
                        onBlur={() => setEditingDueDate(false)}
                        className="text-[13px] text-on-surface bg-surface-high outline-none px-2 py-1 rounded-md w-auto"
                        autoFocus
                      />
                      {task.due_date && (
                        <button
                          type="button"
                          onClick={() => { updateTask(task.id, { due_date: null }); setEditingDueDate(false); }}
                          className="p-1 text-on-muted hover:text-error-text rounded transition-colors"
                          title="Xóa ngày hết hạn"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div
                      onClick={() => setEditingDueDate(true)}
                      className={cn("text-on-surface flex items-center gap-2 hover:bg-surface-high px-2 py-1 rounded-md w-fit cursor-pointer", isOverdue && "text-error-text font-semibold")}
                    >
                      {hasDueDate ? format(parseISO(task.due_date!), 'dd/MM/yyyy') : 'Trống'}
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="grid grid-cols-[120px_1fr] items-center gap-4 py-1 text-xs">
                  <div className="flex items-center gap-2 text-on-muted">
                    <Tag size={14} /> Nhãn Tags
                  </div>
                  <div className="flex items-center gap-2">
                    {displayTag ? (
                      <span
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-md border border-current/20"
                        style={{
                          color: displayTag.color || "#475569",
                          backgroundColor: `color-mix(in srgb, ${displayTag.color || "#475569"} 20%, transparent)`,
                        }}
                      >
                        {displayTag.name}
                      </span>
                    ) : (
                      <span className="text-on-muted/70 hover:bg-surface-high px-2 py-1 rounded-md cursor-pointer">Trống</span>
                    )}
                  </div>
                </div>

                {/* Assignee */}
                <div className="grid grid-cols-[120px_1fr] items-center gap-4 py-1 text-xs">
                  <div className="flex items-center gap-2 text-on-muted">
                    <User size={14} /> Người làm
                  </div>
                  <div className="relative flex items-center gap-1" ref={pickerRef}>
                    <button
                      type="button"
                      onClick={() => { setShowAssigneePicker(!showAssigneePicker); setAssigneeSearch(""); }}
                      className="flex items-center gap-1.5 text-on-surface hover:bg-surface-high px-2 py-1 rounded-md transition-colors cursor-pointer"
                    >
                      {(task as any).assignees && (task as any).assignees.length > 0 ? (
                        <div className="flex items-center -space-x-1.5">
                          {(task as any).assignees.slice(0, 3).map((a: any) => (
                            a.avatar_url ? (
                              <img key={a.id} src={a.avatar_url} alt="" referrerPolicy="no-referrer" className="w-5 h-5 rounded-full object-cover border-2 border-surface-mid" />
                            ) : (
                              <div key={a.id} className="w-5 h-5 rounded-full bg-primary-container flex items-center justify-center text-[9px] font-semibold text-primary border-2 border-surface-mid">
                                {a.name?.substring(0, 2).toUpperCase() || 'US'}
                              </div>
                            )
                          ))}
                          {(task as any).assignees.length > 3 && (
                            <span className="text-[11px] text-on-muted ml-1">+{(task as any).assignees.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-on-muted/70">Chưa gán</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAssigneePicker(true); setAssigneeSearch(""); }}
                      className="w-5 h-5 rounded-full border border-dashed border-outline flex items-center justify-center hover:bg-surface-high hover:border-primary hover:text-primary transition-colors text-on-muted shrink-0"
                      title="Thêm người làm"
                    >
                      <Plus size={11} />
                    </button>
                    {showAssigneePicker && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-surface-bright dark:bg-surface-high rounded-xl shadow-xl border border-outline z-50 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-outline">
                          <Search size={14} className="text-on-muted shrink-0" />
                          <input
                            autoFocus
                            value={assigneeSearch}
                            onChange={e => setAssigneeSearch(e.target.value)}
                            placeholder="Tìm người dùng..."
                            className="text-[13px] text-on-surface outline-none flex-1 bg-transparent"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {users.filter(u =>
                            u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                            u.email.toLowerCase().includes(assigneeSearch.toLowerCase())
                          ).map(u => {
                            const taskAssignees: any[] = (task as any).assignees || [];
                            const isAssigned = taskAssignees.some((a: any) => a.id === u.id);
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  const currentIds = taskAssignees.map((a: any) => a.id);
                                  let newIds: string[];
                                  if (isAssigned) {
                                    newIds = currentIds.filter((id: string) => id !== u.id);
                                  } else {
                                    newIds = [...currentIds, u.id];
                                  }
                                  if (task) updateTask(task.id, { assignee_ids: newIds } as any);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-surface-high transition-colors",
                                  isAssigned ? "bg-primary-container text-primary" : "text-on-surface"
                                )}
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0",
                                  isAssigned ? "bg-primary border-primary" : "border-outline"
                                )}>
                                  {isAssigned && <span className="text-white text-[9px]">✓</span>}
                                </div>
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="" referrerPolicy="no-referrer" className="w-5 h-5 rounded-full object-cover" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-primary-container flex items-center justify-center text-[9px] font-semibold text-primary">
                                    {u.name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div className="text-left leading-tight">
                                  <div className="font-medium">{u.name}</div>
                                  <div className="text-[10px] text-on-muted">{u.email}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* ── Custom Properties ── */}
              <div className="border-y border-outline dark:border-slate-800/60 py-2 my-4">
                <h3 className="text-[10px] font-bold text-on-muted uppercase tracking-wider flex items-center gap-1 px-2 py-1 mb-1">
                  <LayoutGrid size={11} /> Thuộc tính
                </h3>

                {/* Existing properties — derived from embedded definition */}
                {(task?.customProperties || []).map((cp: any) => {
                  const def = cp.definition;
                  if (!def) return null;
                  return (
                    <CustomPropertyField
                      key={cp.definition_id}
                      property={def}
                      value={cp}
                      onChange={(newVal: any) => handleSaveProperty(cp.definition_id, newVal)}
                      onDelete={() => handleDeleteProperty(cp.definition_id)}
                    />
                  );
                })}

                {/* Add property — Notion-style inline form */}
                <div ref={addPropRef} className="mt-1">
                  {showAddProp ? (
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-surface-high rounded-lg">
                      {/* Type selector */}
                      <div className="relative group/type">
                        <select
                          value={addPropType}
                          onChange={e => setAddPropType(e.target.value)}
                          className="appearance-none bg-transparent outline-none text-xs text-on-muted cursor-pointer pr-4 pl-1"
                        >
                          {PROPERTY_TYPES.map(pt => (
                            <option key={pt.type} value={pt.type}>{pt.label}</option>
                          ))}
                        </select>
                        <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-on-muted pointer-events-none" />
                      </div>
                      <div className="w-px h-3 bg-outline/60 shrink-0" />
                      {/* Name input */}
                      <input
                        ref={addPropInputRef}
                        value={addPropName}
                        onChange={e => setAddPropName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && addPropName.trim()) handleCreateProperty();
                          if (e.key === "Escape") { setShowAddProp(false); setAddPropName(""); setAddPropType("TEXT"); }
                        }}
                        placeholder="Tên thuộc tính..."
                        className="flex-1 text-xs bg-transparent outline-none text-on-surface placeholder:text-on-muted/60 min-w-0"
                      />
                      <button
                        type="button"
                        onClick={handleCreateProperty}
                        disabled={!addPropName.trim()}
                        className="p-1 text-primary hover:bg-primary-container rounded transition-colors disabled:opacity-30 shrink-0"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddProp(false); setAddPropName(""); setAddPropType("TEXT"); }}
                        className="p-1 text-on-muted hover:bg-surface-container rounded transition-colors shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddProp(true)}
                      className="flex items-center gap-1.5 text-xs text-on-muted hover:text-primary hover:bg-surface-high px-2 py-1.5 rounded-md transition-colors w-full mt-0.5"
                    >
                      <Plus size={12} />
                      <span>Thêm thuộc tính</span>
                    </button>
                  )}
                </div>
              </div>

              {/* BlockNote Editor Area */}
              <div className="mt-8">
                <h3 className="text-xs font-bold text-on-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                  📝 Ghi chú & Nội dung
                </h3>
                <div className="task-detail-editor flex-1 min-h-[300px] text-sm text-on-surface focus:outline-none mt-2">
                  {selectedTaskId && (
                    <TaskNoteEditor
                      key={selectedTaskId}
                      taskId={selectedTaskId}
                      initialContent={task?.note?.content}
                      initialUpdatedAt={task?.note?.updatedAt}
                      isDarkMode={isDarkMode}
                      onSaveStatusChange={setNoteSaveStatus}
                    />
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="border-t border-outline dark:border-slate-800/60 p-4 bg-surface-low/95 dark:bg-surface-high/90 backdrop-blur-sm shrink-0 flex items-center justify-between gap-3">
              <button
                onClick={handleDelete}
                className="px-4 py-2 flex items-center gap-2 text-xs font-semibold text-error-text hover:bg-error-bg/40 bg-transparent rounded-lg transition-colors"
                title="Xóa công việc này"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Xóa</span>
              </button>
              <div className="flex items-center gap-3">
                {noteSaveStatus === "synced" && (
                  <span className="text-[11px] text-success-text">Đồng bộ live (~1.5s)</span>
                )}
                {noteSaveStatus === "saving" && (
                  <span className="text-[11px] text-on-muted flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    Đang lưu...
                  </span>
                )}
                {noteSaveStatus === "saved" && (
                  <span className="text-[11px] text-success-text">Đã lưu</span>
                )}
                {noteSaveStatus === "error" && (
                  <span className="text-[11px] text-error-text">Lỗi khi lưu</span>
                )}
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-on-muted hover:bg-surface-container bg-surface-container-high rounded-lg transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

