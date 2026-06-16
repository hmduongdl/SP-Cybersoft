"use client";

import { useState } from "react";
import { User, Mail, Shield, Building2, UploadCloud, X } from "lucide-react";
import { useSession } from "next-auth/react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"info" | "password">("info");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // TODO: Connect to actual profile update API endpoint
    setTimeout(() => {
      setSaving(false);
      onClose();
      alert("Cập nhật thông tin thành công!");
    }, 1000);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // TODO: Connect to actual password update API endpoint
    setTimeout(() => {
      setSaving(false);
      onClose();
      alert("Đổi mật khẩu thành công!");
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Tài khoản cá nhân</h2>
            <p className="text-sm text-slate-500 mt-0.5">Quản lý thông tin và bảo mật tài khoản của bạn</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-slate-100">
          <button
            onClick={() => setActiveTab("info")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "info" 
                ? "border-indigo-600 text-indigo-600" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Thông tin chung
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "password" 
                ? "border-indigo-600 text-indigo-600" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Đổi mật khẩu
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "info" ? (
            <form onSubmit={handleSaveInfo} className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {/* Avatar Column */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-24 h-24 rounded-full bg-slate-100 border border-slate-200 overflow-hidden relative group">
                    <img 
                      src={session?.user?.image || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=250&auto=format&fit=crop"} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <UploadCloud className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <button type="button" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                    Thay đổi ảnh đại diện
                  </button>
                </div>

                {/* Info Column */}
                <div className="flex-1 space-y-4 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" /> Họ và tên
                      </label>
                      <input 
                        type="text" 
                        defaultValue={session?.user?.name || ""}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" /> Email công việc
                      </label>
                      <input 
                        type="email" 
                        defaultValue={session?.user?.email || ""}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                        disabled
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" /> Phòng ban
                      </label>
                      <select 
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                      >
                        <option value="HR">Phòng Nhân sự (HR)</option>
                        <option value="Marketing">Phòng Marketing</option>
                        <option value="Sales">Phòng Kinh doanh (Sales)</option>
                        <option value="Tech">Phòng Kỹ thuật (Tech)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSavePassword} className="space-y-4 max-w-md mx-auto">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl mb-6 flex gap-3">
                <Shield className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-sm text-indigo-800 leading-relaxed">
                  Mật khẩu cần có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số. Khuyên dùng mật khẩu mạnh để bảo vệ tài khoản.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Mật khẩu hiện tại</label>
                <input 
                  type="password" 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Mật khẩu mới</label>
                <input 
                  type="password" 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nhập lại mật khẩu mới</label>
                <input 
                  type="password" 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
