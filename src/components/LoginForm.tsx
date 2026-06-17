"use client";

import { useFormStatus } from "react-dom";
import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticate } from "@/app/actions/auth-actions";
import Image from "next/image";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-600/10 active:scale-[0.99] hover:shadow-indigo-600/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
      type="submit"
      disabled={pending}
    >
      {pending ? (
        <>
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          <span>Đang xác thực...</span>
        </>
      ) : (
        <>
          <span>Đăng nhập ngay</span>
          <span className="material-symbols-outlined text-[18px]">login</span>
        </>
      )}
    </button>
  );
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  
  // Initialize state with URL error if present
  const [state, formAction] = useActionState(authenticate, {
    error: urlError === "CredentialsSignin" 
      ? "Tên đăng nhập hoặc mật khẩu không chính xác!" 
      : urlError 
        ? "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau." 
        : undefined,
    success: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState(false);

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 sm:p-10 relative z-10">
      {/* Logo for mobile */}
      <div className="text-center mb-8">
        <div className="inline-flex lg:hidden items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg overflow-hidden relative bg-slate-800 flex items-center justify-center">
            <Image src="/SPlogo-white.png" alt="SPS AI" fill className="object-contain" sizes="36px" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">SPS AI</h1>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Đăng nhập hệ thống</h3>
        <p className="text-sm text-slate-400">Tài khoản do HR cấp. Liên hệ quản lý nếu chưa có.</p>
      </div>

      {/* Form */}
      <form action={formAction} className="space-y-6">
        {/* Error Alert Display - Phải hiển thị nổi bật phía trên form */}
        {state?.error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-semibold flex gap-2 animate-shake">
            <span className="material-symbols-outlined text-[16px] flex-shrink-0 text-red-500">error</span>
            <span>{state?.error}</span>
          </div>
        )}

        {/* Username Field */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 tracking-wide uppercase" htmlFor="username">
            TÊN ĐĂNG NHẬP (USERNAME)
          </label>
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              person
            </span>
            <input
              className="w-full pl-12 pr-4 py-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              id="username"
              name="username"
              placeholder="Nhập tên đăng nhập của bạn"
              required
              type="text"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 tracking-wide uppercase" htmlFor="password">
              Mật khẩu
            </label>
          </div>
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              lock
            </span>
            <input
              className="w-full pl-12 pr-12 py-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              id="password"
              name="password"
              placeholder="Nhập mật khẩu"
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

        {/* Remember Me Checkbox & Forgot Password */}
        <div className="flex items-center justify-between">
          <label htmlFor="remember_me" className="flex items-center gap-2 cursor-pointer select-none">
            <input
              id="remember_me"
              name="remember_me"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-slate-900 cursor-pointer"
            />
            <span className="text-sm text-slate-400 font-medium">
              Ghi nhớ đăng nhập
            </span>
          </label>
          <button
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            type="button"
            tabIndex={-1}
            onClick={() => setForgotPasswordMsg(!forgotPasswordMsg)}
          >
            Quên mật khẩu?
          </button>
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

        {/* Submit Button */}
        <SubmitButton />
      </form>
    </div>
  );
}
