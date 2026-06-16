"use client";

import React, { useState, useEffect, useRef } from "react";
import { User, Mail, Shield, Building2, UploadCloud, X, Globe, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  username: string;
  name: string | null;
  email: string;
  gmail: string | null;
  department: string | null;
  facebook_profile_url: string | null;
  facebook_verified: boolean;
  avatar_url: string | null;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"info" | "password">("info");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  
  // Profile state from database
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Password form state
  const [pwdData, setPwdData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch departments and profile data when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      
      // Load departments
      fetch("/api/admin/departments", { cache: "no-store" })
        .then(res => res.json())
        .then(data => {
          if (data.departments) setDepartments(data.departments);
        })
        .catch(console.error);

      // Load user profile
      fetch("/api/user/profile", { cache: "no-store" })
        .then(res => {
          if (!res.ok) throw new Error("Không thể tải thông tin profile.");
          return res.json();
        })
        .then(data => {
          if (data.user) {
            setProfile(data.user);
          }
        })
        .catch(err => {
          console.error(err);
          toast.error("Lỗi khi tải thông tin cá nhân.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp tin hình ảnh hợp lệ (PNG, JPG, JPEG).");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/user/profile", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể tải tệp lên.");
      }

      const newAvatarUrl = data.avatar_url;
      
      // Update local state
      if (profile) {
        setProfile({ ...profile, avatar_url: newAvatarUrl });
      }

      // Update session immediately for header and sidebar
      if (update) {
        await update({ image: newAvatarUrl });
      }

      toast.success("Cập nhật ảnh đại diện thành công!");
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi tải ảnh đại diện lên.");
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Save profile text fields
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          gmail: profile.gmail,
          department: profile.department,
          facebook_profile_url: profile.facebook_profile_url,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Cập nhật thất bại.");
      }

      // Update NextAuth session
      if (update) {
        await update({ name: profile.name });
      }

      toast.success("Cập nhật thông tin thành công!");
      router.refresh(); // Refresh Server Components (e.g. Header)
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi lưu thông tin.");
    } finally {
      setSaving(false);
    }
  };

  // Change password handler
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdData.newPassword !== pwdData.confirmPassword) {
      toast.error("Mật khẩu mới không trùng khớp.");
      return;
    }
    if (pwdData.newPassword.length < 8) {
      toast.error("Mật khẩu mới phải có tối thiểu 8 ký tự.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pwdData.currentPassword,
          newPassword: pwdData.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Đổi mật khẩu thất bại.");
      }

      toast.success("Đổi mật khẩu thành công!");
      setPwdData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Sai mật khẩu cũ hoặc xảy ra lỗi.");
    } finally {
      setSaving(false);
    }
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

        {/* Content Area */}
        <div className="p-6">
          {loading ? (
            <div className="min-h-[250px] flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-sm">Đang tải thông tin cá nhân...</p>
            </div>
          ) : activeTab === "info" && profile ? (
            <form onSubmit={handleSaveInfo} className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                
                {/* Avatar Column */}
                <div className="flex flex-col items-center space-y-3 shrink-0">
                  <div 
                    onClick={triggerFileInput}
                    className="w-24 h-24 rounded-full bg-slate-100 border border-slate-200 overflow-hidden relative group cursor-pointer"
                  >
                    {profile.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-indigo-50 text-indigo-600 text-xl font-bold flex items-center justify-center uppercase">
                        {(profile.name || profile.email).charAt(0)}
                      </div>
                    )}
                    
                    {/* Hover upload overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploading ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <UploadCloud className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <button 
                    type="button" 
                    onClick={triggerFileInput}
                    disabled={uploading}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 flex items-center gap-1"
                  >
                    {uploading && <Loader2 className="w-3 h-3 animate-spin" />}
                    Thay đổi ảnh đại diện
                  </button>
                </div>

                {/* Info Column */}
                <div className="flex-1 space-y-4 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                        <User className="w-4 h-4 text-slate-400" /> Họ và tên
                      </label>
                      <input 
                        type="text" 
                        value={profile.name || ""}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                        required
                        disabled={saving}
                      />
                    </div>

                    {/* Username */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                        <User className="w-4 h-4 text-slate-400" /> Tên đăng nhập (Username)
                      </label>
                      <input 
                        type="text" 
                        value={profile.username || ""}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed font-mono"
                        disabled
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                        <Mail className="w-4 h-4 text-slate-400" /> Email công việc
                      </label>
                      <input 
                        type="email" 
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        disabled={saving}
                        className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 font-mono"
                        required
                      />
                    </div>

                    {/* Gmail */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                        <Mail className="w-4 h-4 text-slate-400" /> Gmail cá nhân
                      </label>
                      <input 
                        type="email" 
                        value={profile.gmail || ""}
                        onChange={(e) => setProfile({ ...profile, gmail: e.target.value })}
                        disabled={saving}
                        className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 font-mono"
                      />
                    </div>

                    {/* Facebook profile link */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                          <Globe className="w-4 h-4 text-slate-400" /> Facebook Profile Link
                        </label>
                        {profile.facebook_verified ? (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Đã xác thực
                          </span>
                        ) : profile.facebook_profile_url ? (
                          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            Chờ xác thực
                          </span>
                        ) : null}
                      </div>
                      <input 
                        type="text" 
                        placeholder="https://facebook.com/your-username"
                        value={profile.facebook_profile_url || ""}
                        onChange={(e) => setProfile({ ...profile, facebook_profile_url: e.target.value })}
                        disabled={saving}
                        className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                      />
                    </div>

                    {/* Department */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                        <Building2 className="w-4 h-4 text-slate-400" /> Phòng ban
                      </label>
                      <select 
                        value={profile.department || "Other"}
                        onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                        disabled={saving}
                        className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                      >
                        {departments.map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                        {departments.length === 0 && <option value="Other">Other</option>}
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={onClose}
                  disabled={saving || uploading}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={saving || uploading}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu thay đổi</span>
                  )}
                </button>
              </div>
            </form>
          ) : activeTab === "password" ? (
            <form onSubmit={handleSavePassword} className="space-y-4 max-w-md mx-auto">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl mb-6 flex gap-3">
                <Shield className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                  Mật khẩu cần có ít nhất 8 ký tự. Khuyên dùng mật khẩu mạnh bao gồm chữ hoa, chữ thường và số để bảo vệ tài khoản của bạn.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Mật khẩu hiện tại</label>
                <input 
                  type="password" 
                  value={pwdData.currentPassword}
                  onChange={(e) => setPwdData({ ...pwdData, currentPassword: e.target.value })}
                  disabled={saving}
                  className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Mật khẩu mới</label>
                <input 
                  type="password" 
                  value={pwdData.newPassword}
                  onChange={(e) => setPwdData({ ...pwdData, newPassword: e.target.value })}
                  disabled={saving}
                  className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Nhập lại mật khẩu mới</label>
                <input 
                  type="password" 
                  value={pwdData.confirmPassword}
                  onChange={(e) => setPwdData({ ...pwdData, confirmPassword: e.target.value })}
                  disabled={saving}
                  className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button 
                  type="button" 
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang cập nhật...</span>
                    </>
                  ) : (
                    <span>Cập nhật mật khẩu</span>
                  )}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
