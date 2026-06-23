"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTaskStore, TaskStatus } from "@/store/useTaskStore";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Search, X } from "lucide-react";
import { useSession } from "next-auth/react";

export function AddTaskModal() {
  const {
    isAddTaskModalOpen,
    setAddTaskModalOpen,
    addTask,
    tags,
    currentWorkspaceId,
    workspaces,
    users,
    fetchUsers
  } = useTaskStore();

  const { data: session } = useSession();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [tagId, setTagId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedWsId, setSelectedWsId] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [showUserPicker, setShowUserPicker] = useState(false);
  const userPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAddTaskModalOpen) {
      fetchUsers();
      setAssigneeId(session?.user?.id || null);
    }
  }, [isAddTaskModalOpen]);

  useEffect(() => {
    if (isAddTaskModalOpen && currentWorkspaceId === "ALL") {
      const personalWs = workspaces.find(w => w.name === "Personal");
      setSelectedWsId(personalWs ? personalWs.id : (workspaces[0]?.id || ""));
    }
  }, [isAddTaskModalOpen, currentWorkspaceId, workspaces]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userPickerRef.current && !userPickerRef.current.contains(e.target as Node)) {
        setShowUserPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClose = () => {
    if (loading) return;
    setAddTaskModalOpen(false);
    setTitle("");
    setDescription("");
    setStatus("TODO");
    setTagId("");
    setDueDate("");
    setSelectedWsId("");
    setAssigneeId(null);
    setUserSearch("");
    setShowUserPicker(false);
  };

  const selectedUser = users.find(u => u.id === assigneeId);
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!title.trim() || loading) return;
    setLoading(true);

    try {
      const selectedTag = tags.find(t => t.id === tagId);
      const finalWorkspaceId = currentWorkspaceId === "ALL" ? selectedWsId : currentWorkspaceId;
      const actualWsId = finalWorkspaceId || workspaces.find(w => w.name === "Personal")?.id || workspaces[0]?.id;

      if (!actualWsId) {
        toast.error("Vui lòng chọn không gian làm việc hợp lệ!");
        setLoading(false);
        return;
      }

      const newTask = {
        title,
        description,
        status,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        workspace_id: actualWsId,
        creator_id: session?.user?.id || "user-1",
        assignee_id: assigneeId || undefined,
        is_archived: false,
        tags: selectedTag ? [selectedTag] : [],
      };

      await addTask(newTask);
      toast.success("Tạo công việc thành công!", { duration: 3000 });
      handleClose();
    } catch (error) {
      toast.error("Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isAddTaskModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          {/* Modal */}
          <motion.div
            initial={{ scale: .96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: .96, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="bg-surface-mid rounded-2xl w-full max-w-lg shadow-xl border border-slate-100 p-6 flex flex-col gap-4 font-inter"
          >
            {/* Title input */}
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Tiêu đề công việc..."
              className="w-full text-lg font-bold text-slate-900 placeholder:text-slate-300 border-none outline-none focus:ring-0 p-0 mb-2 font-manrope tracking-tight"
              disabled={loading}
            />

            {/* Properties Grid */}
            <div className="flex flex-col gap-3">
              {currentWorkspaceId === "ALL" && (
                <div className="flex items-center">
                  <span className="w-24 text-xs font-semibold text-slate-400 tracking-wide uppercase">Không gian</span>
                  <select
                    value={selectedWsId}
                    onChange={e => setSelectedWsId(e.target.value)}
                    className="text-[13px] text-slate-700 bg-transparent outline-none cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-md transition-colors min-w-[120px]"
                    disabled={loading}
                  >
                    {workspaces.map(ws => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center">
                <span className="w-24 text-xs font-semibold text-slate-400 tracking-wide uppercase shrink-0">Người làm</span>
                <div className="relative" ref={userPickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowUserPicker(!showUserPicker)}
                    disabled={loading}
                    className="flex items-center gap-2 text-[13px] text-slate-700 bg-transparent hover:bg-slate-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    {selectedUser ? (
                      <>
                        {selectedUser.avatar_url ? (
                          <img src={selectedUser.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-600">
                            {selectedUser.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span>{selectedUser.name}</span>
                      </>
                    ) : (
                      <span className="text-slate-400">Chưa gán</span>
                    )}
                  </button>
                  {showUserPicker && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                        <Search size={14} className="text-slate-400 shrink-0" />
                        <input
                          autoFocus
                          value={userSearch}
                          onChange={e => setUserSearch(e.target.value)}
                          placeholder="Tìm người dùng..."
                          className="text-[13px] text-slate-700 outline-none flex-1 bg-transparent"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => { setAssigneeId(null); setShowUserPicker(false); setUserSearch(""); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-slate-400 hover:bg-slate-50 transition-colors"
                        >
                          <div className="w-5 h-5 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                            <X size={10} />
                          </div>
                          Bỏ gán
                        </button>
                        {filteredUsers.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => { setAssigneeId(u.id); setShowUserPicker(false); setUserSearch(""); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-slate-50 transition-colors ${assigneeId === u.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
                          >
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-600">
                                {u.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="text-left leading-tight">
                              <div className="font-medium">{u.name}</div>
                              <div className="text-[10px] text-slate-400">{u.email}</div>
                            </div>
                          </button>
                        ))}
                        {filteredUsers.length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-3">Không tìm thấy</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center">
                <span className="w-24 text-xs font-semibold text-slate-400 tracking-wide uppercase">Trạng thái</span>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as TaskStatus)}
                  className="text-[13px] text-slate-700 bg-transparent outline-none cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-md transition-colors"
                  disabled={loading}
                >
                  <option value="TODO">Cần làm</option>
                  <option value="IN_PROGRESS">Đang làm</option>
                  <option value="DONE">Xong</option>
                </select>
              </div>

              {/* Due date */}
              <div className="flex items-center">
                <span className="w-24 text-xs font-semibold text-slate-400 tracking-wide uppercase">Ngày hạn</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="text-[13px] text-slate-700 bg-transparent outline-none cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-md transition-colors"
                  disabled={loading}
                />
              </div>

              {/* Tag selector */}
              <div className="flex items-center">
                <span className="w-24 text-xs font-semibold text-slate-400 tracking-wide uppercase">Nhãn</span>
                <select
                  value={tagId}
                  onChange={e => setTagId(e.target.value)}
                  className="text-[13px] text-slate-700 bg-transparent outline-none cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-md transition-colors min-w-[120px]"
                  disabled={loading}
                >
                  <option value="">Không có</option>
                  {tags.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-slate-100 my-2" />

            {/* Description */}
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Thêm mô tả công việc (tùy chọn)..."
              className="w-full min-h-[100px] text-sm text-slate-700 placeholder:text-slate-400 border-none outline-none focus:ring-0 p-0 resize-none"
              disabled={loading}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-[13px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl transition-colors duration-150 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || loading}
                className="px-5 py-2 flex items-center gap-2 bg-indigo-600 text-white text-[13px] font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors duration-150 cursor-pointer shadow-sm"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Tạo công việc
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

