import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex flex-col md:flex-row min-h-screen w-full overflow-hidden bg-surface">
      {/* Left Panel: Brand Experience (60%) */}
      <section className="hidden md:flex md:w-[60%] bg-surface-container-low relative items-center justify-center overflow-hidden">
        {/* Decorative Blur Circles */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary opacity-[0.06] rounded-lg-full blur-decoration" />
          <div className="absolute top-1/3 left-1/2 w-[350px] h-[350px] bg-primary opacity-[0.04] rounded-lg-full blur-decoration" />
          <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[450px] bg-primary opacity-[0.03] rounded-lg-full blur-decoration" />
        </div>

        {/* Brand Identity */}
        <div className="relative z-10 text-center space-y-6">
          <div className="inline-flex items-center justify-center">
            <h1 className="text-[64px] leading-none font-extrabold text-primary tracking-tighter font-manrope">SPS</h1>
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-semibold text-on-surface-variant font-manrope">AI Check-in Tool</p>
            <div className="h-1 w-12 bg-primary/10 mx-auto rounded-lg-full" />
          </div>
          <p className="text-base text-outline max-w-sm mx-auto leading-relaxed opacity-70">
            Hệ thống quản lý, báo cáo và tự động hóa chiến dịch tương tác mạng xã hội của doanh nghiệp.
          </p>
        </div>
      </section>

      {/* Right Panel: Login Form (40%) */}
      <section className="flex-1 bg-surface flex flex-col items-center justify-center px-6 md:px-16 relative">
        {/* Mobile Brand Logo */}
        <div className="md:hidden absolute top-12 left-6">
          <span className="text-2xl font-bold text-primary font-manrope">SPS</span>
        </div>

        <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-outline">Đang tải...</div>}>
          <LoginForm />
        </Suspense>

        {/* Page Footer */}
        <footer className="mt-8 text-center relative z-10">
          <p className="text-xs text-outline">© 2026 SPS AI. Tất cả quyền được bảo lưu.</p>
        </footer>
      </section>
    </main>
  );
}
