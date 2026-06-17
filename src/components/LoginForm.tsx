"use client";

import { useFormStatus } from "react-dom";
import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticate } from "@/app/actions/auth-actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="w-full py-4 gradient-primary text-on-primary font-semibold font-inter rounded-lg-xl ambient-shadow hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none transition-all duration-300 flex items-center justify-center gap-2"
      type="submit"
      disabled={pending}
    >
      {pending ? (
        <>
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Đang xác thực...</span>
        </>
      ) : (
        <>
          <span>Tiếp tục</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </>
      )}
    </button>
  );
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [state, formAction] = useActionState(authenticate, {
    error: urlError === "CredentialsSignin"
      ? "Tên đăng nhập hoặc mật khẩu không chính xác!"
      : urlError
        ? "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau."
        : undefined,
    success: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showForgotMsg, setShowForgotMsg] = useState(false);

  return (
    <div className="w-full max-w-[420px]">
      {/* Header */}
      <div className="mb-10">
        {/* Mobile inline logo */}
        <div className="flex md:hidden items-center gap-3 mb-6">
          <h1 className="text-xl font-bold text-primary font-manrope">SPS AI</h1>
        </div>
        <h2 className="text-2xl font-bold text-on-surface font-manrope mb-1">Đăng nhập</h2>
        <p className="text-sm text-on-surface-variant">Chào mừng bạn quay trở lại với SPS AI.</p>
      </div>

      {/* Form Card */}
      <div className="bg-surface-container-lowest p-8 rounded-lg-2xl ambient-shadow">
        <form action={formAction} className="space-y-5">
          {/* Error Alert */}
          {state?.error && (
            <div className="flex items-center gap-3 p-4 rounded-lg-lg bg-error-container text-sm font-semibold text-on-error-container">
              <span className="material-symbols-outlined text-[20px] flex-shrink-0">error</span>
              <span>{state.error}</span>
            </div>
          )}

          {/* Username Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-outline uppercase tracking-wider" htmlFor="username">
              Email hoặc Username
            </label>
            <div className="relative group">
              <input
                className="w-full px-4 py-3.5 bg-surface-container-low border-none rounded-lg-lg text-sm text-on-surface placeholder:text-outline/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-bright"
                id="username"
                name="username"
                placeholder="Email hoặc tên đăng nhập"
                required
                type="text"
                onFocus={() => setShowForgotMsg(false)}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-outline uppercase tracking-wider" htmlFor="password">
                Mật khẩu
              </label>
            </div>
            <div className="relative group">
              <input
                className="w-full px-4 py-3.5 bg-surface-container-low border-none rounded-lg-lg text-sm text-on-surface placeholder:text-outline/50 transition-all duration-200 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-bright"
                id="password"
                name="password"
                placeholder="••••••••"
                required
                type={showPassword ? "text" : "password"}
                onFocus={() => setShowForgotMsg(false)}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors duration-200 flex items-center justify-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* Forgot password popup */}
          <div className="text-right">
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
              onClick={() => setShowForgotMsg(!showForgotMsg)}
            >
              Quên mật khẩu?
            </button>
          </div>

          {showForgotMsg && (
            <div className="p-3 rounded-lg-lg bg-primary-container text-sm text-on-primary-fixed-variant flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5">info</span>
              <span>
                Tài khoản của bạn do Phòng Nhân sự (HR) cấp và quản lý. Vui lòng liên hệ trực tiếp với HR Admin để được cấp lại mật khẩu mới.
              </span>
            </div>
          )}

          {/* Submit */}
          <SubmitButton />
        </form>

        {/* Footer Link */}
        <div className="mt-8 pt-6 border-t border-surface-container-high/50 text-center">
          <p className="text-sm text-on-surface-variant">
            Bạn chưa có tài khoản?{" "}
            <a className="text-primary font-bold ml-1 hover:underline" href="#">
              Liên hệ quản trị viên
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
