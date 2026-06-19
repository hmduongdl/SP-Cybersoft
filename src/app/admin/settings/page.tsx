"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, Save, Key, Cpu, Building2, Server, FolderKanban,
  Megaphone, Bold, Italic, List, Indent, Upload, Loader2, X, FileText
} from "lucide-react";
import { toast, Toaster } from "sonner";

interface Department {
  id: string;
  name: string;
}

export default function AdminSettingsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDeptName, setNewDeptName] = useState("");
  
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [newWsName, setNewWsName] = useState("");

  const [settings, setSettings] = useState({
    ai_model: "gpt-4o",
    ai_api_key: "",
  });

  const [isLoading, setIsLoading] = useState(true);

  // Announcement state
  const [announcement, setAnnouncement] = useState({
    title: "",
    content: "",
    is_active: false,
    image_url: "",
    file_url: "",
    file_name: "",
  });
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

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

  const fetchAdminWorkspaces = async () => {
    try {
      const res = await fetch("/api/admin/workspaces");
      const data = await res.json();
      if (res.ok) setWorkspaces(data.workspaces || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAnnouncement = async () => {
    try {
      const res = await fetch("/api/admin/announcement");
      const data = await res.json();
      if (res.ok && data.announcement) {
        setAnnouncement({
          title: data.announcement.title || "",
          content: data.announcement.content || "",
          is_active: data.announcement.is_active ?? false,
          image_url: data.announcement.image_url || "",
          file_url: data.announcement.file_url || "",
          file_name: data.announcement.file_name || "",
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    Promise.all([fetchDepartments(), fetchSettings(), fetchAdminWorkspaces(), fetchAnnouncement()]).finally(() => setIsLoading(false));
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

  const handleAddWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    
    try {
      // Get current user id via profile endpoint
      const profRes = await fetch("/api/user/profile");
      const profData = await profRes.json();
      if (!profData.user?.id) {
        toast.error("Không tìm thấy thông tin Admin.");
        return;
      }

      const res = await fetch("/api/admin/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWsName, owner_id: profData.user.id }),
      });
      if (res.ok) {
        toast.success("Thêm Workspace thành công!");
        setNewWsName("");
        fetchAdminWorkspaces();
      } else {
        toast.error("Lỗi khi thêm Workspace.");
      }
    } catch (error) {
      toast.error("Đã xảy ra lỗi.");
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xoá Workspace này (Bao gồm toàn bộ Task bên trong)?")) return;
    try {
      const res = await fetch(`/api/admin/workspaces?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Đã xoá Workspace.");
        fetchAdminWorkspaces();
      } else {
        toast.error("Không thể xoá Workspace.");
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-announcement", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.isImage) {
        setAnnouncement(prev => ({
          ...prev,
          image_url: data.url,
          file_url: "",
          file_name: "",
        }));
      } else {
        setAnnouncement(prev => ({
          ...prev,
          image_url: "",
          file_url: data.url,
          file_name: data.fileName,
        }));
      }
      toast.success("Tải tệp lên thành công!");
    } catch (error: any) {
      toast.error(error.message || "Tải tệp lên thất bại.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const clearAttachment = () => {
    setAnnouncement(prev => ({
      ...prev,
      image_url: "",
      file_url: "",
      file_name: "",
    }));
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleSaveAnnouncement = async () => {
    setIsSavingAnnouncement(true);
    try {
      const content = editorRef.current?.innerHTML || "";
      const res = await fetch("/api/admin/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...announcement, content }),
      });
      if (!res.ok) throw new Error();
      toast.success("Đã cập nhật thông báo hệ thống!", { duration: 3000 });
    } catch {
      toast.error("Lỗi khi cập nhật thông báo.");
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  if (isLoading) return <div className="p-8 text-on-surface-variant">Đang tải cấu hình...</div>;

  return (
    <div className="space-y-8 pb-12 text-on-surface max-w-5xl mx-auto">
      <Toaster position="top-right" richColors duration={1500} />
      <div>
        <nav className="flex gap-2 text-xs font-inter text-on-surface-variant/70 mb-2">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-primary font-semibold">Hệ thống</span>
        </nav>
        <h1 className="font-manrope font-bold text-headline-lg text-on-surface">Hệ thống</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-inter">Quản lý phòng ban, API Key AI và các thông số cài đặt khác.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Department Management */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient border-none overflow-hidden">
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
                className="flex-1 px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-xl hover:bg-indigo-700 transition-all duration-150 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Thêm
              </button>
            </form>

            <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {departments.map((dept) => (
                <li key={dept.id} className="flex items-center justify-between p-3 rounded-lg border-none bg-surface-container-low">
                  <span className="text-sm font-medium text-on-surface-variant">{dept.name}</span>
                  <button 
                    onClick={() => handleDeleteDept(dept.id)}
                    className="p-1.5 text-outline hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-150"
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

        {/* Workspace Management */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient border-none overflow-hidden">
          <div className="p-6 border-none flex items-center gap-2">
            <FolderKanban className="text-indigo-600 w-5 h-5" />
            <h2 className="text-lg font-bold text-on-surface font-manrope">Quản lý Workspace</h2>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleAddWorkspace} className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                placeholder="Tên Workspace mới..."
                className="flex-1 px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-xl hover:bg-indigo-700 transition-all duration-150 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Thêm
              </button>
            </form>

            <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {workspaces.map((ws) => (
                <li key={ws.id} className="flex items-center justify-between p-3 rounded-lg border-none bg-surface-container-low group">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-on-surface truncate flex items-center gap-2">
                      {ws.icon} {ws.name}
                      {ws.is_default && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Mặc định</span>}
                    </span>
                    {ws.owner && <span className="text-[10px] text-on-muted truncate">Owner: {ws.owner.name} ({ws.type})</span>}
                  </div>
                  {ws.is_default ? (
                    <span className="text-[10px] text-slate-400 italic shrink-0">Không gian mặc định</span>
                  ) : (
                    <button 
                      onClick={() => handleDeleteWorkspace(ws.id)}
                      className="p-1.5 text-outline hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-150 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
              {workspaces.length === 0 && (
                <li className="text-sm text-on-surface-variant italic text-center py-4">Chưa có Workspace nào.</li>
              )}
            </ul>
          </div>
        </div>

        {/* AI & System Settings */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient border-none overflow-hidden lg:col-span-2">
          <div className="p-6 border-none flex items-center gap-2">
            <Server className="text-indigo-600 w-5 h-5" />
            <h2 className="text-lg font-bold text-on-surface font-manrope">Cấu hình AI & API</h2>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface-variant flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-outline" /> Model AI
                </label>
                <select
                  value={settings.ai_model}
                  onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full md:w-auto md:px-8 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-xl hover:bg-indigo-700 transition-all duration-150 flex items-center justify-center gap-2 ml-auto"
            >
              <Save className="w-4 h-4" /> Lưu cấu hình AI
            </button>
          </div>
        </div>

        {/* System Announcement */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient border-none overflow-hidden lg:col-span-2">
          <div className="p-6 border-none flex items-center gap-2">
            <Megaphone className="text-indigo-600 w-5 h-5" />
            <h2 className="text-lg font-bold text-on-surface font-manrope">Thông Báo Toàn Hệ Thống</h2>
          </div>

          <div className="p-6 space-y-5">
            {/* Toggle */}
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-on-surface">Hiển thị thông báo</span>
                <p className="text-xs text-on-surface-variant/70">
                  {announcement.is_active ? "Thông báo đang được hiển thị trên toàn hệ thống" : "Thông báo đang tắt"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={announcement.is_active}
                onClick={() => setAnnouncement(prev => ({ ...prev, is_active: !prev.is_active }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  announcement.is_active ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    announcement.is_active ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface-variant">Tiêu đề thông báo</label>
              <input
                type="text"
                value={announcement.title}
                onChange={(e) => setAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Nhập tiêu đề thông báo..."
                className="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Rich Text Editor */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface-variant">Nội dung thông báo</label>
              <div className="border border-outline/20 rounded-xl overflow-hidden bg-surface-container-low focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                {/* Toolbar */}
                <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-outline/10 bg-surface-container-lowest">
                  <button
                    type="button"
                    onClick={() => execCommand("bold")}
                    className="p-1.5 rounded hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
                    title="In đậm (Ctrl+B)"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execCommand("italic")}
                    className="p-1.5 rounded hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
                    title="In nghiêng (Ctrl+I)"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <span className="w-px h-5 bg-outline/20 mx-1" />
                  <button
                    type="button"
                    onClick={() => execCommand("indent")}
                    className="p-1.5 rounded hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
                    title="Thụt lề"
                  >
                    <Indent className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execCommand("insertUnorderedList")}
                    className="p-1.5 rounded hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
                    title="Danh sách gạch đầu dòng"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
                {/* Editor area */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-[160px] max-h-[360px] overflow-y-auto px-4 py-3 text-sm text-on-surface outline-none focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-on-surface-variant/50"
                  data-placeholder="Nhập nội dung thông báo... (hỗ trợ định dạng văn bản)"
                  dangerouslySetInnerHTML={{ __html: announcement.content }}
                  onInput={(e) => {
                    setAnnouncement(prev => ({ ...prev, content: e.currentTarget.innerHTML }));
                  }}
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface-variant">Đính kèm Hình ảnh / Tài liệu</label>
              <div className="flex items-center gap-3">
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isUploading
                    ? "bg-indigo-100 text-indigo-500 pointer-events-none"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-indigo-50 hover:text-indigo-600 border border-outline/20 hover:border-indigo-300"
                }`}>
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isUploading ? "Đang tải lên..." : "Chọn tệp"}
                  <input
                    type="file"
                    className="hidden"
                    accept=".png,.jpg,.jpeg,.gif,.webp,.svg,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
                <span className="text-xs text-on-surface-variant/70">Hỗ trợ: PNG, JPG, SVG, PDF, DOCX</span>
              </div>

              {/* Image preview */}
              {announcement.image_url && (
                <div className="relative inline-block mt-2 group">
                  <img
                    src={announcement.image_url}
                    alt="Preview"
                    className="h-24 w-auto rounded-lg object-cover border border-outline/20 shadow-sm"
                  />
                  <button
                    onClick={clearAttachment}
                    className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Document file preview */}
              {announcement.file_url && announcement.file_name && (
                <div className="inline-flex items-center gap-3 mt-2 p-3 bg-surface-container-low rounded-xl border border-outline/20 group">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <FileText className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-on-surface truncate max-w-[200px]">{announcement.file_name}</span>
                    <a
                      href={announcement.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-500 hover:text-indigo-600"
                    >
                      Xem tài liệu
                    </a>
                  </div>
                  <button
                    onClick={clearAttachment}
                    className="p-1 text-outline hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all ml-auto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Save button */}
            <div className="pt-2">
              <button
                onClick={handleSaveAnnouncement}
                disabled={isSavingAnnouncement}
                className="w-full md:w-auto md:px-8 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2"
              >
                {isSavingAnnouncement ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSavingAnnouncement ? "Đang lưu..." : "Cập nhật thông báo"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
