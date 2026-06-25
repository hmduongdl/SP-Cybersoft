"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useTaskStore, TaskStatus } from "@/store/useTaskStore";
import { X, Calendar, FileText, CheckCircle, Tag, User, Trash2, Search, Plus, LayoutGrid, Hash, Link as LinkIcon, Mail, Phone as PhoneIcon, List, Layers, ArrowLeft, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { isPast, parseISO, format } from "date-fns";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { CustomPropertyField } from "./CustomPropertyField";

const STATUS_MAP = {
  TODO: { label: 'Cần làm', bg: '#f2f3ff', color: '#44495a' },
  IN_PROGRESS: { label: 'Đang làm', bg: '#fff3cd', color: '#b45309' },
  DONE: { label: 'Xong', bg: '#d5f8e8', color: '#0d5c34' },
};

function StatusBadge({ status }: { status: TaskStatus }) {
  const s = STATUS_MAP[status] || STATUS_MAP.TODO;
  return (
    <span
      className="text-[10px] font-semibold px-2.5 py-1 rounded-md inline-block cursor-pointer hover:opacity-80 transition-opacity"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export function TaskDetailPanel() {
  const {
    selectedTaskId,
    setSelectedTaskId,
    tasks,
    updateTask,
    updateTaskNote,
    deleteTask,
    currentWorkspace,
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
  const [propertyDefs, setPropertyDefs] = useState<any[]>([]);
  const [showAddProp, setShowAddProp] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [newPropName, setNewPropName] = useState("");
  const [creatingProp, setCreatingProp] = useState(false);
  const propRef = useRef<HTMLDivElement>(null);

  const PROPERTY_TYPES = [
    { type: "TEXT", label: "Văn bản", icon: FileText },
    { type: "NUMBER", label: "Số", icon: Hash },
    { type: "SELECT", label: "Chọn", icon: List },
    { type: "MULTI_SELECT", label: "Nhiều lựa chọn", icon: Layers },
    { type: "DATE", label: "Ngày", icon: Calendar },
    { type: "CHECKBOX", label: "Hộp kiểm", icon: CheckCircle },
    { type: "URL", label: "URL", icon: LinkIcon },
    { type: "EMAIL", label: "Email", icon: Mail },
    { type: "PHONE", label: "Điện thoại", icon: PhoneIcon },
  ];

  const fetchPropertyDefs = useCallback(async () => {
    if (!task?.workspace_id) return;
    try {
      const res = await fetch(`/api/workspaces/${task.workspace_id}/properties`);
      if (res.ok) {
        const d = await res.json();
        setPropertyDefs(d.properties || []);
      }
    } catch { }
  }, [task?.workspace_id]);

  useEffect(() => {
    if (task) fetchPropertyDefs();
  }, [task?.workspace_id, fetchPropertyDefs]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (propRef.current && !propRef.current.contains(e.target as Node)) {
        setShowAddProp(false);
        setShowTypeMenu(false);
        setSelectedType(null);
        setNewPropName("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const handleSaveProperty = (defId: string, newValue: any) => {
    if (!task) return;
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
            customProperties: [...(task.customProperties || []).filter(cp => cp.definition_id !== defId), updated],
          } as any);
        }
      } catch (err) {
        console.error("Failed to save property", err);
      }
      debounceTimers.current.delete(defId);
    }, 500);
    debounceTimers.current.set(defId, timer);
  };

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach(t => clearTimeout(t));
      debounceTimers.current.clear();
    };
  }, []);

  const handleCreateProperty = async (type: string) => {
    if (!task || !newPropName.trim()) return;
    setCreatingProp(true);
    try {
      const res = await fetch(`/api/workspaces/${task.workspace_id}/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPropName.trim(), type }),
      });
      if (res.ok) {
        const def = await res.json();
        // Save immediately (not debounced) for the initial value
        const initRes = await fetch(`/api/tasks/${task.id}/properties`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ definition_id: def.id, value: null }),
        });
        if (initRes.ok) {
          const updated = await initRes.json();
          useTaskStore.getState().updateTask(task.id, {
            customProperties: [...(task.customProperties || []).filter(cp => cp.definition_id !== def.id), updated],
          } as any);
        }
        await fetchPropertyDefs();
        setSelectedType(null);
        setNewPropName("");
        setShowTypeMenu(false);
        setShowAddProp(false);
      } else {
        const err = await res.json();
        console.error(err);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingProp(false);
    }
  };

  const existingDefIds = new Set((task?.customProperties || []).map(cp => cp.definition_id));
  const availableProps = propertyDefs.filter((p: any) => !existingDefIds.has(p.id));

  const editor = useCreateBlockNote({
    initialContent: task?.note?.content ? task.note.content : undefined,
  });

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
    if (editor && task) {
      const currentContent = task.note?.content;
      if (currentContent) {
        editor.replaceBlocks(editor.document, currentContent);
      } else {
        editor.replaceBlocks(editor.document, [{ type: "paragraph", content: [] }]);
      }
    }
  }, [selectedTaskId, editor]);

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

  const handleClose = () => {
    setSelectedTaskId(null);
  };

  const handleSaveNote = async () => {
    if (editor && selectedTaskId) {
      const content = editor.document;
      await updateTaskNote(selectedTaskId, content);
      alert("Lưu thành công!");
      handleClose();
    }
  };

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

  const updateTaskAssignee = (newUserId: string | null) => {
    if (task) updateTask(task.id, { assignee_id: newUserId });
  };

  const saveTask = () => { };

  if (!selectedTaskId || !task) return null;

  const isDone = task.status === 'DONE';
  const hasDueDate = !!task.due_date;
  const isOverdue = hasDueDate && isPast(parseISO(task.due_date!)) && !isDone;
  const displayTag = (task as any).tag || (task.tags && task.tags.length > 0 ? task.tags[0] : null);
  const taskWorkspaceName = useTaskStore.getState().workspaces.find(w => w.id === task.workspace_id)?.name || "Dự án chung";

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
            className="fixed top-0 right-0 h-screen w-full sm:w-[600px] md:w-[650px] bg-surface-mid border-l border-slate-100 shadow-2xl z-50 flex flex-col font-inter"
          >
            <div className="flex-1 overflow-y-auto pt-6 pb-24 px-6 md:px-10">

              {/* Header Navigation */}
              <div className="flex items-center justify-between mb-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚀</span>
                  <select
                    value={task.workspace_id}
                    onChange={e => updateTaskWorkspace(e.target.value)}
                    className="font-semibold text-slate-700 bg-transparent outline-none cursor-pointer hover:bg-slate-50 px-1 py-0.5 rounded-md transition-colors"
                  >
                    {workspaces.map(ws => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Title Input */}
              <input
                value={task.title}
                onChange={e => updateTaskTitle(e.target.value)}
                onBlur={saveTask}
                className="w-full text-2xl font-bold text-slate-900 border-none outline-none focus:ring-0 p-0 mb-2 bg-transparent placeholder:text-slate-300"
                placeholder="Nhập tiêu đề công việc..."
              />

              {/* Description Input */}
              <textarea
                value={task.description || ""}
                onChange={e => updateTaskDescription(e.target.value)}
                onBlur={saveTask}
                className="w-full text-sm text-slate-600 border-none outline-none focus:ring-0 p-0 mb-4 bg-transparent placeholder:text-slate-400 resize-none min-h-[40px]"
                placeholder="Thêm mô tả công việc (tùy chọn)..."
                rows={2}
              />

              {/* Properties Grid */}
              <div className="border-y border-slate-100 py-3 my-4 space-y-1">
                {/* Status */}
                <div className="grid grid-cols-[120px_1fr] items-center gap-4 py-1 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <CheckCircle size={14} /> Trạng thái
                  </div>
                  <div onClick={() => cycleStatus(task)}>
                    <StatusBadge status={task.status} />
                  </div>
                </div>

                {/* Due Date */}
                <div className="grid grid-cols-[120px_1fr] items-center gap-4 py-1 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar size={14} /> Ngày hết hạn
                  </div>
                  <div className={cn("text-slate-700 flex items-center gap-2 hover:bg-slate-50 px-2 py-1 rounded-md w-fit cursor-pointer", isOverdue && "text-red-600 font-semibold")}>
                    {hasDueDate ? format(parseISO(task.due_date!), 'dd/MM/yyyy') : 'Trống'}
                  </div>
                </div>

                {/* Tags */}
                <div className="grid grid-cols-[120px_1fr] items-center gap-4 py-1 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Tag size={14} /> Nhãn Tags
                  </div>
                  <div className="flex items-center gap-2">
                    {displayTag ? (
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-md" style={{ background: `${displayTag.color}22` || "#f1f5f9", color: displayTag.color || "#475569" }}>
                        {displayTag.name}
                      </span>
                    ) : (
                      <span className="text-slate-400 hover:bg-slate-50 px-2 py-1 rounded-md cursor-pointer">Trống</span>
                    )}
                  </div>
                </div>

                {/* Assignee */}
                <div className="grid grid-cols-[120px_1fr] items-center gap-4 py-1 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <User size={14} /> Người làm
                  </div>
                  <div className="relative" ref={pickerRef}>
                    <button
                      type="button"
                      onClick={() => { setShowAssigneePicker(!showAssigneePicker); setAssigneeSearch(""); }}
                      className="flex items-center gap-2 text-slate-700 hover:bg-slate-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                    >
                      {(task as any).assignee ? (
                        <>
                          {(task as any).assignee.avatar_url ? (
                            <img src={(task as any).assignee.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-primary-container flex items-center justify-center text-[9px] font-semibold text-indigo-600">
                              {(task as any).assignee.name?.substring(0, 2).toUpperCase() || 'US'}
                            </div>
                          )}
                          <span>{(task as any).assignee.name}</span>
                        </>
                      ) : (
                        <span className="text-slate-400">Chưa gán</span>
                      )}
                    </button>
                    {showAssigneePicker && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                          <Search size={14} className="text-slate-400 shrink-0" />
                          <input
                            autoFocus
                            value={assigneeSearch}
                            onChange={e => setAssigneeSearch(e.target.value)}
                            placeholder="Tìm người dùng..."
                            className="text-[13px] text-slate-700 outline-none flex-1 bg-transparent"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => { updateTaskAssignee(null); setShowAssigneePicker(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-slate-400 hover:bg-slate-50 transition-colors"
                          >
                            <div className="w-5 h-5 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                              <X size={10} />
                            </div>
                            Bỏ gán
                          </button>
                          {users.filter(u =>
                            u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                            u.email.toLowerCase().includes(assigneeSearch.toLowerCase())
                          ).map(u => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => { updateTaskAssignee(u.id); setShowAssigneePicker(false); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-slate-50 transition-colors ${(task as any).assignee?.id === u.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
                            >
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-primary-container flex items-center justify-center text-[9px] font-semibold text-indigo-600">
                                  {u.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="text-left leading-tight">
                                <div className="font-medium">{u.name}</div>
                                <div className="text-[10px] text-slate-400">{u.email}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* ── Custom Properties ── */}
              <div className="border-y border-slate-100 dark:border-slate-800 py-3 my-4 space-y-1">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 pb-1">
                  <LayoutGrid size={12} /> Thuộc tính
                </h3>

                {/* Existing properties */}
                {(task?.customProperties || []).map((cp) => {
                  const def = propertyDefs.find((d: any) => d.id === cp.definition_id);
                  if (!def) return null;
                  return (
                    <CustomPropertyField
                      key={cp.definition_id}
                      property={def}
                      value={cp}
                      onChange={(newVal: any) => handleSaveProperty(cp.definition_id, newVal)}
                    />
                  );
                })}

                {propertyDefs.length === 0 && (task?.customProperties || []).length === 0 && (
                  <p className="text-xs text-slate-400 px-2 py-1">Chưa có thuộc tính</p>
                )}

                {/* Add property button */}
                <div className="relative" ref={propRef}>
                  {selectedType ? (
                    // Naming input for new property
                    <div className="flex items-center gap-2 px-2 py-1.5 animate-fade-in">
                      <button
                        type="button"
                        onClick={() => { setSelectedType(null); setNewPropName(""); }}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                      >
                        <ArrowLeft size={14} />
                      </button>
                      <input
                        autoFocus
                        value={newPropName}
                        onChange={e => setNewPropName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleCreateProperty(selectedType);
                          if (e.key === "Escape") { setSelectedType(null); setNewPropName(""); }
                        }}
                        placeholder="Tên thuộc tính..."
                        className="flex-1 text-xs bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                        disabled={creatingProp}
                      />
                      <button
                        type="button"
                        onClick={() => handleCreateProperty(selectedType)}
                        disabled={creatingProp || !newPropName.trim()}
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-40"
                      >
                        {creatingProp ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowTypeMenu(!showTypeMenu)}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-1.5 rounded-md transition-colors w-full"
                    >
                      <Plus size={13} />
                      <span>Thêm thuộc tính</span>
                    </button>
                  )}

                  {/* Type picker popover */}
                  {showTypeMenu && !selectedType && (
                    <div className="absolute left-0 bottom-full mb-1 z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-xl py-2 rounded-xl w-56">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 pb-1.5">Loại thuộc tính</p>
                      {PROPERTY_TYPES.map((pt) => {
                        const PTIcon = pt.icon;
                        return (
                          <button
                            key={pt.type}
                            type="button"
                            onClick={() => {
                              setSelectedType(pt.type);
                              setNewPropName("");
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <PTIcon size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
                            <span>{pt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Existing definitions shortcut (reuse prop) */}
                  {showAddProp && availableProps.length > 0 && (
                    <div className="absolute left-0 bottom-full mb-1 z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-xl py-2 rounded-xl w-56">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 pb-1.5">Đã có sẵn</p>
                      {availableProps.map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={async () => {
                            await handleSaveProperty(p.id, null);
                            setShowAddProp(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Plus size={14} className="text-slate-400" />
                          <span>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* BlockNote Editor Area */}
              <div className="mt-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  📝 Ghi chú & Nội dung
                </h3>
                <div className="flex-1 min-h-[300px] text-sm text-slate-800 focus:outline-none -mx-10 mt-2">
                  <BlockNoteView editor={editor} theme={isDarkMode ? "dark" : "light"} />
                </div>
              </div>

            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="border-t border-slate-100 p-4 bg-slate-50/80 backdrop-blur-sm shrink-0 flex items-center justify-between gap-3">
              <button
                onClick={handleDelete}
                className="px-4 py-2 flex items-center gap-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 bg-transparent rounded-lg transition-colors"
                title="Xóa công việc này"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Xóa</span>
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveNote}
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 hover:shadow transition-all"
                >
                  Lưu & Đóng
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

