"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
  XCircle,
  RefreshCw,
  Clipboard,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
type CheckinStatus = "AUTO_APPROVED" | "PENDING" | "APPROVED" | "REJECTED";
type AiReviewState = "PROCESSING" | "COMPLETED";

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
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-error-bg text-error-text text-sm font-medium border border-error-text/20">
        <XCircle className="w-4 h-4 flex-shrink-0" />
        <span className="font-inter text-xs">Cửa sổ 24h đã hết — không thể nộp thêm</span>
      </div>
    );
  }

  const pct = (() => {
    const total = 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - new Date(startAt).getTime();
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  })();

  return (
    <div className="bg-warn-bg border border-warn-text/25 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-warn-text">
        <div className="flex items-center gap-2 font-medium">
          <Clock className="w-4 h-4" />
          Cửa sổ nộp bài còn lại
        </div>
        <div className="font-mono text-sm font-bold tabular-nums">
          {countdown.hours}:{countdown.mins}:{countdown.secs}
        </div>
      </div>
      <div className="h-1 bg-warn-text/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-warn-text rounded-full transition-all duration-1000"
          style={{ width: `${100 - pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Sub-component: EXIF Status Badge ────────────────────────────────────────

function ExifStatusBadge({ status, exifDate }: { status: ExifStatus; exifDate: Date | null }) {
  // Chỉ hiển thị khi đang scan hoặc có kết quả hợp lệ/không hợp lệ
  // Ẩn hoàn toàn khi không có EXIF (ảnh chụp màn hình) — không cần báo user
  if (status === "idle" || status === "no_exif") return null;

  if (status === "scanning") {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-container/40 border border-outline animate-pulse">
        <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
        <span className="text-xs font-medium text-on-surface font-inter">Đang xác minh ảnh...</span>
      </div>
    );
  }

  if (status === "valid" && exifDate) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-xl bg-success-bg border border-success-text/20">
        <div className="w-5 h-5 rounded-full bg-success-text/15 text-success-text flex items-center justify-center shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-[14px] font-bold">check</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-success-text font-manrope">✓ Phát hiện thời gian chụp hợp lệ</p>
          <p className="text-[11px] text-success-text/90 mt-0.5 font-mono font-semibold">{formatViDate(exifDate)}</p>
          <p className="text-[11px] text-on-muted mt-0.5 font-inter">Ảnh đủ điều kiện duyệt tự động.</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex items-start gap-3 p-3 rounded-xl bg-error-bg border border-error-text/20">
        <AlertTriangle className="w-4 h-4 text-error-text flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-error-text font-manrope">⚠ Thời gian chụp ngoài cửa sổ 24h</p>
          <p className="text-[11px] text-error-text/90 mt-0.5 font-mono">EXIF: {exifDate ? formatViDate(exifDate) : "—"}</p>
          <p className="text-[11px] text-on-muted mt-0.5 font-inter">Bài sẽ chờ Admin duyệt thủ công.</p>
        </div>
      </div>
    );
  }

  return null;
}

// ─── File validation ──────────────────────────────────────────────────────────

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "Chỉ chấp nhận JPG, PNG, WEBP.";
  if (file.size > MAX_SIZE) return "Dung lượng vượt quá 10MB.";
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SubmitCheckinModal({ post, isOpen, onClose, onSuccess }: SubmitCheckinModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isChecked1, setIsChecked1] = useState(false);
  const [isChecked2, setIsChecked2] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [submitResult, setSubmitResult] = useState<{
    message: string;
    status?: CheckinStatus;
    checkinId?: string;
    aiReviewState?: AiReviewState;
    aiReason?: string | null;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [exifStatus, setExifStatus] = useState<ExifStatus>("idle");
  const [exifDate, setExifDate] = useState<Date | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Existing checkin for resubmit logic
  const [existingCheckin, setExistingCheckin] = useState<{
    id: string;
    status: string;
    reject_reason?: string | null;
    ai_analysis_reason?: string | null;
  } | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const postUrl = post.url || post.originalUrl || "";
  const postStartAt = post.start_at || post.scheduledAt || new Date().toISOString();
  const postThumb = post.thumbnailUrl || post.thumbnail_url;

  const windowEndMs = new Date(postStartAt).getTime() + 24 * 60 * 60 * 1000;
  const isWindowOpen = Date.now() <= windowEndMs || !!(post as any).allow_late_submit;
  const isExistingAiReviewing =
    existingCheckin?.status === "PENDING" &&
    (!existingCheckin.ai_analysis_reason || existingCheckin.ai_analysis_reason.startsWith("AI đang duyệt"));
  const isSubmitAiReviewing =
    submitResult?.status === "PENDING" && submitResult.aiReviewState !== "COMPLETED";

  // ── Reset & fetch existing checkin on open ──
  useEffect(() => {
    if (isOpen) {
      setImageUrl(null);
      setIsChecked1(false);
      setIsChecked2(false);
      setThumbError(false);
      setSubmitStatus("idle");
      setSubmitResult(null);
      setSubmitError(null);
      setExifStatus("idle");
      setExifDate(null);
      setUploading(false);
      setUploadProgress(0);
      setIsDragging(false);
      setExistingCheckin(null);
      setCheckingExisting(true);

      // Fetch existing checkin for this post
      fetch(`/api/checkins?post_id=${post.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.checkins?.length > 0) {
            setExistingCheckin(data.checkins[0]);
          }
        })
        .catch(() => {})
        .finally(() => setCheckingExisting(false));
    }
  }, [isOpen, post.id]);

  // Handle image scan trigger (simulates trigger scan logic when img is loaded)
  useEffect(() => {
    if (imageUrl) {
      setExifStatus("scanning");
      fetch(`/api/admin/ai-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl, post_id: post.id }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.exif) {
            const hasExif = !!data.exif.exif_created_at;
            if (hasExif) {
              const dt = new Date(data.exif.exif_created_at);
              setExifDate(dt);
              setExifStatus(data.exif.is_exif_valid ? "valid" : "invalid");
            } else {
              setExifStatus("no_exif");
            }
          } else {
            setExifStatus("no_exif");
          }
        })
        .catch(() => {
          setExifStatus("no_exif");
        });
    }
  }, [imageUrl, post.id]);

  useEffect(() => {
    const checkinId = submitResult?.checkinId;
    if (submitStatus !== "success" || !checkinId || submitResult.aiReviewState === "COMPLETED") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/checkins/status?id=${checkinId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không thể kiểm tra trạng thái AI.");

        const checkin = data.checkin;
        setSubmitResult((current) => {
          if (!current || current.checkinId !== checkinId) return current;
          return {
            ...current,
            status: checkin.status,
            aiReviewState: checkin.ai_review_state,
            aiReason: checkin.ai_analysis_reason,
            message:
              checkin.status === "AUTO_APPROVED"
                ? "AI đã duyệt xong và tự động phê duyệt minh chứng của bạn."
                : checkin.ai_review_state === "COMPLETED"
                ? "AI đã duyệt xong. Minh chứng cần quản trị viên xác nhận thêm."
                : "Bài viết đang được AI duyệt. Hệ thống sẽ thông báo sau khi AI duyệt xong.",
          };
        });

        if (checkin.ai_review_state === "COMPLETED") {
          onSuccess();
          if (checkin.status === "AUTO_APPROVED") {
            toast.success("AI đã tự động duyệt minh chứng của bạn.");
          } else {
            toast.info("AI đã duyệt xong. Bài cần quản trị viên xác nhận thêm.");
          }
        }
      } catch (err) {
        console.error("Lỗi polling trạng thái AI:", err);
      }
    };

    const id = window.setInterval(poll, 3000);
    poll();
    return () => window.clearInterval(id);
  }, [submitStatus, submitResult?.checkinId, submitResult?.aiReviewState, onSuccess]);

  if (!isOpen) return null;

  // ── Upload file to Vercel Blob (XHR for real progress) ──
  const uploadFile = useCallback(async (file: File) => {
    const err = validateFile(file);
    if (err) {
      toast.error(err);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const url = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.url) {
                setUploadProgress(100);
                resolve(data.url);
              } else {
                reject(new Error(data.error || "Server không trả về URL."));
              }
            } catch {
              reject(new Error("Response không phải JSON hợp lệ."));
            }
          } else {
            let msg = "Tải ảnh lên thất bại.";
            try {
              const data = JSON.parse(xhr.responseText);
              msg = data.error || msg;
            } catch {}
            reject(new Error(msg));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Mất kết nối tới máy chủ. Kiểm tra mạng."));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload bị huỷ."));
        });

        xhr.open("POST", "/api/upload/checkin");
        xhr.send(fd);
      });

      setImageUrl(url);
      toast.success("Tải ảnh lên thành công!");
    } catch (err: any) {
      setUploadProgress(0);
      toast.error(err.message || "Tải ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  }, []);

  // ── Drag & drop ──
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) uploadFile(f);
  };

  const handleFileClick = () => {
    if (!uploading) fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadFile(f);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Clipboard paste ──
  useEffect(() => {
    if (!isOpen || imageUrl || uploading) return;

    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") === 0) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            uploadFile(file);
            break;
          }
        }
      }
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [isOpen, imageUrl, uploading, uploadFile]);

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl || !isChecked1 || !isChecked2) return;

    setSubmitStatus("loading");
    setSubmitError(null);

    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id, image_url: imageUrl }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gửi bằng chứng thất bại.");

      setSubmitStatus("success");
      setSubmitResult({
        message: data.message || "Nộp bài thành công!",
        status: data.status,
        checkinId: data.checkin_id,
        aiReviewState: data.status === "PENDING" ? "PROCESSING" : "COMPLETED",
      });
      onSuccess();
    } catch (err: any) {
      setSubmitStatus("error");
      setSubmitError(err.message || "Đã xảy ra lỗi khi nộp bài.");
    }
  };

  const isFormValid = !!imageUrl && isChecked1 && isChecked2 && submitStatus !== "loading";

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 animate-in fade-in flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface-mid sm:rounded-3xl rounded-t-3xl border border-outline shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200 max-h-[95svh] sm:max-h-[92vh]">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-shrink-0 px-5 pt-5 pb-4 border-b border-outline">
          {/* Mobile drag handle */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-outline sm:hidden" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-xl font-bold text-on-surface flex items-center gap-2">
              <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
              Nộp minh chứng
            </h2>
            <p className="text-xs sm:text-sm font-normal text-on-muted truncate w-full mt-0.5" title={post.title}>
              {post.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container text-on-muted hover:text-on-surface hover:bg-surface-container-high active:bg-surface-container-highest transition-all touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {/* ── Loading existing checkin ── */}
          {checkingExisting && (
            <div className="flex flex-col items-center justify-center px-6 py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}

          {/* ── Already submitted (not rejected) ── */}
          {!checkingExisting && existingCheckin && existingCheckin.status !== "REJECTED" && (
            <div className="flex flex-col items-center justify-center text-center px-6 py-12 space-y-6">
              {existingCheckin.status === "AUTO_APPROVED" || existingCheckin.status === "APPROVED" ? (
                <>
                  <div className="w-20 h-20 rounded-full flex items-center justify-center bg-tertiary-fixed text-on-tertiary-fixed-variant">
                    <span className="material-symbols-outlined text-[40px] font-bold">check</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-on-surface mb-2 font-manrope">Đã tự động duyệt!</h3>
                    <p className="text-sm text-on-surface-variant font-inter">
                      Bản ghi check-in này đã được xác thực thành công.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full flex items-center justify-center bg-secondary-container text-on-secondary-container">
                    {isExistingAiReviewing ? <Loader2 className="w-10 h-10 animate-spin" /> : <Clock className="w-10 h-10" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-on-surface mb-2 font-manrope">
                      {isExistingAiReviewing ? "AI đang duyệt bài" : "AI đã duyệt xong"}
                    </h3>
                    <p className="text-sm text-on-surface-variant font-inter">
                      {isExistingAiReviewing
                        ? "Bài nộp hiện tại đang được AI kiểm tra. Hệ thống sẽ cập nhật sau khi AI duyệt xong."
                        : "AI đã kiểm tra minh chứng. Bài này cần quản trị viên xác nhận thêm trước khi hoàn tất."}
                    </p>
                  </div>
                </>
              )}
              <button
                onClick={onClose}
                className="w-full h-12 flex items-center justify-center rounded-[12px] bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-sm transition-all duration-150 font-inter"
              >
                Đóng
              </button>
            </div>
          )}

          {/* ── Success screen ── */}
          {submitStatus === "success" && submitResult && (
            <div className="flex flex-col items-center justify-center text-center px-6 py-12 space-y-6">
              {submitResult.status === "AUTO_APPROVED" ? (
                <>
                  <div className="w-20 h-20 rounded-full flex items-center justify-center bg-tertiary-fixed text-on-tertiary-fixed-variant">
                    <span className="material-symbols-outlined text-[40px] font-bold">check</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-on-surface mb-2 font-manrope">
                      Đã tự động duyệt!
                    </h3>
                    <p className="text-sm text-on-surface-variant max-w-xs mx-auto leading-relaxed font-inter">
                      Dữ liệu ảnh trùng khớp và đạt tiêu chuẩn. Minh chứng của bạn đã được phê duyệt tự động.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full flex items-center justify-center bg-secondary-container text-on-secondary-container">
                    {isSubmitAiReviewing ? <Loader2 className="w-10 h-10 animate-spin" /> : <Clock className="w-10 h-10" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-on-surface mb-2 font-manrope">
                      {isSubmitAiReviewing ? "AI đang duyệt bài" : "AI đã duyệt xong"}
                    </h3>
                    <p className="text-sm text-on-surface-variant max-w-xs mx-auto leading-relaxed font-inter">
                      {isSubmitAiReviewing
                        ? "Bài viết đang được AI duyệt. Hệ thống sẽ thông báo sau khi AI duyệt xong."
                        : "AI đã kiểm tra minh chứng. Bài này cần quản trị viên xác nhận thêm trước khi hoàn tất."}
                    </p>
                  </div>
                </>
              )}
              <button
                onClick={onClose}
                className="w-full h-12 flex items-center justify-center rounded-[12px] bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-sm transition-all duration-150 font-inter"
              >
                Đóng
              </button>
            </div>
          )}

          {/* ── Error screen ── */}
          {submitStatus === "error" && (
            <div className="flex flex-col items-center justify-center text-center px-6 py-12 space-y-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-error-container text-on-error-container">
                <span className="material-symbols-outlined text-[20px] font-bold">close</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface mb-1 font-manrope">Gửi thất bại</h3>
                <p className="text-sm text-on-surface-variant font-inter">{submitError}</p>
              </div>
              <button
                onClick={() => setSubmitStatus("idle")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-medium text-sm transition-all duration-150"
              >
                <RefreshCw className="w-4 h-4" />
                Thử lại
              </button>
            </div>
          )}

          {/* ── Main form ── */}
          {(submitStatus === "idle" || submitStatus === "loading") && !checkingExisting && (!existingCheckin || existingCheckin.status === "REJECTED") && (
            <>
            {/* Block resubmission when window is closed */}
            {existingCheckin?.status === "REJECTED" && !isWindowOpen ? (
              <div className="flex flex-col items-center justify-center text-center px-6 py-12 space-y-6">
                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-surface-container-low text-on-surface-variant">
                  <Clock className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-2 font-manrope">Đã quá hạn nộp lại</h3>
                  <p className="text-sm text-on-surface-variant font-inter">
                    Cửa sổ nộp bài đã đóng. Bạn không thể nộp lại minh chứng cho bài viết này.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-full h-12 flex items-center justify-center rounded-[12px] bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-sm transition-all duration-150 font-inter"
                >
                  Đóng
                </button>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-6 sm:py-5 space-y-4">

              {/* ── Rejected notice ── */}
              {existingCheckin?.status === "REJECTED" && isWindowOpen && (
                <div className="flex items-start gap-4 p-4 rounded-[16px] bg-error-container/20 border-none">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-error-container text-on-error-container shrink-0">
                    <span className="material-symbols-outlined text-[20px] font-bold">close</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-error-container font-manrope">Minh chứng bị từ chối</p>
                    {existingCheckin.reject_reason && (
                      <p className="text-xs text-on-surface-variant mt-1 font-inter break-words">
                        Lý do: {existingCheckin.reject_reason}
                      </p>
                    )}
                    <p className="text-[11px] text-on-surface-variant/70 mt-1 font-inter">Vui lòng tải lên ảnh minh chứng hợp lệ khác.</p>
                  </div>
                </div>
              )}

              {/* Post info + CTA link */}
              <div className="flex gap-3 bg-surface-container-low border border-outline rounded-2xl p-3 sm:p-4">
                {postThumb && !thumbError ? (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-none flex-shrink-0 relative bg-surface-container">
                    <Image 
                      src={postThumb} 
                      alt={post.title} 
                      fill 
                      className="object-cover" 
                      sizes="56px" 
                      onError={() => setThumbError(true)}
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-5 h-5 text-on-surface-variant" />
                  </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                  <p className="text-[10px] sm:text-xs text-on-muted font-semibold uppercase tracking-wide font-inter">Bài viết cần chia sẻ</p>
                  <a
                    href={postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary active:opacity-80 hover:opacity-90 text-on-primary font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all text-sm touch-manipulation"
                  >
                    Mở bài viết gốc
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Countdown Timer */}
              <CountdownTimer startAt={postStartAt} allowLateSubmit={(post as any).allow_late_submit} />

              {/* ── Upload Zone ── */}
              {!imageUrl ? (
                <div className="space-y-3">
                  {/* Progress bar */}
                  {uploading && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-container/20 border-none">
                      <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary font-inter">Đang tải ảnh lên... ({uploadProgress}%)</p>
                        <div className="mt-2 h-1.5 bg-on-surface/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary-gradient-end rounded-full transition-all duration-150"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Drop zone — full-width tap-friendly button on mobile */}
                  <div
                    onClick={handleFileClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "border-2 border-dashed border-outline bg-surface-low hover:border-primary/40 hover:bg-primary-container/25 active:bg-primary-container/35 transition-all duration-200 rounded-2xl cursor-pointer py-8 sm:py-10 px-4 flex flex-col items-center justify-center gap-3 touch-manipulation",
                      isDragging && "border-primary bg-primary-container/35 scale-[1.01]"
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                    />
                    <div
                      className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150",
                        isDragging ? "bg-primary text-on-primary" : "bg-primary-container text-primary"
                      )}
                    >
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-semibold text-on-surface">
                        Chọn ảnh minh chứng
                      </p>
                      <p className="text-xs text-on-muted">JPG, PNG, WEBP — tối đa 10MB</p>
                    </div>
                    {/* Mobile: big tap button */}
                    <div className="sm:hidden mt-1 px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold">
                      Chọn ảnh từ thư viện
                    </div>
                  </div>

                  {/* Paste hint — desktop only */}
                  <div className="hidden sm:flex items-center justify-center gap-1.5 text-xs text-on-surface-variant/80 font-inter">
                    <Clipboard className="w-3.5 h-3.5 text-on-surface-variant/60" />
                    <span>
                      Dán từ clipboard bằng <kbd className="px-1.5 py-0.5 rounded-[6px] bg-surface-container text-on-surface-variant text-[10px] font-mono font-semibold">Ctrl+V</kbd>
                    </span>
                  </div>
                </div>
              ) : (
                /* ── Preview after upload ── */
                <div className="rounded-[16px] bg-surface-container-low p-2 overflow-hidden transition-all duration-150 border-none">
                  <div className="relative w-full rounded-[12px] overflow-hidden bg-surface-container-low" style={{ height: 'clamp(180px, 40vw, 260px)' }}>
                    <Image
                      src={imageUrl}
                      alt="Xem trước ảnh minh chứng"
                      fill
                      className="object-cover rounded-[12px]"
                      sizes="(max-width: 640px) 100vw, 500px"
                    />
                    {/* Always-visible overlay on mobile, hover on desktop */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-3 flex items-center justify-between sm:opacity-0 sm:group-hover:opacity-100 sm:transition-all sm:duration-200">
                      <span className="text-xs font-semibold text-white font-inter">Ảnh đã chọn</span>
                      <button
                        type="button"
                        onClick={() => setImageUrl(null)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-xl text-xs font-semibold transition-all duration-150 touch-manipulation"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Đổi ảnh
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 px-2 pb-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-text animate-pulse" />
                    <span className="text-xs text-success-text truncate font-semibold font-inter">Đã tải lên thành công</span>
                  </div>
                </div>
              )}

              {/* EXIF Status */}
              {exifStatus !== "idle" && <ExifStatusBadge status={exifStatus} exifDate={exifDate} />}

              {/* Cam kết / Checkboxes */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-on-muted uppercase tracking-wider font-inter">Cam kết bắt buộc</p>
                {[
                  { id: "check1", value: isChecked1, onChange: setIsChecked1, label: "Tôi cam đoan đã chia sẻ bài viết này ở chế độ công khai trên trang cá nhân." },
                  { id: "check2", value: isChecked2, onChange: setIsChecked2, label: "Tôi xác nhận ảnh tải lên là thật và chịu trách nhiệm về nội dung." },
                ].map(({ id, value, onChange, label }) => (
                  <label key={id} className="flex items-start gap-3 cursor-pointer group select-none py-1 touch-manipulation">
                    <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
                    <div
                      className={cn(
                        "w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 transition-all duration-150 mt-0.5",
                        value
                          ? "bg-primary border-primary text-on-primary"
                          : "bg-surface-container-high border-outline hover:border-primary/40"
                      )}
                    >
                      {value && <Check className="w-4 h-4 text-on-primary stroke-[3]" />}
                    </div>
                    <span className="text-sm text-on-surface-variant group-hover:text-on-surface leading-relaxed transition-all duration-150 font-inter">{label}</span>
                  </label>
                ))}
              </div>

              {/* Footer Actions — sticky on mobile */}
              <div className="flex gap-3 pt-3 pb-2 sticky bottom-0 bg-surface-mid/95 backdrop-blur-sm sm:static sm:bg-transparent sm:backdrop-blur-none border-t border-outline sm:border-t-0 mt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-surface-container hover:bg-surface-container-high active:bg-surface-container-highest text-on-surface font-medium py-3 px-4 rounded-xl border border-outline transition-all duration-200 text-sm touch-manipulation"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className={cn(
                    "flex-[2] py-3 px-4 rounded-xl shadow-sm transition-all duration-200 text-sm flex items-center justify-center gap-2 touch-manipulation",
                    isFormValid
                      ? "bg-primary active:opacity-80 hover:opacity-90 text-on-primary font-semibold"
                      : "bg-surface-container-high text-on-muted border border-outline cursor-not-allowed"
                  )}
                >
                  {submitStatus === "loading" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  Nộp minh chứng
                </button>
              </div>
            </form>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
