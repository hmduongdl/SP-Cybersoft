"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const TEAM_LABELS: Record<string, string> = {
  TECH: "Phòng Kỹ thuật",
  SALES: "Phòng Kinh doanh",
};

export function OnboardingModal() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = session?.user;
  const [formData, setFormData] = useState({
    full_name: user?.name || "",
    username: user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
    facebook_link: user?.facebook_link || "",
  });

  // Sync from session when it loads
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        full_name: prev.full_name || user.name || "",
        username: prev.username || user.username || "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || "",
        facebook_link: prev.facebook_link || user.facebook_link || "",
      }));
    }
  }, [user]);

  const departmentLabel =
    TEAM_LABELS[user?.department || ""] || user?.department || "—";

  const isFormValid =
    formData.full_name.trim().length > 0 &&
    formData.username.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    avatarFile !== null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileDrop = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Chỉ chấp nhận file ảnh (JPG, PNG, ...)");
      return;
    }
    setError(null);
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileDrop(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileDrop(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;
    setError(null);
    setIsLoading(true);

    try {
      // Build single FormData with all fields + avatar file
      const fd = new FormData();
      fd.append("full_name", formData.full_name.trim());
      fd.append("username", formData.username.trim());
      fd.append("email", formData.email.trim());
      if (formData.phone.trim()) fd.append("phone", formData.phone.trim());
      if (formData.facebook_link.trim()) fd.append("facebook_link", formData.facebook_link.trim());
      if (avatarFile) fd.append("file", avatarFile);

      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Đã xảy ra lỗi khi cập nhật.");
        setIsLoading(false);
        return;
      }

      // Sync session with latest user data
      await update({ is_onboarded: true });
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Không thể kết nối đến máy chủ.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] p-8 relative z-10 my-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl mb-4 shadow-[0_0_20px_rgba(79,70,229,0.2)]">
            <span className="material-symbols-outlined text-indigo-400 text-3xl">rocket_launch</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Chào mừng thành viên mới</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Vui lòng hoàn tất thông tin dưới đây để kích hoạt tài khoản của bạn.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500 text-xl">error</span>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Avatar */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Ảnh đại diện <span className="text-red-400">*</span>
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-xl bg-slate-950/50 cursor-pointer transition-all ${
                dragOver
                  ? "border-indigo-500 bg-indigo-500/10"
                  : avatarPreview
                    ? "border-indigo-500/40 hover:border-indigo-500/60"
                    : "border-slate-700 hover:border-slate-600"
              }`}
            >
              {avatarPreview ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-indigo-500/30 shadow-lg shadow-indigo-500/10 relative bg-slate-800">
                    <Image
                      src={avatarPreview}
                      alt="Avatar preview"
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  </div>
                  <span className="text-xs text-slate-500 hover:text-slate-400 transition-colors">
                    Nhấn để thay đổi ảnh
                  </span>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-500 text-3xl">person</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-300 font-medium">
                      Kéo & thả ảnh vào đây
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      hoặc nhấn để chọn file · JPG, PNG tối đa 5MB
                    </p>
                  </div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Họ và tên <span className="text-red-400">*</span>
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                badge
              </span>
              <input
                className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-all"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Tên đăng nhập (Username) <span className="text-red-400">*</span>
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                person
              </span>
              <input
                className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-indigo-500/40 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-all"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="username"
              />
            </div>
            <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">info</span>
              Username sẽ được dùng làm khóa đăng nhập chính thức. Chỉ được thay đổi duy nhất <strong>một lần</strong> tại đây.
            </p>
          </div>

          {/* Email & Phone - grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Email liên lạc <span className="text-red-400">*</span>
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  mail
                </span>
                <input
                  type="email"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-all"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="nguyenvana@gmail.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Số điện thoại
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  call
                </span>
                <input
                  type="tel"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-all"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0912 345 678"
                />
              </div>
            </div>
          </div>

          {/* Facebook link */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Link Facebook cá nhân
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 group-focus-within:text-blue-400 transition-colors">
                link
              </span>
              <input
                type="url"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all"
                name="facebook_link"
                value={formData.facebook_link}
                onChange={handleChange}
                placeholder="https://facebook.com/username"
              />
            </div>
          </div>

          {/* Department - locked badge */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Phòng ban
            </label>
            <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="material-symbols-outlined text-slate-500">business</span>
              <span className="flex-1 text-white font-medium">{departmentLabel}</span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800 text-slate-400 text-xs rounded-full border border-slate-700/50">
                <span className="material-symbols-outlined text-[12px]">lock</span>
                Cố định
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-6 mt-6 border-t border-slate-800/80">
            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 active:scale-[0.99] hover:shadow-indigo-600/30 disabled:shadow-none disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">task_alt</span>
                  Hoàn tất đăng ký
                </>
              )}
            </button>
            {!isFormValid && (
              <p className="text-xs text-slate-500 text-center mt-3">
                Vui lòng điền đầy đủ Họ tên, Username, Email và tải lên ảnh đại diện
              </p>
            )}
          </div>
        </form>

      </div>
    </div>
  );
}
