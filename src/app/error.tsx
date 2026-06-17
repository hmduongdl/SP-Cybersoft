'use client';

import Link from "next/link";

interface ErrorPageProps {
    error: Error;
    reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
    return (
        <main className="min-h-screen bg-surface-container-low flex items-center justify-center px-4 py-10">
            <div className="max-w-2xl w-full rounded-[28px] bg-surface-bright shadow-ambient p-10 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-rose-600">Lỗi hệ thống</p>
                <h1 className="mt-6 text-6xl font-bold tracking-tight text-on-surface font-manrope">505</h1>
                <p className="mt-4 text-lg leading-8 text-on-surface-variant">
                    Đã xảy ra sự cố trên máy chủ. Vui lòng thử lại sau hoặc quay lại trang chính.
                </p>
                <p className="mt-3 text-sm text-on-surface-variant">{error?.message ?? "Đã có lỗi không xác định."}</p>
                <div className="mt-8 inline-flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                        type="button"
                        onClick={reset}
                        className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-150 hover:bg-indigo-700"
                    >
                        Thử lại
                    </button>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-on-surface-variant transition-all duration-150 hover:bg-surface-container"
                    >
                        Về bảng điều khiển
                    </Link>
                </div>
            </div>
        </main>
    );
}
