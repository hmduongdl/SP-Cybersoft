"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  Mail,
  Briefcase,
  Link2,
  Lock,
  Camera,
  UploadCloud,
  X,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { UserAvatar } from "./shared/user-avatar";
import { cn } from "@/lib/utils";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountModal({ isOpen, onClose }: AccountModalProps) {
  const { status, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameChanged, setUsernameChanged] = useState(false);
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [facebookLink, setFacebookLink] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  // Avatar upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Load full profile when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);
    setUploading(false);
    setUploadProgress(0);
    setIsDragging(false);
    setShowUploadPanel(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    async function loadData() {
      try {
        const profileRes = await fetch("/api/user/profile", {
          cache: "no-store",
        });
        if (!active) return;

        if (profileRes.ok) {
          const data = await profileRes.json();
          if (data?.user) {
            setName(data.user.name ?? "");
            setUsername(data.user.username ?? "");
            setUsernameChanged(data.user.username_changed ?? false);
            setEmail(data.user.email ?? "");
            setDepartment(data.user.department ?? "");
            setFacebookLink(data.user.facebook_link ?? "");
            setAvatarUrl(data.user.avatar_url ?? null);
          }
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
        toast.error("Lỗi khi tải thông tin.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Upload avatar via XHR ──
  const uploadAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Dung lượng vượt quá 2MB.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const url = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.url) {
                setUploadProgress(100);
                resolve(data.url);
              } else {
                reject(new Error(data.error || "Server không trả về URL."));
              }
            } catch {
              reject(new Error("Response không phải JSON hợp lệ."));
            }
          } else {
            let msg = "Tải ảnh lên thất bại.";
            try {
              const data = JSON.parse(xhr.responseText);
              msg = data.error || msg;
            } catch {}
            reject(new Error(msg));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Mất kết nối tới máy chủ."));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload bị huỷ."));
        });

        xhr.open("POST", "/api/upload/avatar");
        xhr.send(fd);
      });

      setAvatarUrl(url);
      if (update) await update();
      window.dispatchEvent(new CustomEvent("profile-updated"));
      router.refresh();
      toast.success("Tải ảnh đại diện thành công!");
      setShowUploadPanel(false);
    } catch (err: any) {
      setUploadProgress(0);
      toast.error(err.message || "Tải ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  };

  const uploadAvatarRef = useRef(uploadAvatar);
  uploadAvatarRef.current = uploadAvatar;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadAvatar(f);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Clipboard paste ──
  useEffect(() => {
    if (!isOpen || uploading) return;

    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") === 0) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            uploadAvatarRef.current(file);
            break;
          }
        }
      }
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [isOpen, uploading]);

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validate password fields if any are filled
    if (newPassword || currentPassword || confirmPassword) {
      if (!currentPassword) {
        toast.error("Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Mật khẩu mới và xác nhận mật khẩu không khớp.");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("Mật khẩu mới phải có tối thiểu 6 ký tự.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        email: email.trim(),
        facebook_link: facebookLink.trim() || null,
        username: username.trim(),
       };

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Cập nhật thất bại.");
      }

      if (update) await update();
      window.dispatchEvent(new CustomEvent("profile-updated"));
      toast.success("Cập nhật thông tin cá nhân thành công!");
      router.refresh();

      // Reset password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Lỗi khi lưu thông tin.";
      console.error(error);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Trạng thái verified: có đủ name + email + facebook_link
  const isVerified = !!name.trim() && !!email.trim() && !!facebookLink.trim();
  const missingFields: string[] = [];
  if (!name.trim()) missingFields.push("Họ tên");
  if (!email.trim()) missingFields.push("Email");
  if (!facebookLink.trim()) missingFields.push("Link Facebook");

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              Tài khoản cá nhân
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  Hồ sơ đã xác minh
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  <ShieldAlert className="w-3 h-3" />
                  Hồ sơ chưa đầy đủ — thiếu: {missingFields.join(", ")}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {status === "loading" || loading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-9 w-9 animate-spin text-indigo-600" />
            <p className="text-sm text-slate-500">Đang tải thông tin tài khoản...</p>
          </div>
        ) : (
          <form
            onSubmit={handleSaveProfile}
            className="p-6 overflow-y-auto space-y-5 flex-1"
          >
            {/* Section 1: Centered Avatar + Upload Panel */}
            <div className="flex flex-col items-center justify-center space-y-3 pb-2">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-500/10 ring-4 ring-indigo-50 bg-slate-50 flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <UserAvatar name={name || null} size="lg" />
                  )}
                </div>

                {/* Upload progress ring */}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-full">
                    <svg
                      className="w-10 h-10 -rotate-90"
                      viewBox="0 0 40 40"
                    >
                      <circle
                        cx="20" cy="20" r="16"
                        fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3"
                      />
                      <circle
                        cx="20" cy="20" r="16"
                        fill="none" stroke="#818cf8" strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${uploadProgress * 1.0048} 100.48`}
                      />
                    </svg>
                  </div>
                )}

                {/* Camera button */}
                <button
                  type="button"
                  onClick={() => setShowUploadPanel(!showUploadPanel)}
                  className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all active:scale-90"
                  title="Thay đổi ảnh đại diện"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Collapsible Upload Panel */}
              {showUploadPanel && (
                <div className="w-full max-w-sm bg-slate-50/80 border border-slate-200/60 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-indigo-500" />
                      Tải lên ảnh mới
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowUploadPanel(false)}
                      className="p-1 text-slate-400 hover:bg-slate-200/50 hover:text-slate-600 rounded-lg transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Drag & drop zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) uploadAvatar(f);
                    }}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl cursor-pointer p-4 transition-all bg-white",
                      isDragging
                        ? "border-indigo-400 bg-indigo-50/10"
                        : "border-slate-200 hover:border-indigo-400"
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {uploading ? (
                      <div className="space-y-2 text-center">
                        <p className="text-sm font-medium text-indigo-600">
                          Đang tải lên... ({uploadProgress}%)
                        </p>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden w-full max-w-32 mx-auto">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                        <p className="text-sm font-semibold text-slate-700">
                          Kéo thả ảnh hoặc{" "}
                          <span className="text-indigo-600 underline underline-offset-2">
                            click để chọn
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          JPG, PNG, WEBP — Tối đa 2MB
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
                    <Camera className="w-3 h-3" />
                    Hoặc nhấn{" "}
                    <kbd className="px-1 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-mono">
                      Ctrl+V
                    </kbd>{" "}
                    để dán ảnh từ clipboard
                  </p>
                </div>
              )}
            </div>

            {/* Section 2: Profile fields — single column */}
            <div className="space-y-4">
              {/* Họ và tên (read-only) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={name ?? ""}
                  readOnly
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200/40 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                />
              </div>

              {/* Tên đăng nhập */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  value={username ?? ""}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
                  }
                  disabled={saving || usernameChanged}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm text-slate-900 placeholder:text-slate-400 disabled:opacity-70 disabled:cursor-not-allowed"
                />
                {usernameChanged ? (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Bạn đã đổi username nên không thể đổi lại.
                  </p>
                ) : (
                  <p className="text-[10px] text-amber-600 block mt-0.5 font-medium">
                    Bạn chỉ được đổi username 1 lần duy nhất.
                  </p>
                )}
              </div>

              {/* Phòng ban */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  Phòng ban
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm text-slate-900"
                >
                  <option value="TECH">Phòng Kỹ Thuật (TECH)</option>
                  <option value="SALES">Phòng Kinh Doanh (SALES)</option>
                  <option value="MARKETING">Phòng Marketing</option>
                  <option value="HR">Phòng Nhân Sự</option>
                  <option value="Other">Khác</option>
                </select>
              </div>

              {/* Email liên lạc */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Email liên lạc
                </label>
                <input
                  type="email"
                  value={email ?? ""}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nguyenvana@gmail.com"
                  disabled={saving}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {/* Link Facebook */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-slate-400" />
                  Link Facebook cá nhân
                </label>
                <input
                  type="url"
                  value={facebookLink ?? ""}
                  onChange={(e) => setFacebookLink(e.target.value)}
                  placeholder="https://facebook.com/username"
                  disabled={saving}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Divider: Password Change Section */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 font-bold text-indigo-600 tracking-widest flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  Thay đổi mật khẩu
                </span>
              </div>
            </div>

            {/* Section 3: Password fields */}
            <div className="space-y-4">
              {/* Mật khẩu hiện tại */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm text-slate-900"
                    placeholder="Nhập mật khẩu cũ nếu muốn đổi"
                  />
                  <button
                    type="button"
                    onMouseDown={() => setShowCurrentPass(true)}
                    onMouseUp={() => setShowCurrentPass(false)}
                    onMouseLeave={() => setShowCurrentPass(false)}
                    onTouchStart={() => setShowCurrentPass(true)}
                    onTouchEnd={() => setShowCurrentPass(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-all select-none"
                  >
                    {showCurrentPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm text-slate-900"
                    placeholder="Tối thiểu 6 ký tự"
                  />
                  <button
                    type="button"
                    onMouseDown={() => setShowNewPass(true)}
                    onMouseUp={() => setShowNewPass(false)}
                    onMouseLeave={() => setShowNewPass(false)}
                    onTouchStart={() => setShowNewPass(true)}
                    onTouchEnd={() => setShowNewPass(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-all select-none"
                  >
                    {showNewPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm text-slate-900"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                  <button
                    type="button"
                    onMouseDown={() => setShowConfirmPass(true)}
                    onMouseUp={() => setShowConfirmPass(false)}
                    onMouseLeave={() => setShowConfirmPass(false)}
                    onTouchStart={() => setShowConfirmPass(true)}
                    onTouchEnd={() => setShowConfirmPass(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-all select-none"
                  >
                    {showConfirmPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-1">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium py-2.5 px-5 rounded-xl border border-slate-200/40 transition-all text-sm active:scale-95"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-xl shadow-sm transition-all text-sm active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
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
        )}
      </div>
    </div>
  );
}
