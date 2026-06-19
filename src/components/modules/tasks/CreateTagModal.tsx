"use client";

import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTaskStore } from "@/store/useTaskStore";
import { useRouter } from "next/navigation";

interface CreateTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#10b981", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e"
];

export function CreateTagModal({ isOpen, onClose, workspaceId }: CreateTagModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[8]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const fetchTags = useTaskStore(state => state.fetchTags);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên thẻ");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, workspace_id: workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo thẻ");
      
      toast.success("Tạo thẻ mới thành công");
      await fetchTags(workspaceId);
      router.refresh();
      setName("");
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 z-50 bg-slate-950/70" onClick={() => !loading && onClose()} />
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-[0_32px_64px_rgba(19,27,46,0.12)] relative z-[60] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-sm text-[#131b2e]">Tạo thẻ mới</h2>
          <button onClick={() => !loading && onClose()} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5">
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Tên thẻ
            </label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="VD: Frontend, Urgent..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0050cb]/20 focus:border-[#0050cb] transition-all"
              disabled={loading}
              autoFocus
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Màu sắc
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                  disabled={loading}
                />
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 h-9 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 h-9 rounded-xl text-sm font-semibold text-white bg-[#0050cb] hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Lưu thẻ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
