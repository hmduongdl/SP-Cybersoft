"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { User, Mail, Building2, Loader2, X, Camera } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  department: string;
  avatar_url: string | null;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formState, setFormState] = useState<UserProfile>({
    id: "",
    username: "",
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    department: "",
    avatar_url: null,
  });
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setFormState((prev) => ({
        ...prev,
        name: session.user.name || "",
        email: session.user.email || "",
        department: (session.user as any)?.department || prev.department || "",
        avatar_url: (session.user as any)?.avatar_url || prev.avatar_url || null,
      }));
    }
  }, [session, status]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);

    async function loadData() {
      try {
        const [profileRes, deptsRes] = await Promise.all([
          fetch("/api/user/profile", { cache: "no-store" }),
          fetch("/api/admin/departments", { cache: "no-store" }),
        ]);

        if (active && profileRes.ok) {
          const data = await profileRes.json();
          if (data?.user) {
            setFormState((prev) => ({
              ...prev,
              id: data.user.id || prev.id,
              username: data.user.username || prev.username,
              name: data.user.name || prev.name,
              email: data.user.email || prev.email,
              department: data.user.department || prev.department || "",
              avatar_url: data.user.avatar_url || prev.avatar_url || null,
            }));
          }
        }

        if (active && deptsRes.ok) {
          const deptsData = await deptsRes.json();
          if (deptsData.departments) {
            setDepartments(deptsData.departments);
          }
        }
      } catch (error) {
        console.error(error);
        toast.error("Lỗi khi tải thông tin.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, [isOpen]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh.");
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.name.trim()) {
      toast.error("Vui lòng nhập họ và tên.");
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = formState.avatar_url;

      // Upload avatar first if a new file was selected
      if (avatarFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", avatarFile);
        const uploadRes = await fetch("/api/user/profile", {
          method: "POST",
          body: uploadFormData,
        });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || "Tải ảnh đại diện thất bại.");
        }
        const uploadData = await uploadRes.json();
        avatarUrl = uploadData.avatar_url;
      }

      // Update profile fields
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.name.trim(),
          department: formState.department || "",
          avatar_url: avatarUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Cập nhật thất bại.");
      }

      if (update) {
        await update({
          name: formState.name.trim(),
          avatar_url: avatarUrl,
          department: formState.department,
        });
      }

      toast.success("Cập nhật thông tin thành công!");
      router.refresh();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Lỗi khi lưu thông tin.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Tài khoản cá nhân</h2>
            <p className="text-sm text-slate-500 mt-0.5">Chỉnh sửa thông tin công ty và phòng ban của bạn.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {status === "loading" || loading ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-9 w-9 animate-spin text-indigo-600" />
              <p className="text-sm">Đang tải thông tin tài khoản...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Avatar upload */}
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center">
                    {avatarPreview || formState.avatar_url ? (
                      <img
                        src={avatarPreview || formState.avatar_url!}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                    disabled={saving}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {formState.name || "Ảnh đại diện"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    JPG, PNG. Tối đa 2MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                    <User className="w-4 h-4 text-slate-400" /> Họ và tên
                  </label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(event) => setFormState({ ...formState, name: event.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    required
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                    <Mail className="w-4 h-4 text-slate-400" /> Email liên hệ
                  </label>
                  <input
                    type="email"
                    value={formState.email}
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                    <Building2 className="w-4 h-4 text-slate-400" /> Phòng ban
                  </label>
                  <select
                    value={formState.department}
                    onChange={(event) => setFormState({ ...formState, department: event.target.value })}
                    disabled={saving}
                    className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                  >
                    {departments.length > 0 ? (
                      departments.map((dept) => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))
                    ) : (
                      <option value="">Không có phòng ban</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
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
