"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { User, Mail, Building2, Loader2, X, Camera, Link } from "lucide-react";
import { UserAvatar } from "./user-avatar";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}



export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(session?.user?.name || "");
  const [username, setUsername] = useState("");
  const [usernameChanged, setUsernameChanged] = useState(false);
  const [email, setEmail] = useState(session?.user?.email || "");
  const [department, setDepartment] = useState("Other");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [facebookLink, setFacebookLink] = useState(
    (session?.user as any)?.facebook_profile_url || ""
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync session data when it arrives
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
      const deptFromSession = (session.user as any)?.department || "";
      setDepartment(deptFromSession || "Other");
      setAvatarUrl((session.user as any)?.avatar_url || null);
      setFacebookLink((session.user as any)?.facebook_profile_url || "");
      // username is updated by the API GET call, so it's not strictly needed from session here if not available
    }
  }, [session, status]);

  // Load full profile and departments from API when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);

    async function loadData() {
      try {
        const [profileRes, deptsRes] = await Promise.all([
          fetch("/api/user/profile", { cache: "no-store" }),
          fetch("/api/admin/departments")
        ]);
        if (!active) return;

        if (deptsRes.ok) {
          const deptsData = await deptsRes.json();
          if (deptsData.departments) {
            setDepartments(deptsData.departments);
          }
        }

        if (profileRes.ok) {
          const data = await profileRes.json();
          if (data?.user) {
            setName(data.user.name || name);
            setUsername(data.user.username || "");
            setUsernameChanged(data.user.username_changed || false);
            setEmail(data.user.email || email);
            setDepartment(data.user.department || "Other");
            setAvatarUrl(data.user.avatar_url || null);
            setFacebookLink(data.user.facebook_profile_url || "");
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

    const trimmedName = name.trim();
    const trimmedUsername = username.trim();
    if (!trimmedName) {
      toast.error("Vui lòng nhập họ và tên.");
      return;
    }
    if (!trimmedUsername) {
      toast.error("Vui lòng nhập username.");
      return;
    }
    if (trimmedUsername.includes(" ")) {
      toast.error("Username không được chứa khoảng trắng.");
      return;
    }

    setSaving(true);
    try {
      let finalAvatarUrl = avatarUrl;

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
        finalAvatarUrl = uploadData.avatar_url;
        setAvatarUrl(finalAvatarUrl);
      }

      // Update profile fields
      const payload = {
        name: trimmedName,
        username: trimmedUsername,
        department: department,
        facebook_profile_url: facebookLink.trim() || null,
        ...(finalAvatarUrl !== undefined ? { avatar_url: finalAvatarUrl } : {}),
      };

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Cập nhật thất bại.");
      }

      if (update) {
        await update();
      }

      window.dispatchEvent(new CustomEvent("profile-updated"));
      toast.success("Cập nhật thông tin cá nhân thành công!");
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
                  <UserAvatar name={name || null} />
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
                    {name || "Ảnh đại diện"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    JPG, PNG. Tối đa 2MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                    <User className="w-4 h-4 text-slate-400" /> Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                    className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    required
                    disabled={saving || usernameChanged}
                  />
                  {usernameChanged ? (
                    <p className="text-[10px] text-slate-500 mt-1">Bạn đã đổi username nên không thể đổi lại lần nữa.</p>
                  ) : (
                    <p className="text-[10px] text-amber-600 mt-1 font-medium">Lưu ý: Bạn chỉ được đổi username 1 lần duy nhất trong suốt vòng đời tài khoản.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                    <User className="w-4 h-4 text-slate-400" /> Họ và tên
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    value={email}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                    <Link className="w-4 h-4 text-slate-400" /> Link Profile Facebook (Dùng để đối chiếu)
                  </label>
                  <input
                    type="url"
                    value={facebookLink}
                    onChange={(e) => setFacebookLink(e.target.value)}
                    placeholder="https://facebook.com/your-username"
                    disabled={saving}
                    className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                    <Building2 className="w-4 h-4 text-slate-400" /> Phòng ban
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={saving}
                    className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                    <option value="Other">Khác</option>
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
