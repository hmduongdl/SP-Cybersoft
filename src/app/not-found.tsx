import Link from "next/link";

export default function NotFoundPage() {
    return (
        <main className="min-h-screen bg-surface-container-low flex items-center justify-center px-4 py-10">
            <div className="max-w-2xl w-full rounded-[28px] bg-surface-bright shadow-ambient p-10 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-600">Không tìm thấy trang</p>
                <h1 className="mt-6 text-6xl font-bold tracking-tight text-on-surface font-manrope">404</h1>
                <p className="mt-4 text-lg leading-8 text-on-surface-variant">
                    Có vẻ như trang bạn muốn truy cập không tồn tại hoặc đã bị di chuyển.
                </p>
                <div className="mt-8 inline-flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-150 hover:bg-indigo-700"
                    >
                        Về bảng điều khiển
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-on-surface-variant transition-all duration-150 hover:bg-surface-container"
                    >
                        Về trang chủ
                    </Link>
                </div>
            </div>
        </main>
    );
}
