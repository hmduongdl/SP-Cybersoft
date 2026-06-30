import { Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-surface px-5 py-10 text-on-surface">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl flex-col items-center justify-center text-center">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container text-primary">
          <RefreshCw aria-hidden="true" className="h-7 w-7" />
        </div>

        <p className="mb-4 inline-flex rounded-full bg-warn-bg px-3 py-1 text-sm font-medium text-warn-text">
          Hệ thống đang bảo trì
        </p>

        <h1 className="text-3xl font-semibold tracking-tight text-on-surface sm:text-4xl">
          Chúng tôi sẽ quay lại sớm
        </h1>

        <p className="mt-4 max-w-md text-base leading-7 text-on-muted">
          SP Cybersoft đang được nâng cấp để hoạt động ổn định hơn. Vui lòng thử lại sau ít phút.
        </p>

        <div className="mt-8 w-full rounded-2xl bg-surface-mid p-5 text-left shadow-card">
          <div className="flex items-start gap-3">
            <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-warn-text" />
            <div>
              <p className="font-medium text-on-surface">Trạng thái hiện tại</p>
              <p className="mt-1 text-sm leading-6 text-on-muted">
                Đội kỹ thuật đang kiểm tra và cập nhật hệ thống. Các dữ liệu của bạn vẫn được giữ nguyên.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <Home aria-hidden="true" className="h-4 w-4" />
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
