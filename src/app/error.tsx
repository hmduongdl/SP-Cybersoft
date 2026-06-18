'use client';

import Link from "next/link";

interface ErrorPageProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
    return (
        <main className="min-h-screen bg-surface-container-low flex items-center justify-center px-4 py-10 relative overflow-hidden">
            {/* Background decorations */}
            <div
                className="absolute top-[-100px] right-[-80px] w-[450px] h-[450px] rounded-full blur-decoration pointer-events-none"
                style={{
                    background: "radial-gradient(circle, rgba(186,26,26,0.09) 0%, transparent 70%)",
                }}
            />
            <div
                className="absolute bottom-[-80px] left-[-60px] w-[350px] h-[350px] rounded-full blur-decoration pointer-events-none"
                style={{
                    background: "radial-gradient(circle, rgba(0,80,203,0.07) 0%, transparent 70%)",
                }}
            />

            <div className="max-w-lg w-full text-center relative z-10">
                {/* Floating card */}
                <div className="bg-surface-container-lowest rounded-[28px] shadow-ambient p-10 relative overflow-hidden">
                    {/* Inner accent bar — rose for error */}
                    <div
                        className="absolute top-0 left-0 right-0 h-1 rounded-t-[28px]"
                        style={{ background: "linear-gradient(90deg, #ba1a1a, #ef4444)" }}
                    />

                    {/* Icon */}
                    <div
                        className="mx-auto mb-6 w-20 h-20 rounded-[20px] flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #ffdad6 0%, #fca5a5 100%)" }}
                    >
                        <span className="material-symbols-outlined text-[40px] text-error">
                            error
                        </span>
                    </div>

                    {/* Badge */}
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-error font-inter mb-3">
                        Lỗi hệ thống
                    </p>

                    {/* Code */}
                    <h1
                        className="font-manrope font-bold tracking-tight text-on-surface"
                        style={{ fontSize: "5rem", lineHeight: 1, letterSpacing: "-0.04em" }}
                    >
                        <span
                            style={{
                                background: "linear-gradient(135deg, #ba1a1a, #ef4444)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            505
                        </span>
                    </h1>

                    {/* Message */}
                    <p className="mt-4 text-base leading-7 text-on-surface-variant font-inter max-w-xs mx-auto">
                        Đã xảy ra sự cố trên máy chủ. Vui lòng thử lại sau hoặc liên hệ quản trị viên nếu lỗi vẫn tiếp diễn.
                    </p>

                    {/* Error detail box */}
                    {error?.message && (
                        <div className="mt-5 px-4 py-3 rounded-xl bg-error-container text-xs font-semibold text-on-error-container font-inter flex items-start gap-2 text-left">
                            <span className="material-symbols-outlined text-[16px] flex-shrink-0 mt-0.5">
                                bug_report
                            </span>
                            <span className="break-all">{error.message}</span>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="my-8 h-px bg-outline-variant" />

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            type="button"
                            onClick={reset}
                            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-on-primary transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            style={{ background: "linear-gradient(135deg, #0050cb, #0066ff)" }}
                        >
                            <span className="material-symbols-outlined text-[18px]">refresh</span>
                            Thử lại
                        </button>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-on-surface-variant bg-surface-container transition-all duration-200 hover:bg-surface-container-high"
                        >
                            <span className="material-symbols-outlined text-[18px]">dashboard</span>
                            Về bảng điều khiển
                        </Link>
                    </div>
                </div>

                {/* Footer hint */}
                <p className="mt-6 text-xs text-outline font-inter">
                    Mã lỗi: 505 &mdash; HTTP Version Not Supported
                </p>
            </div>
        </main>
    );
}
