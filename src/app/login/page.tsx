"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent, Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const authError = searchParams.get("error");
  const [error, setError] = useState<string | null>(authError);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState(false);

  async function handleCredentialsLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setForgotPasswordMsg(false);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirect: false,
      callbackUrl,
    });

    setIsLoading(false);

    if (result?.error) {
      setError("Email hoặc mật khẩu không chính xác hoặc tài khoản đã bị khóa.");
      return;
    }

    window.location.href = result?.url ?? callbackUrl;
  }

  // Pre-fill fields helper
  const handleQuickLogin = (username: string) => {
    const usernameInput = document.getElementById("username") as HTMLInputElement;
    const passwordInput = document.getElementById("password") as HTMLInputElement;
    if (usernameInput && passwordInput) {
      usernameInput.value = username;
      passwordInput.value = "password123";
    }
  };

  return (
    <main className="w-full flex h-screen min-h-screen overflow-hidden bg-slate-900 font-sans">
      {/* Left Side: Animated Branding Panel */}
      <section className="hidden lg:flex w-1/2 relative mesh-bg overflow-hidden flex-col justify-between p-16 text-white">
        {/* Subtle Overlay Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <div className="z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[24px]">hub</span>
            </div>
            <h1 className="font-headline-md text-headline-md font-bold tracking-tight text-white">TeamSync HR</h1>
          </div>
          <div className="max-w-md space-y-4">
            <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide border border-white/15 text-primary-fixed">
              Hệ thống Kiểm Soát Truyền Thông Nội Bộ
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold font-display leading-tight tracking-tight">
              Đồng bộ nhịp điệu, tăng tốc lan tỏa.
            </h2>
            <p className="text-base text-primary-fixed/80 leading-relaxed">
              Hệ thống quản lý, báo cáo và tự động hóa chiến dịch tương tác mạng xã hội của doanh nghiệp. Đảm bảo mọi thành viên luôn đồng hành cùng thương hiệu.
            </p>
          </div>
        </div>
        
        {/* Decorative Feature Card */}
        <div className="z-10 glass-panel rounded-2xl p-6 max-w-lg mb-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-all duration-500" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-secondary-container/20 border border-secondary-container/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary-container text-[24px]">verified</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Tự Động Xác Thực EXIF</p>
              <p className="text-xs text-primary-fixed/70">Kiểm tra tính trung thực của ảnh chụp màn hình bằng AI</p>
            </div>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-secondary-container w-[88%] rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 top-1/3 translate-x-1/4 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-[360px]" style={{ fontVariationSettings: "'FILL' 1" }}>diversity_3</span>
        </div>
      </section>

      {/* Right Side: Professional Form Section */}
      <section className="w-full lg:w-1/2 bg-slate-950 flex flex-col items-center justify-center p-6 sm:p-16 overflow-y-auto relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(79,70,229,0.08),transparent_50%)] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl p-8 sm:p-10 relative z-10">
          {/* Logo for mobile */}
          <div className="text-center mb-8">
            <div className="inline-flex lg:hidden items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-primary/20 border border-primary/30 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-primary-fixed text-[20px]">hub</span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">TeamSync HR</h1>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Đăng nhập hệ thống</h3>
            <p className="text-sm text-slate-400">Tài khoản do HR cấp. Liên hệ quản lý nếu chưa có.</p>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleCredentialsLogin}>
            {/* Username Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase" htmlFor="username">
                Tên đăng nhập
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  person
                </span>
                <input 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                  id="username" 
                  name="username" 
                  placeholder="Ví dụ: admin" 
                  required 
                  type="text"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase" htmlFor="password">
                  Mật khẩu
                </label>
                <button 
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors" 
                  type="button"
                  onClick={() => setForgotPasswordMsg(!forgotPasswordMsg)}
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  lock
                </span>
                <input 
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                  id="password" 
                  name="password" 
                  placeholder="••••••••" 
                  required 
                  type={showPassword ? "text" : "password"}
                />
                <button 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors" 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <input
                id="remember_me"
                name="remember_me"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-slate-900"
              />
              <label htmlFor="remember_me" className="ml-2 block text-sm text-slate-300 cursor-pointer">
                Ghi nhớ đăng nhập
              </label>
            </div>

            {/* Forgot password message popup */}
            {forgotPasswordMsg && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 leading-relaxed flex gap-2">
                <span className="material-symbols-outlined text-[16px] flex-shrink-0 text-indigo-400">info</span>
                <span>
                  Tài khoản của bạn do Phòng Nhân sự (HR) cấp và quản lý. Vui lòng liên hệ trực tiếp với HR Admin để được cấp lại mật khẩu mới.
                </span>
              </div>
            )}

            {error ? (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium flex gap-2">
                <span className="material-symbols-outlined text-[16px] flex-shrink-0 text-red-500">error</span>
                <span>{error}</span>
              </div>
            ) : null}

            {/* Submit Button */}
            <button 
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-600/10 active:scale-[0.99] hover:shadow-indigo-600/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2" 
              type="submit"
              disabled={isLoading}
            >
              <span>{isLoading ? "Đang xác thực..." : "Đăng nhập ngay"}</span>
              {!isLoading && <span className="material-symbols-outlined text-[18px]">login</span>}
            </button>
          </form>

          {/* HR Support Information */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col gap-4 text-xs text-slate-400">
            {/* Removed policies and demo accounts per user request */}
          </div>
        </div>

        {/* Page Footer */}
        <footer className="mt-8 text-center relative z-10">
          <p className="text-xs text-slate-600">© 2026 TeamSync HR. Tất cả quyền được bảo lưu.</p>
        </footer>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-400 bg-slate-950">Đang tải...</div>}>
      <LoginForm />
    </Suspense>
  );
}
