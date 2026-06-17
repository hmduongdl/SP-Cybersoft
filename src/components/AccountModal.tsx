"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { User, Mail, Building2, Loader2, X, Link, UserCircle, Camera, UploadCloud } from "lucide-react";
import { UserAvatar } from "./shared/user-avatar";
import { cn } from "@/lib/utils";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountModal({ isOpen, onClose }: AccountModalProps) {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState(session?.user?.name ?? "");
  const [username, setUsername] = useState("");
  const [usernameChanged, setUsernameChanged] = useState(false);
  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [department, setDepartment] = useState("");
  const [facebookLink, setFacebookLink] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Avatar upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync session data when it arrives
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setName(session.user.name ?? "");
      setEmail(session.user.email ?? "");
      setDepartment((session.user as any)?.department ?? "");
      setAvatarUrl((session.user as any)?.avatar_url || null);
    }
  }, [session, status]);

  // Load full profile when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);
    setUploading(false);
    setUploadProgress(0);
    setIsDragging(false);

    async function loadData() {
      try {
        const profileRes = await fetch("/api/user/profile", { cache: "no-store" });
        if (!active) return;

        if (profileRes.ok) {
          const data = await profileRes.json();
          if (data?.user) {
            setName(data.user.name ?? name);
            setUsername(data.user.username ?? "");
            setUsernameChanged(data.user.username_changed ?? false);
            setEmail(data.user.email ?? email);
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
    return () => { active = false; };
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
      // Cập nhật session + dispatch event site-wide để avatar hiển thị ở mọi nơi
      if (update) await update();
      window.dispatchEvent(new CustomEvent("profile-updated"));
      router.refresh();
      toast.success("Tải ảnh đại diện thành công!");
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) uploadAvatar(f);
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

    if (!email.trim()) {
      toast.error("Vui lòng nhập email liên lạc.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        email: email.trim(),
        facebook_link: facebookLink.trim() || null,
        username: username.trim(),
      };

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
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi khi lưu thông tin.";
      console.error(error);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const departmentLabel =
    department === "SALES" ? "Phòng Kinh Doanh" : "Phòng Kỹ Thuật";
  const departmentBadgeClass =
    department === "SALES"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-sky-50 text-sky-700 border-sky-200";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm px-4">
      <div className="bg-surface-bright rounded-2xl shadow-[0_32px_64px_rgba(19,27,46,0.12)] w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface-container-low">
          <div>
            <h2 className="text-xl font-semibold text-on-surface font-manrope">Tài khoản cá nhân</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">Quản lý thông tin cá nhân của bạn.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-all duration-150"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {status === "loading" || loading ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <Loader2 className="h-9 w-9 animate-spin text-primary" />
              <p className="text-sm">Đang tải thông tin tài khoản...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-6">

              {/* ── Avatar upload ── */}
              <div className="flex items-start gap-5 mb-6">
                <div className="relative flex-shrink-0">
                  {avatarUrl ? (
                    <div className="w-20 h-20 rounded-full overflow-hidden">
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                      <div className="hidden w-full h-full items-center justify-center">
                        <UserAvatar name={name || null} size="lg" />
                      </div>
                    </div>
                  ) : (
                    <UserAvatar name={name || null} size="lg" />
                  )}

                  {/* Upload progress ring */}
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-on-surface/60 rounded-full">
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                        <circle
                          cx="20" cy="20" r="16"
                          fill="none" stroke="#818cf8" strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${uploadProgress * 1.0048} 100.48`}
                        />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all",
                      isDragging
                        ? "border-indigo-400 bg-indigo-50"
                        : "hover:bg-surface-container-low"
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2.5 rounded-xl transition-colors",
                        isDragging ? "bg-indigo-200" : "bg-surface-container"
                      )}>
                        <UploadCloud className={cn(
                          "w-5 h-5",
                          isDragging ? "text-indigo-600" : "text-on-surface-variant"
                        )} />
                      </div>
                      <div>
                        {uploading ? (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-primary">Đang tải lên... ({uploadProgress}%)</p>
                            <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden w-32">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-200"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-on-surface">
                              Kéo thả ảnh hoặc <span className="text-primary underline underline-offset-2">click để chọn</span>
                            </p>
                            <p className="text-xs text-on-surface-variant mt-0.5">JPG, PNG, WEBP — Tối đa 2MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1.5 flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    Hoặc nhấn <kbd className="px-1 py-0.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface-variant text-[10px] font-mono">Ctrl+V</kbd> để dán ảnh từ clipboard
                  </p>
                </div>
              </div>

              {/* Grid fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* KHÓA CỨNG: Họ và tên */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant flex items-center gap-2 uppercase">
                    <UserCircle className="w-4 h-4 text-on-surface-variant" /> Họ và tên
                  </label>
                  <input
                    type="text"
                    value={name ?? ""}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 bg-surface-container-low text-on-surface-variant rounded-lg text-sm cursor-not-allowed"
                  />
                </div>

                {/* Tên đăng nhập */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant flex items-center gap-2 uppercase">
                    <User className="w-4 h-4 text-on-surface-variant" /> Tên đăng nhập
                  </label>
                  <input
                    type="text"
                    value={username ?? ""}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                    disabled={saving || usernameChanged}
                    required
                    className="w-full px-3 py-2 bg-surface-bright rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-150 disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:cursor-not-allowed"
                  />
                  {usernameChanged ? (
                    <p className="text-[10px] text-on-surface-variant mt-1">Bạn đã đổi username nên không thể đổi lại.</p>
                  ) : (
                    <p className="text-[10px] text-amber-600 mt-1 font-medium">Bạn chỉ được đổi username 1 lần duy nhất.</p>
                  )}
                </div>

                {/* Phòng ban */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant flex items-center gap-2 uppercase">
                    <Building2 className="w-4 h-4 text-on-surface-variant" /> Phòng ban
                  </label>
                  <div className="pt-1">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${departmentBadgeClass}`}>
                      {departmentLabel}
                    </span>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant flex items-center gap-2 uppercase">
                    <Mail className="w-4 h-4 text-on-surface-variant" /> Email liên lạc
                  </label>
                  <input
                    type="email"
                    value={email ?? ""}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nguyenvana@gmail.com"
                    disabled={saving}
                    required
                    className="w-full px-3 py-2 bg-surface-bright rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                  />
                </div>

                {/* Facebook */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant flex items-center gap-2 uppercase">
                    <Link className="w-4 h-4 text-on-surface-variant" /> Link Facebook
                  </label>
                  <input
                    type="url"
                    value={facebookLink ?? ""}
                    onChange={(e) => setFacebookLink(e.target.value)}
                    placeholder="https://facebook.com/username"
                    disabled={saving}
                    className="w-full px-3 py-2 bg-surface-bright rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2.5 text-sm font-semibold text-on-surface-variant bg-surface-container-low rounded-xl hover:bg-surface-container transition-all duration-150"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-semibold text-on-primary gradient-primary rounded-xl transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
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
    </div>
  );
}
