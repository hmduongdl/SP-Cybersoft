'use client';

import Link from "next/link";

interface ErrorPageProps {
    error: Error;
    reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
            <div className="max-w-2xl w-full rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-10 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-rose-600">Lỗi hệ thống</p>
                <h1 className="mt-6 text-6xl font-bold tracking-tight text-slate-900">505</h1>
                <p className="mt-4 text-lg leading-8 text-slate-600">
                    Đã xảy ra sự cố trên máy chủ. Vui lòng thử lại sau hoặc quay lại trang chính.
                </p>
                <p className="mt-3 text-sm text-slate-500">{error?.message ?? "Đã có lỗi không xác định."}</p>
                <div className="mt-8 inline-flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                        type="button"
                        onClick={reset}
                        className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                        Thử lại
                    </button>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                        Về bảng điều khiển
                    </Link>
                </div>
            </div>
        </main>
    );
}
