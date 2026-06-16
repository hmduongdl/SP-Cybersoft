"use client";

import { useState, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { update } = useSession();
  const router = useRouter();

  // Form states
  const [formData, setFormData] = useState({
    full_name: "",
    gmail: "",
    department: "Tech",
    avatar_url: "",
    facebook_profile_url: "",
    new_password: "",
    confirm_password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => {
    setError(null);
    if (step === 1) {
      if (!formData.full_name || !formData.gmail || !formData.department) {
        setError("Vui lòng điền đầy đủ thông tin bắt buộc.");
        return;
      }
    } else if (step === 2) {
      // url validation could go here
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.new_password !== formData.confirm_password) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (formData.new_password.length < 8 || !/\d/.test(formData.new_password)) {
      setError("Mật khẩu phải có ít nhất 8 ký tự và bao gồm số.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/users/me/onboarding", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Đã xảy ra lỗi khi cập nhật.");
        setIsLoading(false);
        return;
      }

      // Success, update session and redirect to dashboard
      await update({ is_first_login: false });
      router.push("/dashboard");
    } catch (err) {
      setError("Không thể kết nối đến máy chủ.");
      setIsLoading(false);
    }
  };

  // Avatar handler (Mock base64 for now)
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <main className="w-full min-h-screen flex items-center justify-center bg-slate-950 font-sans p-6 overflow-hidden relative">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(79,70,229,0.15),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(56,189,248,0.1),transparent_50%)] pointer-events-none" />
      
      <div className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl mb-4 shadow-[0_0_20px_rgba(79,70,229,0.2)]">
            <span className="material-symbols-outlined text-indigo-400 text-3xl">rocket_launch</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Chào mừng thành viên mới</h1>
          <p className="text-slate-400">Vui lòng hoàn tất thông tin để kích hoạt tài khoản của bạn.</p>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center justify-center mb-10 relative">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-800 -z-10" />
          <div className="flex justify-between w-full max-w-md">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 shadow-lg ${
                    step >= s 
                      ? "bg-indigo-600 text-white shadow-indigo-500/30 ring-4 ring-slate-900" 
                      : "bg-slate-800 text-slate-500 ring-4 ring-slate-900"
                  }`}
                >
                  {step > s ? <span className="material-symbols-outlined text-[20px]">check</span> : s}
                </div>
                <span className={`mt-2 text-xs font-medium ${step >= s ? "text-indigo-300" : "text-slate-500"}`}>
                  {s === 1 ? "Cơ bản" : s === 2 ? "Mạng xã hội" : "Bảo mật"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-3 animate-fadeIn">
            <span className="material-symbols-outlined text-red-500">error</span>
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Họ và tên *</label>
                  <input
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Gmail cá nhân *</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                    name="gmail"
                    value={formData.gmail}
                    onChange={handleChange}
                    placeholder="nguyenvana@gmail.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Phòng ban *</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all appearance-none"
                >
                  <option value="Tech">Tech</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Other">Khác</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Ảnh đại diện (Tùy chọn)</label>
                <div className="flex items-center gap-4 p-4 border border-slate-800 border-dashed rounded-xl bg-slate-950/50 hover:bg-slate-900 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {formData.avatar_url ? (
                      <img src={formData.avatar_url} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-slate-500 text-3xl">person</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 cursor-pointer"
                    />
                    <p className="mt-1 text-xs text-slate-500">JPG, PNG. Kích thước tối đa 2MB.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex gap-4">
                <span className="material-symbols-outlined text-indigo-400 text-2xl flex-shrink-0">verified_user</span>
                <div>
                  <h4 className="text-sm font-semibold text-indigo-300 mb-1">Mục đích sử dụng Mạng xã hội</h4>
                  <p className="text-xs text-indigo-200/70 leading-relaxed">
                    Hệ thống cần liên kết với tài khoản Facebook cá nhân của bạn để kiểm tra, chấm điểm tương tác và thống kê KPI truyền thông nội bộ. Thông tin này được bảo mật và chỉ sử dụng cho mục đích nội bộ.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Link Facebook cá nhân</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    link
                  </span>
                  <input
                    type="url"
                    className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                    name="facebook_profile_url"
                    value={formData.facebook_profile_url}
                    onChange={handleChange}
                    placeholder="https://facebook.com/username"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-4">
                <span className="material-symbols-outlined text-amber-400 text-2xl flex-shrink-0">lock_reset</span>
                <div>
                  <h4 className="text-sm font-semibold text-amber-300 mb-1">Thiết lập bảo mật</h4>
                  <p className="text-xs text-amber-200/70 leading-relaxed">
                    Đây là lần đăng nhập đầu tiên. Bạn bắt buộc phải đổi mật khẩu mặc định để bảo vệ tài khoản cá nhân.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Mật khẩu mới *</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                  name="new_password"
                  value={formData.new_password}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
                <p className="text-xs text-slate-500">Tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ số.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Xác nhận mật khẩu *</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 rounded-xl font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Trở lại
              </button>
            ) : (
              <div /> // Spacer
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2"
              >
                Tiếp tục
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? "Đang xử lý..." : "Hoàn tất & Đăng nhập"}
                {!isLoading && <span className="material-symbols-outlined text-[18px]">task_alt</span>}
              </button>
            )}
          </div>
        </form>

      </div>
    </main>
  );
}
