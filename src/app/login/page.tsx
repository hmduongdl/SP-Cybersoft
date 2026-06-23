import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-surface">
      {/* Left Panel: Brand Experience (60%) */}
      <section className="hidden md:flex md:w-[60%] h-full bg-surface-container-low relative items-center justify-center overflow-hidden">
        {/* Decorative Overlapping Circles */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-[300px] h-[300px] md:w-[450px] md:h-[450px] mix-blend-multiply">
            <div className="absolute top-0 left-0 w-2/3 h-2/3 bg-primary-container opacity-40 rounded-full" />
            <div className="absolute top-1/4 right-0 w-2/3 h-2/3 bg-primary-container opacity-40 rounded-full" />
            <div className="absolute bottom-0 left-1/4 w-2/3 h-2/3 bg-primary-container opacity-40 rounded-full" />
          </div>
        </div>

        {/* Brand Identity */}
        <div className="relative z-10 text-center space-y-4">
          <h1 className="text-7xl md:text-8xl font-bold font-manrope text-primary tracking-tight">SP-CyberSoft</h1>
          <p className="text-xl md:text-2xl font-medium font-manrope text-on-surface-variant">AI Check-in Tool</p>
        </div>
      </section>

      {/* Right Panel: Login Form (40%) */}
      <section className="flex-1 md:w-[40%] h-full bg-surface flex flex-col items-center justify-center px-6 md:px-12 relative overflow-y-auto">
        {/* Mobile Brand Logo */}
        <div className="md:hidden absolute top-12 left-6">
          <span className="text-2xl font-bold text-primary font-manrope">SP-CyberSoft</span>
        </div>

        <Suspense fallback={<div className="flex items-center justify-center text-outline">Đang tải...</div>}>
          <LoginForm />
        </Suspense>

        {/* Page Footer */}
        <footer className="mt-8 text-center relative z-10">
          <p className="text-xs text-outline">© 2026 SP-CyberSoft. Tất cả quyền được bảo lưu.</p>
        </footer>
      </section>
    </main>
  );
}
