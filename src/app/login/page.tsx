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

  async function handleCredentialsLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
      callbackUrl,
    });

    setIsLoading(false);

    if (result?.error) {
      setError("Email hoặc mật khẩu không hợp lệ.");
      return;
    }

    window.location.href = result?.url ?? callbackUrl;
  }

  return (
    <main className="w-full flex h-screen min-h-screen overflow-hidden">
      {/* Left Side: Visual/Branding Section */}
      <section className="hidden lg:flex w-1/2 relative mesh-bg overflow-hidden flex-col justify-between p-2xl text-white">
        <div className="z-10">
          <div className="flex items-center gap-base mb-xl">
            <span className="material-symbols-outlined text-primary-fixed scale-150">hub</span>
            <h1 className="font-headline-md text-headline-md font-bold tracking-tight text-white ml-2">TeamSync HR</h1>
          </div>
          <div className="max-w-md">
            <h2 className="font-display-lg text-display-lg mb-md leading-tight">Empower your team's rhythm.</h2>
            <p className="font-body-lg text-body-lg text-primary-fixed/80">Streamline check-ins, celebrate wins, and foster professional trust with modern workspace collaboration tools.</p>
          </div>
        </div>
        
        {/* Bento-style Feature Card Overlay */}
        <div className="z-10 glass-panel rounded-2xl p-lg max-w-lg mb-2xl">
          <div className="flex items-center gap-md mb-md">
            <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-secondary-container">rocket_launch</span>
            </div>
            <div>
              <p className="font-label-md text-label-md text-white">Performance Pulse</p>
              <p className="font-label-sm text-label-sm text-primary-fixed">Real-time engagement tracking</p>
            </div>
          </div>
          <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-secondary-container w-3/4 rounded-full"></div>
          </div>
        </div>

        {/* Background Decorative Element */}
        <div className="absolute right-0 top-1/4 translate-x-1/3 opacity-20 pointer-events-none">
          <span className="material-symbols-outlined text-[400px]" style={{ fontVariationSettings: "'FILL' 1" }}>diversity_3</span>
        </div>
      </section>

      {/* Right Side: Login Form Section */}
      <section className="w-full lg:w-1/2 bg-surface flex flex-col items-center justify-center p-md sm:p-2xl overflow-y-auto">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-outline-variant/10 p-lg sm:p-xl">
          {/* Form Header */}
          <div className="text-center mb-xl">
            <div className="inline-flex lg:hidden items-center gap-sm mb-lg">
              <span className="material-symbols-outlined text-primary scale-125">hub</span>
              <h1 className="font-headline-md text-headline-md font-bold text-on-background ml-2">TeamSync HR</h1>
            </div>
            <h3 className="font-headline-lg text-headline-lg text-on-background mb-xs">Chào mừng quay lại</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Vui lòng nhập thông tin chi tiết để đăng nhập.</p>
          </div>

          {/* Login Form */}
          <form className="space-y-lg" onSubmit={handleCredentialsLogin}>
            {/* Email Field */}
            <div className="space-y-xs">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="email">Email công ty</label>
              <div className="relative group">
                <span className="absolute left-md top-1/2 -translate-y-1/2 material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">mail</span>
                <input 
                  className="w-full pl-xl pr-md py-md bg-white border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all text-on-background" 
                  id="email" 
                  name="email" 
                  placeholder="name@company.com" 
                  required 
                  type="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-xs">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="password">Mật khẩu</label>
              <div className="relative group">
                <span className="absolute left-md top-1/2 -translate-y-1/2 material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">lock</span>
                <input 
                  className="w-full pl-xl pr-md py-md bg-white border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all text-on-background" 
                  id="password" 
                  name="password" 
                  placeholder="••••••••" 
                  required 
                  type={showPassword ? "text" : "password"}
                />
                <button 
                  className="absolute right-md top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors" 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>

            {error ? (
              <p className="rounded-lg border border-error/30 bg-error-container/30 px-3 py-2 text-sm text-error font-medium">
                {error}
              </p>
            ) : null}

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-sm cursor-pointer group">
                <input className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/30 transition-all cursor-pointer" type="checkbox"/>
                <span className="font-label-md text-label-md text-on-surface-variant group-hover:text-on-surface transition-colors">Ghi nhớ đăng nhập</span>
              </label>
              <a className="font-label-md text-label-md text-primary font-semibold hover:underline transition-all" href="#">Quên mật khẩu?</a>
            </div>

            {/* Login Button */}
            <button 
              className="w-full bg-primary text-white font-label-md text-label-md py-md rounded-lg shadow-lg hover:bg-primary-container active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-sm disabled:opacity-60 font-semibold" 
              type="submit"
              disabled={isLoading}
            >
              <span>{isLoading ? "Đang đăng nhập..." : "Đăng nhập bằng Email"}</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>

            {/* SSO Alternative */}
            <div className="relative my-xl">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant/30"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-md bg-white text-outline-variant font-label-sm uppercase tracking-wider">hoặc đăng nhập bằng</span>
              </div>
            </div>

            {/* Secondary/Outline OAuth Button */}
            <div className="flex flex-col gap-md">
              <button 
                className="flex w-full items-center justify-center gap-sm py-md border border-outline-variant hover:border-primary/50 rounded-lg hover:bg-surface-container-low transition-all text-on-background font-semibold" 
                type="button"
                onClick={() => signIn("facebook", { callbackUrl })}
              >
                <svg className="w-5 h-5 text-[#1877F2] fill-current mr-1" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="font-label-md text-label-md">Facebook</span>
              </button>
            </div>
          </form>

          {/* Register Redirect Link */}
          <div className="text-center mt-md text-body-sm text-on-surface-variant">
            Chưa có tài khoản?{" "}
            <a href="#" className="text-primary font-semibold hover:underline">
              Đăng ký ngay
            </a>
          </div>

          {/* Footer Links */}
          <div className="mt-2xl flex flex-col items-center gap-sm">
            <div className="flex items-center gap-sm">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Gặp khó khăn khi đăng nhập?</span>
              <a className="font-body-sm text-body-sm text-primary font-semibold hover:underline" href="#">Liên hệ hỗ trợ HR</a>
            </div>
            <div className="flex items-center gap-xl mt-lg opacity-40 grayscale">
              <span className="material-symbols-outlined text-[24px]">shield</span>
              <span className="material-symbols-outlined text-[24px]">verified_user</span>
              <span className="material-symbols-outlined text-[24px]">lock_reset</span>
            </div>
          </div>
        </div>

        {/* Page Footer Branding for Mobile */}
        <footer className="mt-2xl lg:hidden text-center">
          <p className="font-label-sm text-label-sm text-outline-variant">© 2024 TeamSync HR. All rights reserved.</p>
        </footer>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-400 bg-surface">Đang tải...</div>}>
      <LoginForm />
    </Suspense>
  );
}
