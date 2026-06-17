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
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 text-red-600 text-sm font-medium border-none">
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

  const urgency = pct > 83;

  return (
    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-amber-800">
        <div className="flex items-center gap-2 font-medium">
          <Clock className="w-4 h-4" />
          Cửa sổ nộp bài còn lại
        </div>
        <div className="font-mono text-sm font-bold tabular-nums">
          {countdown.hours}:{countdown.mins}:{countdown.secs}
        </div>
      </div>
      <div className="h-1 bg-amber-200/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-1000"
          style={{ width: `${100 - pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Sub-component: EXIF Status Badge ────────────────────────────────────────

function ExifStatusBadge({ status, exifDate }: { status: ExifStatus; exifDate: Date | null }) {
  if (status === "idle") return null;

  if (status === "scanning") {
    return (
      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-indigo-500/10 border-none animate-pulse">
        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin flex-shrink-0" />
        <span className="text-xs font-medium text-indigo-700 font-inter">Đang phân tích dữ liệu EXIF từ máy chủ...</span>
      </div>
    );
  }

  if (status === "valid" && exifDate) {
    return (
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border-none">
        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-[16px] font-bold">check</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-emerald-800 font-manrope">✓ Phát hiện thời gian chụp ảnh hợp lệ</p>
          <p className="text-[11px] text-emerald-600 mt-0.5 font-mono font-semibold">{formatViDate(exifDate)}</p>
          <p className="text-[11px] text-emerald-600/80 mt-1 font-inter">Ảnh đủ điều kiện duyệt tự động.</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border-none">
        <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-rose-800 font-manrope">⚠ Thời gian chụp nằm ngoài cửa sổ 24h</p>
          <p className="text-[11px] text-rose-600 mt-0.5 font-mono">EXIF: {exifDate ? formatViDate(exifDate) : "—"}</p>
          <p className="text-[11px] text-rose-600/80 mt-1 font-inter">Bài viết sẽ được chuyển sang hàng đợi để Admin duyệt thủ công.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border-none">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold text-amber-800 font-manrope">⚠ Không phát hiện thông tin EXIF</p>
        <p className="text-[11px] text-amber-600/85 mt-1 font-inter leading-relaxed">
          Ảnh chụp màn hình máy tính thường không có EXIF. Bài viết sẽ được chuyển sang hàng đợi để Admin duyệt thủ công.
        </p>
      </div>
    </div>
  );
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
    status?: "AUTO_APPROVED" | "PENDING";
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
  } | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const postUrl = post.url || post.originalUrl || "";
  const postStartAt = post.start_at || post.scheduledAt || new Date().toISOString();
  const postThumb = post.thumbnailUrl || post.thumbnail_url;

  const windowEndMs = new Date(postStartAt).getTime() + 24 * 60 * 60 * 1000;
  const isWindowOpen = Date.now() <= windowEndMs || !!(post as any).allow_late_submit;

  // ── Reset & fetch existing checkin on open ──
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
      className="fixed inset-0 z-50 bg-slate-950/70 animate-in fade-in flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 md:p-8 max-w-2xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200 max-h-[92vh]">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-shrink-0 mb-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-6 h-6 text-indigo-600" />
              Nộp minh chứng
            </h2>
            <p className="text-sm font-normal text-slate-500 truncate w-full mt-1" title={post.title}>
              {post.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1">
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
                    <Clock className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-on-surface mb-2 font-manrope">Chờ kiểm duyệt</h3>
                    <p className="text-sm text-on-surface-variant font-inter">
                      Bài nộp hiện tại đang trong trạng thái chờ quản trị viên phê duyệt.
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
                    <Clock className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-on-surface mb-2 font-manrope">
                      Chờ kiểm duyệt
                    </h3>
                    <p className="text-sm text-on-surface-variant max-w-xs mx-auto leading-relaxed font-inter">
                      Minh chứng của bạn đã được nhận và đang chờ quản trị viên phê duyệt.
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
            <form onSubmit={handleSubmit} className="p-6 space-y-5">

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
              <div className="flex gap-3 bg-slate-50/60 border border-slate-200/50 rounded-2xl p-4">
                {postThumb ? (
                  <div className="w-14 h-14 rounded-lg overflow-hidden border-none flex-shrink-0 relative bg-surface-container">
                    <Image src={postThumb} alt={post.title} fill className="object-cover" sizes="56px" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-6 h-6 text-on-surface-variant" />
                  </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                  <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wide font-inter">Bài viết cần chia sẻ</p>
                  <a
                    href={postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all text-sm w-fit group"
                  >
                    Đi tới bài viết gốc
                    <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-all duration-150" />
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

                  {/* Drop zone */}
                  <div
                    onClick={handleFileClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "border-2 border-dashed border-slate-200 bg-slate-50/40 hover:border-indigo-400 hover:bg-indigo-50/10 transition-all duration-200 rounded-2xl cursor-pointer p-8 flex flex-col items-center justify-center gap-2",
                      isDragging && "border-indigo-400 bg-indigo-50/10 scale-[1.01]"
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
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150",
                        isDragging ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-600"
                      )}
                    >
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600">
                        Kéo thả ảnh hoặc <span className="text-indigo-600 hover:text-indigo-700 font-medium underline">click để chọn</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">JPG, PNG, WEBP — Tối đa 10MB</p>
                    </div>
                  </div>

                  {/* Paste hint */}
                  <div className="flex items-center justify-center gap-1.5 text-xs text-on-surface-variant/80 font-inter">
                    <Clipboard className="w-3.5 h-3.5 text-on-surface-variant/60" />
                    <span>
                      Dán từ clipboard bằng <kbd className="px-1.5 py-0.5 rounded-[6px] bg-surface-container text-on-surface-variant text-[10px] font-mono font-semibold">Ctrl+V</kbd>
                    </span>
                  </div>
                </div>
              ) : (
                /* ── Preview after upload ── */
                <div className="rounded-[16px] bg-surface-container-low p-2 overflow-hidden transition-all duration-150 border-none">
                  <div className="relative w-full h-64 rounded-[12px] overflow-hidden group bg-surface-container-low">
                    <Image
                      src={imageUrl}
                      alt="Xem trước ảnh minh chứng"
                      fill
                      className="object-cover rounded-[12px]"
                      sizes="(max-width: 768px) 100vw, 500px"
                    />
                    {/* Hover overlay with dark gradient CTA */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <span className="text-xs font-semibold text-white font-inter">Ảnh minh chứng đã chọn</span>
                      <button
                        type="button"
                        onClick={() => setImageUrl(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold transition-all duration-150"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Đổi ảnh khác
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 px-2 pb-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-emerald-700 truncate font-semibold font-inter">Ảnh đã được tải lên CDN thành công</span>
                  </div>
                </div>
              )}

              {/* EXIF Status */}
              {exifStatus !== "idle" && <ExifStatusBadge status={exifStatus} exifDate={exifDate} />}

              {/* Cam kết / Checkboxes */}
              <div className="space-y-3 pt-1">
                <p className="text-xs font-semibold text-on-surface-variant/80 uppercase tracking-wider font-inter">Cam kết bắt buộc</p>
                {[
                  { id: "check1", value: isChecked1, onChange: setIsChecked1, label: "Tôi cam đoan đã chia sẻ bài viết này ở chế độ công khai trên trang cá nhân." },
                  { id: "check2", value: isChecked2, onChange: setIsChecked2, label: "Tôi xác nhận ảnh tải lên là thật và chịu trách nhiệm về nội dung." },
                ].map(({ id, value, onChange, label }) => (
                  <label key={id} className="flex items-start gap-3.5 cursor-pointer group select-none">
                    <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
                    <div
                      className={cn(
                        "w-5 h-5 rounded-lg border-none flex items-center justify-center flex-shrink-0 transition-all duration-150 mt-0.5",
                        value ? "bg-primary text-white" : "bg-surface-container hover:bg-surface-container-high"
                      )}
                    >
                      {value && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </div>
                    <span className="text-sm text-on-surface-variant group-hover:text-on-surface leading-relaxed transition-all duration-150 font-inter">{label}</span>
                  </label>
                ))}
              </div>

              {/* Footer Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium py-2.5 px-5 rounded-xl border border-slate-200/40 transition-all duration-200 text-sm active:scale-95"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className={cn(
                    "flex-[2] py-2.5 px-5 rounded-xl shadow-sm transition-all duration-200 text-sm active:scale-95 flex items-center justify-center gap-2",
                    isFormValid
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
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
        </div>
      </div>
    </div>
  );
}
