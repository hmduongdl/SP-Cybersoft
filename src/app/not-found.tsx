import Link from "next/link";

export default function NotFoundPage() {
    return (
        <main className="min-h-screen bg-surface-container-low flex items-center justify-center px-4 py-10 relative overflow-hidden">
            {/* Background decorations */}
            <div
                className="absolute top-[-120px] right-[-100px] w-[500px] h-[500px] rounded-full blur-decoration pointer-events-none"
                style={{
                    background: "radial-gradient(circle, rgba(0,80,203,0.12) 0%, transparent 70%)",
                }}
            />
            <div
                className="absolute bottom-[-80px] left-[-80px] w-[380px] h-[380px] rounded-full blur-decoration pointer-events-none"
                style={{
                    background: "radial-gradient(circle, rgba(0,102,255,0.09) 0%, transparent 70%)",
                }}
            />

            <div className="max-w-lg w-full text-center relative z-10">
                {/* Floating card */}
                <div className="bg-surface-container-lowest rounded-[28px] shadow-ambient p-10 relative overflow-hidden">
                    {/* Inner accent bar */}
                    <div
                        className="absolute top-0 left-0 right-0 h-1 rounded-t-[28px]"
                        style={{ background: "linear-gradient(90deg, #0050cb, #0066ff)" }}
                    />

                    {/* Icon */}
                    <div
                        className="mx-auto mb-6 w-20 h-20 rounded-[20px] flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #dae1ff 0%, #b3c5ff 100%)" }}
                    >
                        <span className="material-symbols-outlined text-[40px] text-primary">
                            travel_explore
                        </span>
                    </div>

                    {/* Badge */}
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary font-inter mb-3">
                        Không tìm thấy trang
                    </p>

                    {/* Code */}
                    <h1
                        className="font-manrope font-bold tracking-tight text-on-surface"
                        style={{ fontSize: "5rem", lineHeight: 1, letterSpacing: "-0.04em" }}
                    >
                        <span
                            style={{
                                background: "linear-gradient(135deg, #0050cb, #0066ff)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            404
                        </span>
                    </h1>

                    {/* Message */}
                    <p className="mt-4 text-base leading-7 text-on-surface-variant font-inter max-w-xs mx-auto">
                        Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển đến vị trí khác.
                    </p>

                    {/* Divider */}
                    <div className="my-8 h-px bg-outline-variant" />

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-on-primary transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            style={{ background: "linear-gradient(135deg, #0050cb, #0066ff)" }}
                        >
                            <span className="material-symbols-outlined text-[18px]">dashboard</span>
                            Về bảng điều khiển
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-on-surface-variant bg-surface-container transition-all duration-200 hover:bg-surface-container-high"
                        >
                            <span className="material-symbols-outlined text-[18px]">home</span>
                            Về trang chủ
                        </Link>
                    </div>
                </div>

                {/* Footer hint */}
                <p className="mt-6 text-xs text-outline font-inter">
                    Mã lỗi: 404 &mdash; Page Not Found
                </p>
            </div>
        </main>
    );
}
