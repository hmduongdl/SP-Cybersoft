"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const TEAM_LABELS: Record<string, string> = {
  TECH: "Phòng Kỹ thuật",
  SALES: "Phòng Kinh doanh",
};

export function OnboardingModal() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = session?.user;
  const [formData, setFormData] = useState({
    full_name: user?.name || "",
    username: user?.username || "",
    email: user?.email || "",
    facebook_link: user?.facebook_link || "",
  });

  // Sync from session when it loads
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        full_name: prev.full_name || user.name || "",
        username: prev.username || user.username || "",
        email: prev.email || user.email || "",
        facebook_link: prev.facebook_link || user.facebook_link || "",
      }));
    }
  }, [user]);

  const departmentLabel =
    TEAM_LABELS[user?.department || ""] || user?.department || "—";

  const isFormValid =
    formData.full_name.trim().length > 0 &&
    formData.username.trim().length > 0 &&
    formData.email.trim().length > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;
    setError(null);
    setIsLoading(true);

    try {
      // Build single FormData with all fields
      const fd = new FormData();
      fd.append("full_name", formData.full_name.trim());
      fd.append("username", formData.username.trim());
      fd.append("email", formData.email.trim());

      if (formData.facebook_link.trim()) fd.append("facebook_link", formData.facebook_link.trim());

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

          {/* Email */}
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
                Vui lòng điền đầy đủ Họ tên, Username và Email
              </p>
            )}
          </div>
        </form>

      </div>
    </div>
  );
}
