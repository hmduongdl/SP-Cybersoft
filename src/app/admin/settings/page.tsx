"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, Key, Cpu, Building2, Server } from "lucide-react";
import { toast } from "sonner";

interface Department {
  id: string;
  name: string;
}

export default function AdminSettingsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDeptName, setNewDeptName] = useState("");
  
  const [settings, setSettings] = useState({
    ai_model: "gpt-4o",
    ai_api_key: "",
  });

  const [isLoading, setIsLoading] = useState(true);

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/admin/departments");
      const data = await res.json();
      if (res.ok) setDepartments(data.departments);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (res.ok && data.settings) {
        setSettings({
          ai_model: data.settings.ai_model || "gpt-4o",
          ai_api_key: data.settings.ai_api_key || "",
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    Promise.all([fetchDepartments(), fetchSettings()]).finally(() => setIsLoading(false));
  }, []);

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    
    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeptName }),
      });
      if (res.ok) {
        toast.success("Thêm phòng ban thành công!");
        setNewDeptName("");
        fetchDepartments();
      } else {
        toast.error("Lỗi khi thêm phòng ban.");
      }
    } catch (error) {
      toast.error("Đã xảy ra lỗi.");
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xoá phòng ban này?")) return;
    try {
      const res = await fetch(`/api/admin/departments?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Đã xoá phòng ban.");
        fetchDepartments();
      } else {
        toast.error("Không thể xoá phòng ban.");
      }
    } catch (error) {
      toast.error("Đã xảy ra lỗi.");
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Đã lưu cấu hình hệ thống!");
      } else {
        toast.error("Lỗi khi lưu cấu hình.");
      }
    } catch (error) {
      toast.error("Đã xảy ra lỗi.");
    }
  };

  if (isLoading) return <div className="p-8 text-on-surface-variant">Đang tải cấu hình...</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight font-manrope">Cấu hình hệ thống</h1>
        <p className="text-on-surface-variant text-sm mt-1">Quản lý phòng ban, API Key AI và các thông số cài đặt khác.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Department Management */}
        <div className="bg-surface-container-lowest rounded-lg-2xl shadow-ambient border-none overflow-hidden">
          <div className="p-6 border-none flex items-center gap-2">
            <Building2 className="text-indigo-600 w-5 h-5" />
            <h2 className="text-lg font-bold text-on-surface font-manrope">Quản lý Phòng ban</h2>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleAddDept} className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="Tên phòng ban mới..."
                className="flex-1 px-3 py-2 bg-surface-container-low border-none rounded-lg-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-lg-lg hover:bg-indigo-700 transition flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Thêm
              </button>
            </form>

            <ul className="space-y-2">
              {departments.map((dept) => (
                <li key={dept.id} className="flex items-center justify-between p-3 rounded-lg-lg border-none bg-surface-container-low">
                  <span className="text-sm font-medium text-on-surface-variant">{dept.name}</span>
                  <button 
                    onClick={() => handleDeleteDept(dept.id)}
                    className="p-1.5 text-outline hover:text-rose-500 hover:bg-rose-50 rounded-lg-xl transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
              {departments.length === 0 && (
                <li className="text-sm text-on-surface-variant italic text-center py-4">Chưa có phòng ban nào.</li>
              )}
            </ul>
          </div>
        </div>

        {/* AI & System Settings */}
        <div className="bg-surface-container-lowest rounded-lg-2xl shadow-ambient border-none overflow-hidden">
          <div className="p-6 border-none flex items-center gap-2">
            <Server className="text-indigo-600 w-5 h-5" />
            <h2 className="text-lg font-bold text-on-surface font-manrope">Cấu hình AI & API</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface-variant flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-outline" /> Model AI
              </label>
              <select 
                value={settings.ai_model}
                onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
                className="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="gpt-4o">GPT-4o (OpenAI)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="claude-3-opus">Claude 3 Opus (Anthropic)</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Google)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface-variant flex items-center gap-1.5">
                <Key className="w-4 h-4 text-outline" /> API Key
              </label>
              <input 
                type="password"
                value={settings.ai_api_key}
                onChange={(e) => setSettings({ ...settings, ai_api_key: e.target.value })}
                placeholder="Nhập API Key..."
                className="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            
            <button 
              onClick={handleSaveSettings}
              className="w-full py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-lg-lg hover:bg-indigo-700 transition shadow flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Lưu cấu hình AI
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
