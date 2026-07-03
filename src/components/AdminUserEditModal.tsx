"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, X, User, Mail, KeyRound, Building2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/shared/user-avatar";

interface UserAccount {
  id: string;
  username: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "USER";
  department: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

interface AdminUserEditModalProps {
  user: UserAccount;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AdminUserEditModal({ user, isOpen, onClose, onSaved }: AdminUserEditModalProps) {


  const [name, setName] = useState(user.name || "");
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [department, setDepartment] = useState(user.department || "TECH");

  const [newPassword, setNewPassword] = useState("");
  const [isActive, setIsActive] = useState(user.is_active);
  const [role, setRole] = useState<"ADMIN" | "USER">(user.role);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset form when user changes
  useEffect(() => {
    setName(user.name || "");
    setUsername(user.username);
    setEmail(user.email);
    setDepartment(user.department || "TECH");
    setNewPassword("");
    setIsActive(user.is_active);
    setRole(user.role);
    setAvatarUrl(user.avatar_url || "");
    setAvatarFile(null);
    setAvatarPreview(null);
  }, [user]);

  useEffect(() => {
    if (!avatarFile) return;

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Dung lượng ảnh không được vượt quá 2MB.");
      return;
    }

    setAvatarFile(file);
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return avatarUrl;

    const formData = new FormData();
    formData.append("file", avatarFile);
    formData.append("userId", user.id);

    const res = await fetch("/api/admin/upload-avatar", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Tải ảnh đại diện thất bại.");

    return data.avatar_url || data.url;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Vui lòng nhập họ và tên.");
      return;
    }
    if (!username.trim()) {
      toast.error("Vui lòng nhập tên đăng nhập.");
      return;
    }
    if (!email.trim()) {
      toast.error("Vui lòng nhập email.");
      return;
    }

    setSaving(true);
    try {
      const uploadedAvatarUrl = await uploadAvatar();

      const payload: Record<string, any> = {
        id: user.id,
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        role,
        department,
        avatar_url: uploadedAvatarUrl || null,
        is_active: isActive,
      };

      if (newPassword.trim()) {
        payload.password = newPassword;
      }

      const res = await fetch("/api/admin/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cập nhật thất bại.");

      toast.success("Cập nhật tài khoản thành công!");
      setAvatarUrl(uploadedAvatarUrl || "");
      setAvatarFile(null);
      onSaved();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={() => !saving && onClose()}
        className="absolute inset-0 bg-black/40"
      />

      <Card className="w-full max-w-2xl bg-surface-bright shadow-[0_32px_64px_rgba(19,27,46,0.12)] relative z-10 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-surface-container-low flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-on-surface flex items-center gap-2 font-manrope">
              <User className="h-5 w-5 text-primary" />
              Chỉnh Sửa Tài Khoản
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Quản lý thông tin nhân sự và đặc quyền
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-all duration-150"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

            {/* Avatar */}
            <div className="flex flex-col gap-4 rounded-xl bg-surface-container-low p-4 sm:flex-row sm:items-center">
              <UserAvatar
                name={name || username || email}
                src={avatarPreview || avatarUrl}
                size="lg"
                className="ring-2 ring-surface-bright"
              />
              <div className="min-w-0 flex-1">
                <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 uppercase">
                  <ImagePlus className="h-3.5 w-3.5 text-on-surface-variant" />
                  Ảnh đại diện
                </label>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Admin có thể thay ảnh đại diện cho tài khoản này.
                </p>
                {avatarFile && (
                  <p className="mt-1 truncate text-xs font-medium text-primary">
                    Đã chọn: {avatarFile.name}
                  </p>
                )}
              </div>
              <label className={`inline-flex items-center justify-center gap-2 rounded-xl bg-surface-bright px-3.5 py-2.5 text-sm font-semibold text-on-surface shadow-ambient transition-all duration-150 hover:bg-surface-container ${saving ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                <ImagePlus className="h-4 w-4" />
                Chọn ảnh
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  disabled={saving}
                  className="sr-only"
                />
              </label>
            </div>

            {/* Grid: Full Name + Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 uppercase">
                  <User className="h-3.5 w-3.5 text-on-surface-variant" />
                  Họ và tên
                </label>
                <input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                  className="w-full px-3.5 py-2.5 bg-surface-bright rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 uppercase">
                  <User className="h-3.5 w-3.5 text-on-surface-variant" />
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  placeholder="nguyenvanA"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={saving}
                  className="w-full px-3.5 py-2.5 bg-surface-bright rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 uppercase">
                <Mail className="h-3.5 w-3.5 text-on-surface-variant" />
                Địa chỉ Email
              </label>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving}
                className="w-full px-3.5 py-2.5 bg-surface-bright rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-150"
              />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 uppercase">
                <Building2 className="h-3.5 w-3.5 text-on-surface-variant" />
                Phòng ban
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={saving}
                className="w-full px-3.5 py-2.5 bg-surface-bright rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-150"
              >
                <option value="TECH">Phòng Kỹ Thuật (TECH)</option>
                <option value="SALES">Phòng Kinh Doanh (SALES)</option>
              </select>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 uppercase">
                <ShieldCheck className="h-3.5 w-3.5 text-on-surface-variant" />
                Vai trò (Role)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "ADMIN" | "USER")}
                disabled={saving}
                className="w-full px-3.5 py-2.5 bg-surface-bright rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-150"
              >
                <option value="USER">USER (Nhân viên)</option>
                <option value="ADMIN">ADMIN (Quản trị)</option>
              </select>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 uppercase">
                <KeyRound className="h-3.5 w-3.5 text-on-surface-variant" />
                Mật khẩu mới
              </label>
              <input
                type="password"
                placeholder="Để trống nếu giữ nguyên mật khẩu cũ"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={saving}
                className="w-full px-3.5 py-2.5 bg-surface-bright rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-150"
              />
              <p className="text-[10px] text-on-surface-variant mt-1">
                Chỉ nhập nếu muốn thay đổi mật khẩu. Để trống sẽ giữ nguyên mật khẩu hiện tại.
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={saving}
                className="w-5 h-5 rounded-lg text-primary focus:ring-primary/30 bg-surface-bright transition-all duration-150 cursor-pointer disabled:opacity-50"
              />
              <label htmlFor="is_active" className="cursor-pointer select-none">
                <span className="text-sm font-semibold text-on-surface">Cho phép hoạt động</span>
                <p className="text-xs text-on-surface-variant">Tài khoản có thể đăng nhập khi được bật</p>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 bg-surface-container-low flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant text-sm font-semibold transition-all duration-150"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl gradient-primary text-on-primary text-sm font-semibold transition-all duration-150 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
