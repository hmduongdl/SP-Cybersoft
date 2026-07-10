"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  dismissChiikawaPromoForToday,
  isChiikawaPromoDismissedForToday,
} from "@/lib/chiikawa-promo";
import { CHIIKAWA_EMOJIS } from "@/lib/chiikawa-assets";

const FLOATING_STICKERS = [
  { src: CHIIKAWA_EMOJIS.sticker1, alt: "Sticker 1", className: "w-[72px] h-[72px] left-6 top-8", zClass: "z-[2]", delay: 0 },
  { src: CHIIKAWA_EMOJIS.sticker2, alt: "Sticker 2", className: "w-[78px] h-[78px] right-6 top-10", zClass: "z-[2]", delay: 0.3 },
  { src: CHIIKAWA_EMOJIS.usagi, alt: "Usagi", className: "w-[75px] h-[75px] -right-3 top-[10.5rem]", zClass: "z-[20]", delay: 0.6 },
  { src: CHIIKAWA_EMOJIS.hachiware, alt: "Hachiware", className: "w-[70px] h-[70px] -left-3 top-[11.5rem]", zClass: "z-[20]", delay: 0.9 },
  { src: CHIIKAWA_EMOJIS.sticker3, alt: "Sticker 3", className: "w-[74px] h-[74px] right-3 bottom-24", zClass: "z-[1]", delay: 1.2 },
  { src: CHIIKAWA_EMOJIS.chiikawa, alt: "Chiikawa", className: "w-[66px] h-[66px] left-3 bottom-28", zClass: "z-[1]", delay: 1.5 },
] as const;

function ChiikawaSticker({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`object-contain drop-shadow-md pointer-events-none select-none ${className ?? ""}`}
      draggable={false}
      loading="lazy"
    />
  );
}

interface PromoStatus {
  eligible: boolean;
  claimed: boolean;
  eventActive: boolean;
}

export function ChiikawaMaxPromoModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [dontShowToday, setDontShowToday] = useState(false);

  const checkEligibility = useCallback(async () => {
    if (isChiikawaPromoDismissedForToday()) {
      setOpen(false);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/promo/chiikawa-max-trial");
      if (!res.ok) {
        setOpen(false);
        return;
      }

      const data: PromoStatus = await res.json();
      if (data.eligible && data.eventActive) {
        setOpen(true);
      } else {
        setOpen(false);
      }
    } catch {
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  const handleClose = () => {
    if (dontShowToday) {
      dismissChiikawaPromoForToday();
    }
    setOpen(false);
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await fetch("/api/promo/chiikawa-max-trial", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Không thể nhận ưu đãi.");
        return;
      }

      toast.success("Chúc mừng! Bạn đã nhận gói MAX 7 ngày miễn phí!");
      setOpen(false);
      window.location.reload();
    } catch {
      toast.error("Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setClaiming(false);
    }
  };

  if (loading || !open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c111d]/60 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="relative flex min-h-[35rem] w-full max-w-md flex-col justify-end overflow-hidden rounded-3xl border border-[#f5ebd6]/50 bg-[#faf6f0] shadow-[0_24px_64px_rgba(12,17,29,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient background glows */}
            <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-[#ffccd5]/35 blur-3xl pointer-events-none" />
            <div className="absolute -right-12 top-24 h-48 w-48 rounded-full bg-[#fff2b2]/35 blur-3xl pointer-events-none" />
            <div className="absolute left-24 bottom-12 h-40 w-40 rounded-full bg-[#e0f2fe]/35 blur-3xl pointer-events-none" />

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CHIIKAWA_EMOJIS.background}
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-90"
              draggable={false}
            />

            {FLOATING_STICKERS.map((sticker, i) => (
              <motion.div
                key={`${sticker.alt}-${i}`}
                animate={{ y: [0, -6 - (i % 2), 0] }}
                transition={{
                  duration: 2.2 + i * 0.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: sticker.delay,
                }}
                className={`absolute opacity-95 pointer-events-none ${sticker.zClass} ${sticker.className}`}
              >
                <ChiikawaSticker src={sticker.src} alt={sticker.alt} className="h-full w-full" />
              </motion.div>
            ))}

            <button
              onClick={handleClose}
              className="absolute right-4 top-4 z-[30] rounded-full bg-white/70 p-2 text-slate-600 backdrop-blur-md border border-slate-200/50 shadow-sm transition-all hover:bg-white hover:text-slate-800 active:scale-95"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-[10] mt-auto mx-4 mb-4 flex flex-col items-center rounded-3xl bg-white/70 backdrop-blur-xl border border-white/60 p-6 shadow-[0_16px_40px_rgba(200,180,150,0.15)] text-center">
              {/* Header Icon Box overlapping the card edge */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-[#faf6f0] shadow-md transition-transform hover:scale-105 duration-300">
                <ChiikawaSticker
                  src={CHIIKAWA_EMOJIS.chiikawa}
                  alt="Chiikawa"
                  className="h-20 w-20"
                />
              </div>

              <div className="w-full pt-10 flex flex-col items-center">
                <p className="chiikawa-rgb-text mb-1.5 font-manrope text-[11px] font-extrabold uppercase tracking-[0.25em]">
                  ✨ Chiikawa & Những Người Bạn ✨
                </p>
                <h2 className="chiikawa-rgb-text font-manrope text-2xl font-black leading-tight">
                  Nhận gói MAX 7 ngày
                  <br />
                  Free tẹt ga! (Uraaa~ 🐰)
                </h2>
                <p className="mt-3.5 px-1 font-inter text-[13.5px] leading-relaxed text-[#64748b]">
                  Chiikawa và các bạn đã chuẩn bị sẵn gói MAX siêu cấp vip pro cho bạn: Mở khóa AI Studio cực đỉnh, Build PC không giới hạn và nhiều thứ ho hay khác! Nhận ngay kẻo lỡ nha! 💖
                </p>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/60 px-4 py-1.5 font-manrope text-xs font-semibold text-sky-700 shadow-sm backdrop-blur-sm transition-all hover:bg-sky-50/80">
                  <ChiikawaSticker
                    src={CHIIKAWA_EMOJIS.hachiware}
                    alt=""
                    className="h-6 w-6 animate-pulse"
                  />
                  <span>⏰ Chạy ngay đi: Hết hạn 13/07/2026</span>
                </div>

                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="mt-6 relative overflow-hidden flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0050cb] to-[#2563eb] py-4 font-manrope text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(0,80,203,0.3)] transition-all duration-300 hover:shadow-[0_12px_28px_rgba(0,80,203,0.4)] hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {claiming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang truyền năng lượng... ✨</span>
                    </>
                  ) : (
                    <>
                      <ChiikawaSticker
                        src={CHIIKAWA_EMOJIS.usagi}
                        alt=""
                        className="h-6 w-6"
                      />
                      <span>Húp ngay gói MAX thui! ✨</span>
                    </>
                  )}
                </button>

                <div className="mt-5 flex items-center justify-center gap-2">
                  <input
                    type="checkbox"
                    id="chiikawa-promo-dismiss-today"
                    checked={dontShowToday}
                    onChange={(e) => setDontShowToday(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-[#e2e8f0] bg-white text-[#0050cb] focus:ring-[#0050cb]/30 transition-all"
                  />
                  <label
                    htmlFor="chiikawa-promo-dismiss-today"
                    className="cursor-pointer select-none font-inter text-xs text-slate-500 font-medium transition-colors hover:text-slate-800"
                  >
                    Hôm nay thế là đủ rùi nè! 😉
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
