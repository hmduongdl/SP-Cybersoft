"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Copy, Check, QrCode, AlertTriangle, HelpCircle } from "lucide-react";
import Link from "next/link";

interface BankInfo {
  bankId: string;
  accountNo: string;
  accountName: string;
  amount: number;
  transferContent: string;
  qrUrl: string;
}

interface OrderInfo {
  id: string;
  planId: string;
  amount: number;
  status: string;
}

function PaymentContent() {
  const params = useSearchParams();
  const router = useRouter();
  const orderCode = params.get("orderCode");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  
  // Thời gian hết hạn giao dịch (15 phút = 900 giây)
  const [timeLeft, setTimeLeft] = useState(300);

  // 1. Tải thông tin đơn hàng và tài khoản nhận tiền
  useEffect(() => {
    if (!orderCode) {
      setError("Không tìm thấy mã đơn hàng hợp lệ.");
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/checkout/details?orderCode=${orderCode}`);
        if (!res.ok) {
          throw new Error("Không thể tải thông tin đơn hàng.");
        }
        const data = await res.json();
        setOrder(data.order);
        setBankInfo(data.bankInfo);
        setPaymentStatus(data.order.status);
      } catch (err: any) {
        setError(err.message || "Lỗi tải thông tin thanh toán.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [orderCode]);

  // 2. Bộ đếm ngược thời gian giao dịch (15 phút)
  useEffect(() => {
    if (paymentStatus !== "pending") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPaymentStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentStatus]);

  // 3. Polling kiểm tra trạng thái thanh toán từ Database
  useEffect(() => {
    if (!orderCode || paymentStatus !== "pending") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/status?orderCode=${orderCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "paid") {
            setPaymentStatus("paid");
            clearInterval(interval);
          } else if (data.status === "failed" || data.status === "expired") {
            setPaymentStatus(data.status);
            clearInterval(interval);
          }
        }
      } catch (err) {
        // bỏ qua lỗi mất mạng nhất thời khi polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderCode, paymentStatus]);

  // 4. Đếm ngược tự động chuyển hướng khi thành công
  useEffect(() => {
    if (paymentStatus !== "paid") return;
    const t = setInterval(() => {
      setRedirectCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          router.push("/dashboard");
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [paymentStatus, router]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
        <p className="text-slate-400 text-sm">Đang tải thông tin thanh toán...</p>
      </div>
    );
  }

  if (error || !bankInfo || !order) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center p-4">
        <div className="bg-[#0F0F11] border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <XCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Đã xảy ra lỗi</h1>
          <p className="text-slate-400 text-sm mb-6">{error || "Đơn hàng không hợp lệ."}</p>
          <Link
            href="/pricing"
            className="bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all inline-block"
          >
            Quay lại bảng giá
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white py-8 px-4 relative overflow-y-auto flex items-center justify-center">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-pink-600/5 blur-[120px] rounded-full pointer-events-none" />

      <AnimatePresence mode="wait">
        {paymentStatus === "paid" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-[#0F0F11] border border-slate-800 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl relative z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex justify-center mb-6"
            >
              <CheckCircle2 className="w-20 h-20 text-emerald-500" />
            </motion.div>
            <h1 className="text-2xl font-bold mb-2 font-manrope">Thanh toán thành công! 🎉</h1>
            <p className="text-sm text-slate-400 mb-6">
              Gói <span className="text-purple-400 font-bold uppercase">{order.planId}</span> của bạn đã được kích hoạt thành công trên hệ thống.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-semibold py-3 rounded-xl transition-all text-sm shadow-lg shadow-purple-500/20"
              >
                Vào Studio ngay
              </Link>
              <p className="text-xs text-slate-500">
                Tự động chuyển hướng sau {redirectCountdown} giây...
              </p>
            </div>
          </motion.div>
        ) : paymentStatus === "failed" || paymentStatus === "expired" ? (
          <motion.div
            key="fail"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-[#0F0F11] border border-slate-800 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl relative z-10"
          >
            <div className="flex justify-center mb-6">
              <XCircle className="w-20 h-20 text-rose-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2 font-manrope">Thanh toán hết hạn</h1>
            <p className="text-sm text-slate-400 mb-8">
              Giao dịch đã hết hạn hoặc bị hủy bỏ. Vui lòng quay lại và tạo giao dịch mới để tiếp tục.
            </p>
            <Link
              href="/pricing"
              className="bg-white/10 hover:bg-white/20 w-full py-3 rounded-xl font-semibold transition-all text-sm inline-block text-center"
            >
              Thực hiện lại
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="invoice"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl bg-[#0F0F11] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col md:flex-row"
          >
            {/* Cột trái: Thông tin số tài khoản / Số tiền */}
            <div className="p-6 sm:p-8 md:p-10 flex-1 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <QrCode className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-semibold tracking-wide uppercase text-slate-400">Thông tin chuyển khoản</span>
                </div>

                {/* Dòng hiển thị số tiền thanh toán nổi bật */}
                <div className="mb-6 p-5 bg-purple-500/5 rounded-2xl border border-purple-500/10 flex flex-col justify-center items-center text-center">
                  <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Số tiền thanh toán</span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                    {bankInfo.amount.toLocaleString("vi-VN")} VNĐ
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Bank Name */}
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-800/40">
                    <span className="text-sm text-slate-400">Ngân hàng nhận</span>
                    <span className="text-sm font-bold text-white uppercase">{bankInfo.bankId}</span>
                  </div>

                  {/* Account Name */}
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-800/40">
                    <span className="text-sm text-slate-400">Chủ tài khoản</span>
                    <span className="text-sm font-bold text-white">{bankInfo.accountName}</span>
                  </div>

                  {/* Account No */}
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-800/40">
                    <span className="text-sm text-slate-400">Số tài khoản</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-white tracking-wider">{bankInfo.accountNo}</span>
                      <button
                        onClick={() => handleCopy(bankInfo.accountNo, "acc")}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors border border-white/5"
                      >
                        {copiedField === "acc" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] text-emerald-400">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="text-[10px]">Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Warning Box for Content */}
                  <div className="flex flex-col gap-2.5 py-4 px-4 bg-amber-500/5 rounded-2xl border border-amber-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Nội dung chuyển khoản bắt buộc</span>
                        <span className="text-base font-mono font-extrabold text-amber-300 tracking-widest mt-1">
                          {bankInfo.transferContent}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(bankInfo.transferContent, "content")}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold rounded-lg text-amber-300 transition-colors border border-amber-500/20"
                      >
                        {copiedField === "content" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex items-start gap-1.5 text-[10px] text-amber-400/80 leading-normal border-t border-amber-500/10 pt-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        <strong>QUAN TRỌNG:</strong> Bạn phải chuyển chính xác nội dung này (không thêm bớt) để gói tự động kích hoạt ngay lập tức.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hướng dẫn khi gặp sự cố */}
              <div className="mt-8 pt-4 border-t border-slate-800/40 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs text-slate-500 hover:text-slate-400 transition-colors">
                  <HelpCircle className="w-4 h-4" />
                  <span>
                    Chuyển khoản lỗi? Liên hệ <strong className="text-slate-400">Admin</strong> để đối soát thủ công.
                  </span>
                </div>
              </div>
            </div>

            {/* Cột phải: Mã QR Code to rõ hơn và có đếm ngược */}
            <div className="p-8 md:p-10 md:w-96 bg-white/[0.02] flex flex-col items-center justify-center gap-6">
              
              {/* Vùng hiển thị trạng thái "Đang chờ" & Đếm ngược ngay trên QR Code */}
              <div className="w-full text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  <span className="animate-pulse">Đang chờ thanh toán...</span>
                </div>
                
                {/* Thời gian đếm ngược */}
                <div className="text-xs text-slate-400">
                  Giao dịch tự động hết hạn sau: <span className="font-mono font-bold text-rose-400 text-sm">{formatTime(timeLeft)}</span>
                </div>
              </div>

              {/* Khung chứa QR có viền pulsing sáng nhẹ báo hiệu chờ kết nối */}
              <div className="relative p-1.5 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 rounded-3xl shadow-xl">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-purple-500 to-pink-500 opacity-20 blur-md animate-pulse pointer-events-none" />
                <div className="bg-white p-3 rounded-2xl relative z-10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bankInfo.qrUrl}
                    alt="Mã QR Chuyển khoản"
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                  />
                </div>
              </div>

              <div className="text-center space-y-1 px-2">
                <p className="text-xs font-bold text-slate-200">Quét mã QR để giao dịch nhanh</p>
                <p className="text-[11px] text-slate-400 leading-normal max-w-[240px] mx-auto">
                  Ứng dụng ngân hàng của bạn sẽ tự điền Số tài khoản, Số tiền & Nội dung chuyển khoản.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
