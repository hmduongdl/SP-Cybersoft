"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  UploadCloud,
  X,
  ExternalLink,
  Check,
  Loader2,
  Image as ImageIcon,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clipboard,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { UploadDropzone, uploadFiles } from "@/lib/uploadthing";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  title: string;
  description?: string;
  url?: string;
  originalUrl?: string;
  thumbnailUrl?: string | null;
  thumbnail_url?: string | null;
  scheduledAt?: string;
  start_at?: string;
  status?: string;
}

interface SubmitCheckinModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ExifStatus = "idle" | "scanning" | "valid" | "invalid" | "no_exif";
type SubmitStatus = "idle" | "loading" | "success" | "error";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCountdown(ms: number): { hours: string; mins: string; secs: string; expired: boolean } {
  if (ms <= 0) return { hours: "00", mins: "00", secs: "00", expired: true };
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return {
    hours: String(h).padStart(2, "0"),
    mins: String(m).padStart(2, "0"),
    secs: String(s).padStart(2, "0"),
    expired: false,
  };
}

function formatViDate(date: Date): string {
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─── Sub-component: Countdown Timer ──────────────────────────────────────────

function CountdownTimer({ startAt, allowLateSubmit }: { startAt: string; allowLateSubmit?: boolean }) {
  const [countdown, setCountdown] = useState(() => {
    const end = new Date(startAt).getTime() + 24 * 60 * 60 * 1000;
    return formatCountdown(end - Date.now());
  });

  useEffect(() => {
    const end = new Date(startAt).getTime() + 24 * 60 * 60 * 1000;
    const tick = () => setCountdown(formatCountdown(end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startAt]);

  if (countdown.expired && !allowLateSubmit) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
        <XCircle className="w-4 h-4 flex-shrink-0" />
        <span>Cửa sổ 24h đã hết — không thể nộp thêm</span>
      </div>
    );
  }

  const pct = (() => {
    const total = 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - new Date(startAt).getTime();
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  })();

  const urgency = pct > 83; // < 4 hours left

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 space-y-2 transition-colors",
        urgency
          ? "bg-amber-500/10 border-amber-500/30"
          : "bg-slate-800/60 border-slate-700/60"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Clock className={cn("w-3.5 h-3.5", urgency ? "text-amber-400" : "text-indigo-400")} />
          Cửa sổ nộp bài còn lại
        </div>
        <div
          className={cn(
            "font-mono text-lg font-bold tabular-nums tracking-tight",
            urgency ? "text-amber-300" : "text-white"
          )}
        >
          {countdown.hours}
          <span className="opacity-60 mx-0.5">:</span>
          {countdown.mins}
          <span className="opacity-60 mx-0.5">:</span>
          {countdown.secs}
        </div>
      </div>
      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000",
            urgency
              ? "bg-gradient-to-r from-amber-500 to-red-500"
              : "bg-gradient-to-r from-indigo-500 to-violet-500"
          )}
          style={{ width: `${100 - pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Sub-component: EXIF Status Badge ────────────────────────────────────────

function ExifStatusBadge({
  status,
  exifDate,
}: {
  status: ExifStatus;
  exifDate: Date | null;
}) {
  if (status === "idle") return null;

  if (status === "scanning") {
    return (
      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 animate-pulse">
        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
        <span className="text-sm text-indigo-300">Đang phân tích dữ liệu EXIF từ máy chủ...</span>
      </div>
    );
  }

  if (status === "valid" && exifDate) {
    return (
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-300">
            ✓ Phát hiện thời gian chụp ảnh hợp lệ
          </p>
          <p className="text-xs text-emerald-400/80 mt-0.5">
            {formatViDate(exifDate)}
          </p>
          <p className="text-xs text-emerald-500/70 mt-1">
            Ảnh đủ điều kiện duyệt tự động.
          </p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-300">
            ⚠ Thời gian chụp nằm ngoài cửa sổ 24h
          </p>
          <p className="text-xs text-amber-400/80 mt-0.5">
            EXIF: {exifDate ? formatViDate(exifDate) : "—"}
          </p>
          <p className="text-xs text-amber-500/70 mt-1">
            Bài viết sẽ được chuyển sang hàng đợi để Admin duyệt thủ công.
          </p>
        </div>
      </div>
    );
  }

  // no_exif
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-300">
          ⚠ Không phát hiện thông tin EXIF
        </p>
        <p className="text-xs text-amber-400/80 mt-1">
          Ảnh chụp màn hình máy tính thường không có EXIF. Bài viết sẽ được
          chuyển sang hàng đợi để Admin duyệt thủ công.
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SubmitCheckinModal({
  post,
  isOpen,
  onClose,
  onSuccess,
}: SubmitCheckinModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isChecked1, setIsChecked1] = useState(false);
  const [isChecked2, setIsChecked2] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [submitResult, setSubmitResult] = useState<{
    message: string;
    status?: "AUTO_APPROVED" | "PENDING";
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [exifStatus, setExifStatus] = useState<ExifStatus>("idle");
  const [exifDate, setExifDate] = useState<Date | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Normalise post fields to handle both API shapes
  const postUrl = post.url || post.originalUrl || "";
  const postStartAt = post.start_at || post.scheduledAt || new Date().toISOString();
  const postThumb = post.thumbnailUrl || post.thumbnail_url;

  // ── Reset on open ──
  useEffect(() => {
    if (isOpen) {
      setImageUrl(null);
      setIsChecked1(false);
      setIsChecked2(false);
      setSubmitStatus("idle");
      setSubmitResult(null);
      setSubmitError(null);
      setExifStatus("idle");
      setExifDate(null);
      setUploading(false);
      setUploadProgress(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Paste from clipboard ──
  const pasteImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Ảnh từ clipboard vượt quá 4MB.");
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 150);

    try {
      const [result] = await uploadFiles("screenshotUploader", {
        files: [file],
      });
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result?.url) {
        setImageUrl(result.url);
        toast.success("Ảnh từ clipboard đã được tải lên!");
      }
    } catch {
      clearInterval(progressInterval);
      setUploadProgress(0);
      toast.error("Tải ảnh thất bại, vui lòng kiểm tra kết nối hoặc thử lại.");
    } finally {
      setUploading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (imageUrl) return;

    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") === 0) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            pasteImage(file);
            break;
          }
        }
      }
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [isOpen, imageUrl, pasteImage]);

  if (!isOpen) return null;

  // ── Submit (sends the CDN URL to the API) ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl || !isChecked1 || !isChecked2) return;

    setSubmitStatus("loading");
    setSubmitError(null);

    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: post.id,
          image_url: imageUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gửi bằng chứng thất bại.");

      setSubmitStatus("success");
      setSubmitResult({
        message: data.message || "Nộp bài thành công!",
        status: data.status,
      });
      onSuccess();
    } catch (err: any) {
      setSubmitStatus("error");
      setSubmitError(err.message || "Đã xảy ra lỗi khi nộp bài.");
    }
  };

  const isFormValid =
    !!imageUrl && isChecked1 && isChecked2 && submitStatus !== "loading";

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl shadow-black/40 border border-slate-800/80 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200 max-h-[92vh]">

        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-800 flex items-start justify-between gap-4 flex-shrink-0">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 mb-2">
              <ShieldCheck className="w-3 h-3" />
              Nộp Minh Chứng
            </span>
            <h2 className="text-lg font-bold text-white leading-snug line-clamp-2">
              {post.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors mt-0.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1">
          {/* ── Success screen ── */}
          {submitStatus === "success" && submitResult && (
            <div className="flex flex-col items-center justify-center text-center px-6 py-16 space-y-5">
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-emerald-500/10 border-2 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {submitResult.status === "AUTO_APPROVED"
                    ? "Tự động xác thực thành công! 🎉"
                    : "Đã nhận minh chứng"}
                </h3>
                <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {submitResult.message}
                </p>
              </div>
              {submitResult.status === "AUTO_APPROVED" ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  Điểm đã được ghi nhận tự động
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  Chờ Admin xem xét &amp; duyệt
                </div>
              )}
              <button
                onClick={onClose}
                className="mt-2 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-indigo-600/20"
              >
                Đóng
              </button>
            </div>
          )}

          {/* ── Error screen ── */}
          {submitStatus === "error" && (
            <div className="flex flex-col items-center justify-center text-center px-6 py-12 space-y-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500/10 border-2 border-red-500/30">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Gửi thất bại</h3>
                <p className="text-sm text-slate-400">{submitError}</p>
              </div>
              <button
                onClick={() => setSubmitStatus("idle")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Thử lại
              </button>
            </div>
          )}

          {/* ── Main form ── */}
          {(submitStatus === "idle" || submitStatus === "loading") && (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* Post info + CTA link */}
              <div className="flex gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                {postThumb ? (
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0 relative bg-slate-800">
                    <Image
                      src={postThumb}
                      alt={post.title}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-6 h-6 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                    Bài viết cần chia sẻ
                  </p>
                  <a
                    href={postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors w-fit shadow-md shadow-indigo-600/20 group"
                  >
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                      1
                    </span>
                    Đi tới bài viết gốc
                    <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </a>
                </div>
              </div>

              {/* Countdown Timer */}
              <CountdownTimer startAt={postStartAt} allowLateSubmit={(post as any).allow_late_submit} />

              {/* ── Uploadthing Dropzone ── */}
              {!imageUrl ? (
                <div className="space-y-3">
                  {/* Loading overlay for clipboard paste uploads */}
                  {uploading && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-indigo-300">Đang tải ảnh lên... ({uploadProgress}%)</p>
                        <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <UploadDropzone
                    endpoint="screenshotUploader"
                    onUploadBegin={() => setUploading(true)}
                    onClientUploadComplete={(res: { url: string }[]) => {
                      setUploading(false);
                      const url = res?.[0]?.url;
                      if (url) {
                        setImageUrl(url);
                        toast.success("Tải ảnh lên thành công!");
                      }
                    }}
                    onUploadError={(err: Error) => {
                      setUploading(false);
                      console.error("[uploadthing error] Failed to upload via Dropzone:", err);
                      toast.error(`Tải ảnh thất bại: ${err.message}`);
                    }}
                    content={{
                      label: "click để chọn ảnh",
                      allowedContent: "JPG, PNG, WEBP — Tối đa 4MB",
                      button: "Chọn ảnh từ máy tính",
                    }}
                  />
                  {/* Paste hint */}
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600">
                    <Clipboard className="w-3 h-3" />
                    <span>
                      Hoặc nhấp <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-mono">Ctrl+V</kbd> để dán ảnh từ clipboard
                    </span>
                  </div>
                </div>
              ) : (
                /* ── Preview after successful upload ── */
                <div className="rounded-xl border-2 border-slate-700/80 bg-slate-800/30 p-2 overflow-hidden transition-all">
                  <div className="relative w-full rounded-lg overflow-hidden group bg-slate-900 min-h-[200px]">
                    <Image
                      src={imageUrl}
                      alt="Xem trước ảnh minh chứng"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 500px"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setImageUrl(null)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-lg"
                      >
                        <X className="w-3.5 h-3.5" />
                        Hủy &amp; Chọn lại
                      </button>
                    </div>
                  </div>
                  {/* CDN url tag */}
                  <div className="mt-2 px-2 pb-1 flex items-center gap-2">
                    <UploadCloud className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="text-xs text-emerald-400 truncate font-medium">
                      Ảnh đã được tải lên CDN
                    </span>
                  </div>
                </div>
              )}

              {/* EXIF Status */}
              {exifStatus !== "idle" && (
                <ExifStatusBadge status={exifStatus} exifDate={exifDate} />
              )}

              {/* Cam kết / Checkboxes */}
              <div className="space-y-3 pt-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Cam kết bắt buộc
                </p>

                {[
                  {
                    id: "check1",
                    value: isChecked1,
                    onChange: setIsChecked1,
                    label:
                      "Tôi cam đoan đã chia sẻ bài viết này ở chế độ công khai trên trang cá nhân.",
                  },
                  {
                    id: "check2",
                    value: isChecked2,
                    onChange: setIsChecked2,
                    label:
                      "Tôi xác nhận ảnh tải lên là thật và chịu trách nhiệm về nội dung.",
                  },
                ].map(({ id, value, onChange, label }) => (
                  <label
                    key={id}
                    className="flex items-start gap-3.5 cursor-pointer group select-none"
                  >
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 mt-0.5",
                        value
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-slate-600 bg-slate-800 group-hover:border-indigo-500/70"
                      )}
                    >
                      {value && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </div>
                    <span className="text-sm text-slate-400 group-hover:text-slate-300 leading-relaxed transition-colors">
                      {label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Footer Actions */}
              <div className="flex gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className={cn(
                    "flex-[2] flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200",
                    isFormValid
                      ? "bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 active:scale-[0.98] cursor-pointer"
                      : "bg-slate-800 text-slate-600 cursor-not-allowed"
                  )}
                >
                  {submitStatus === "loading" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang nộp bài...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Nộp bằng chứng
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
