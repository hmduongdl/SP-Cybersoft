import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
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
            <h1 className="font-headline-md text-headline-md font-bold tracking-tight text-white">SPS AI</h1>
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

        <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-400 bg-slate-950">Đang tải...</div>}>
          <LoginForm />
        </Suspense>

        {/* Page Footer */}
        <footer className="mt-8 text-center relative z-10">
          <p className="text-xs text-slate-600">© 2026 SPS AI. Tất cả quyền được bảo lưu.</p>
        </footer>
      </section>
    </main>
  );
}
