"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Copy, Check, QrCode } from "lucide-react";
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
  const [countdown, setCountdown] = useState(5);

  // 1. Fetch Order & Bank Info
  useEffect(() => {
    if (!orderCode) {
      setError("Không tìm thấy mã đơn hàng.");
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

  // 2. Poll Status check if pending
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
        // silent fail on poll error
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderCode, paymentStatus]);

  // 3. Countdown timer on success redirection
  useEffect(() => {
    if (paymentStatus !== "paid") return;
    const t = setInterval(() => {
      setCountdown((c) => {
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
    <div className="min-h-screen bg-[#0A0A0B] text-white py-12 px-4 relative overflow-y-auto flex items-center justify-center">
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
                Tự động chuyển hướng sau {countdown} giây...
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
            <h1 className="text-2xl font-bold mb-2 font-manrope">Thanh toán thất bại</h1>
            <p className="text-sm text-slate-400 mb-8">
              Giao dịch đã hết hạn hoặc bị hủy bỏ. Vui lòng quay lại và thực hiện giao dịch mới.
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
            {/* Left: QR Code info */}
            <div className="p-8 md:p-10 flex-1 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <QrCode className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-semibold tracking-wide uppercase text-slate-400">Thông tin chuyển khoản</span>
                </div>

                <div className="space-y-4">
                  {/* Bank Name */}
                  <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
                    <span className="text-sm text-slate-400">Ngân hàng</span>
                    <span className="text-sm font-bold text-white uppercase">{bankInfo.bankId}</span>
                  </div>

                  {/* Account Name */}
                  <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
                    <span className="text-sm text-slate-400">Chủ tài khoản</span>
                    <span className="text-sm font-bold text-white">{bankInfo.accountName}</span>
                  </div>

                  {/* Account No */}
                  <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
                    <span className="text-sm text-slate-400">Số tài khoản</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-white">{bankInfo.accountNo}</span>
                      <button
                        onClick={() => handleCopy(bankInfo.accountNo, "acc")}
                        className="p-1 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white"
                      >
                        {copiedField === "acc" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
                    <span className="text-sm text-slate-400">Số tiền</span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-white">
                        {bankInfo.amount.toLocaleString("vi-VN")}đ
                      </span>
                      <button
                        onClick={() => handleCopy(String(bankInfo.amount), "amt")}
                        className="p-1 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white"
                      >
                        {copiedField === "amt" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex justify-between items-center py-3 bg-purple-500/5 px-4 rounded-xl border border-purple-500/20">
                    <div className="flex flex-col">
                      <span className="text-xs text-purple-300">Nội dung bắt buộc</span>
                      <span className="text-sm font-mono font-extrabold text-purple-400 tracking-wider">
                        {bankInfo.transferContent}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(bankInfo.transferContent, "content")}
                      className="p-2 hover:bg-purple-500/10 rounded-lg transition-colors text-purple-400"
                    >
                      {copiedField === "content" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Polling display */}
              <div className="mt-8 pt-6 border-t border-slate-800/60 flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span className="text-xs text-slate-400 animate-pulse">
                  Đang chờ hệ thống ghi nhận chuyển khoản...
                </span>
              </div>
            </div>

            {/* Right: QR Code Visual */}
            <div className="p-8 md:p-10 md:w-80 bg-white/5 flex flex-col items-center justify-center gap-4">
              <div className="bg-white p-3 rounded-2xl shadow-lg border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bankInfo.qrUrl}
                  alt="VietQR code"
                  className="w-48 h-48 object-contain"
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-300">Quét mã VietQR để thanh toán</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                  Mã QR chứa sẵn thông tin tài khoản ngân hàng, số tiền và nội dung chuyển khoản.
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
