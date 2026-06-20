"use client";

import React, { useState, useRef, useEffect } from "react";
import { useFacebookSDK, sharePost } from "@/hooks/useFacebookSDK";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/user-avatar";
import Image from "next/image";
import { differenceInSeconds, format } from "date-fns";
import { vi } from "date-fns/locale";

type Post = {
  id: string;
  title: string;
  description: string;
  originalUrl: string;
  thumbnailUrl?: string | null;
  scheduledAt: string;
  status: string;
};

type ModalProps = {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function PostCheckinModal({ post, isOpen, onClose, onSuccess }: ModalProps) {
  const { loaded } = useFacebookSDK();
  const [isAutoChecking, setIsAutoChecking] = useState(false);
  const [isManualUploading, setIsManualUploading] = useState(false);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Time remaining states
  const [timeLeft, setTimeLeft] = useState("24:00:00");
  const [elapsedPercentage, setElapsedPercentage] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [deadlineText, setDeadlineText] = useState("");

  // Fetch colleague avatars dynamically for the post's date
  const [colleagueAvatars, setColleagueAvatars] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Reset preview
    setPreviewImage(null);

    // Calculate deadline
    const scheduled = new Date(post.scheduledAt);
    const deadline = new Date(scheduled.getTime() + 24 * 60 * 60 * 1000);
    setDeadlineText(format(deadline, "dd MMM, hh:mm a", { locale: vi }));

    const calculateTimer = () => {
      const now = new Date();
      const diffSeconds = differenceInSeconds(deadline, now);

      if (diffSeconds <= 0) {
        setIsExpired(true);
        setTimeLeft("00:00:00");
        setElapsedPercentage(100);
        return;
      }

      const h = Math.floor(diffSeconds / 3600);
      const m = Math.floor((diffSeconds % 3600) / 60);
      const s = diffSeconds % 60;
      setTimeLeft(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );

      // Percentage of 24 hours elapsed
      const elapsed = 24 * 60 * 60 - diffSeconds;
      const pct = Math.min(100, Math.max(0, (elapsed / (24 * 60 * 60)) * 100));
      setElapsedPercentage(Math.round(pct));
      setIsExpired(false);
    };

    calculateTimer();
    const interval = setInterval(calculateTimer, 1000);

    // Fetch colleague submissions
    const fetchSubmissions = async () => {
      try {
        const dateKey = format(scheduled, "yyyy-MM-dd");
        const res = await fetch(`/api/submissions/auto-check?date=${dateKey}`);
        if (res.ok) {
          const data = await res.json();
          setColleagueAvatars(data.colleagues || []);
        }
      } catch (e) {
        console.error("Lỗi khi tải danh sách đồng nghiệp check-in", e);
      }
    };
    fetchSubmissions();

    return () => clearInterval(interval);
  }, [isOpen, post.scheduledAt]);

  if (!isOpen) return null;

  // AUTO FLOW
  const handleAutoCheckin = async () => {
    try {
      setIsAutoChecking(true);
      if (!loaded) throw new Error("Facebook SDK chưa được tải xong. Vui lòng thử lại sau giây lát.");
      
      // Open Facebook Share Dialog
      await sharePost(post.originalUrl);
      
      const toastId = toast.loading("Đang tự động xác minh lượt chia sẻ...", { id: "fb-verify" });
      
      const res = await fetch("/api/submissions/auto-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Không tìm thấy lượt chia sẻ công khai của bạn cho bài viết này.");
      }
      
      toast.success("Xác minh thành công! Bạn đã check-in thành công.", { id: "fb-verify" });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Hành động chia sẻ bị hủy hoặc không thể xác minh lượt chia sẻ.", { id: "fb-verify" });
    } finally {
      setIsAutoChecking(false);
    }
  };

  // MANUAL FLOW
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Chỉ hỗ trợ định dạng JPG, PNG hoặc WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Dung lượng ảnh phải dưới 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleManualSubmit = async () => {
    if (!previewImage) return;
    try {
      setIsManualUploading(true);
      toast.loading("Đang gửi minh chứng...", { id: "manual-upload" });
      
      const res = await fetch("/api/submissions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, base64Image: previewImage })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Gửi minh chứng thất bại");
      }
      
      toast.success("Đã gửi minh chứng thành công! Vui lòng chờ Admin phê duyệt.", { id: "manual-upload" });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Lỗi tải ảnh lên. Vui lòng thử lại.", { id: "manual-upload" });
    } finally {
      setIsManualUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-md bg-slate-950/70 transition-opacity duration-300 animate-in fade-in">
      {/* Modal Container */}
      <div className="bg-surface-container-lowest w-full max-w-4xl rounded-2xl shadow-[0_32px_64px_rgba(19,27,46,0.12)] overflow-hidden flex flex-col md:flex-row relative border-none animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          className="absolute top-4 right-4 text-outline hover:text-on-surface transition-all duration-150 z-30" 
          onClick={onClose}
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Left: Main Content Area */}
        <div className="flex-1 p-xl md:p-3xl border-r border-outline-variant/10 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="mb-2xl pr-6">
            <div className="flex items-center gap-sm mb-sm flex-wrap">
              <h3 className="font-headline-md text-headline-md text-on-surface font-manrope">{post.title}</h3>
              <a 
                href={post.originalUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:bg-primary/10 p-1 rounded-xl transition-all duration-150 flex items-center"
              >
                <span className="material-symbols-outlined text-[20px]">open_in_new</span>
              </a>
            </div>
            
            <div className="bg-surface-container-low p-md rounded-xl border-none flex items-start gap-md mt-md">
              <span className="material-symbols-outlined text-primary mt-0.5">info</span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                <span className="font-bold">Yêu cầu từ Admin:</span> {post.description || "Hãy share bài viết công khai kèm hashtag chung của chiến dịch nội bộ."}
              </p>
            </div>
          </div>

          {/* Action Sections */}
          <div className="space-y-lg">
            
            {/* Auto Action (Facebook share) */}
            <div className="p-lg bg-[#1877F2]/5 rounded-2xl border border-[#1877F2]/10 flex flex-col gap-md">
              <div>
                <h4 className="font-title-md text-title-md text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#1877F2] text-[20px]">bolt</span>
                  Cách 1: Chia sẻ & Tự động duyệt qua Facebook
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Kích hoạt popup chia sẻ trực tiếp của Facebook. Hệ thống sẽ kiểm tra và phê duyệt ngay lập tức.
                </p>
              </div>
              <button 
                onClick={handleAutoCheckin} 
                disabled={isAutoChecking || isManualUploading || isExpired}
                className="w-full bg-[#1877F2] text-white hover:bg-[#166FE5] py-3.5 rounded-xl font-label-md text-label-md font-bold transition-all shadow-[0_32px_64px_rgba(19,27,46,0.12)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                {isAutoChecking ? "Đang xác minh..." : "Chia sẻ & Tự động Duyệt (Facebook)"}
              </button>
            </div>

            {/* Manual Action (Upload Image) */}
            <div>
              <h4 className="font-title-md text-title-md text-on-surface mb-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-outline text-[20px]">backup</span>
                Cách 2: Tải lên minh chứng thủ công (Dự phòng)
              </h4>
              
              {!previewImage ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "dashed-border min-h-[180px] flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container-low transition-all duration-150 p-xl text-center group rounded-2xl",
                    isDragging ? "bg-primary/5 border-primary" : "border-outline-variant/30"
                  )}
                >
                  <div className="w-14 h-14 bg-primary-fixed/30 rounded-full flex items-center justify-center mb-md transition-transform">
                    <span className="material-symbols-outlined text-primary text-3xl">cloud_upload</span>
                  </div>
                  <p className="font-title-md text-title-md text-on-surface mb-xs">Kéo thả ảnh chụp màn hình vào đây hoặc click để chọn</p>
                  <p className="font-body-sm text-body-sm text-outline">Định dạng hỗ trợ: JPG, PNG, WEBP (Tối đa 10MB)</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/jpeg, image/png, image/webp" 
                    onChange={handleFileChange} 
                  />
                </div>
              ) : (
                <div className="space-y-md">
                  <div className="relative group rounded-2xl overflow-hidden bg-surface-container-low min-h-[200px]">
                    <Image alt="Screenshot preview" fill className="object-contain" src={previewImage} sizes="500px" />
                    <div className="absolute inset-0 bg-on-background/40 opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center justify-center gap-md">
                      <button
                        className="bg-error text-white px-lg py-2 rounded-xl flex items-center gap-2 font-semibold hover:bg-error-container transition-all duration-150" 
                        onClick={() => setPreviewImage(null)}
                      >
                        <span className="material-symbols-outlined">delete</span>
                        <span>Gỡ bỏ</span>
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={handleManualSubmit}
                    disabled={isManualUploading || isExpired}
                    className="w-full bg-primary hover:bg-primary-container text-white py-3 rounded-xl font-label-md text-label-md font-bold transition-all shadow-[0_32px_64px_rgba(19,27,46,0.12)] flex items-center justify-center gap-2"
                  >
                    {isManualUploading ? "Đang gửi..." : "Gửi minh chứng để phê duyệt"}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right: Sidebar Info */}
        <div className="w-full md:w-72 bg-surface-container-low p-xl flex flex-col gap-2xl justify-between border-l border-outline-variant/10">
          
          {/* Expiration Timer widget */}
          <div className="space-y-md">
            <div className="flex items-center gap-sm text-on-surface">
              <span className="material-symbols-outlined text-primary">schedule</span>
              <span className="font-label-md text-label-md uppercase tracking-wider font-bold">Thời hạn check-in</span>
            </div>
            
            <div className="bg-on-background rounded-2xl p-lg text-center shadow-[0_32px_64px_rgba(19,27,46,0.12)] border border-primary/20">
              <div className="font-display-lg text-3xl font-bold text-secondary tracking-tight">
                {isExpired ? "00:00:00" : timeLeft}
              </div>
              <p className="font-label-sm text-[10px] text-surface-variant mt-xs uppercase tracking-wide">Giờ : Phút : Giây còn lại</p>
            </div>
            
            <div>
              <div className="h-2 w-full bg-outline-variant/20 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    elapsedPercentage >= 90 ? "bg-error" : elapsedPercentage >= 75 ? "bg-tertiary" : "bg-secondary"
                  )} 
                  style={{ width: `${elapsedPercentage}%` }}
                />
              </div>
              <p className="font-body-sm text-[11px] text-outline-variant mt-sm">Đã trôi qua {elapsedPercentage}% thời gian (mốc 24h)</p>
            </div>
          </div>

          {/* Submissions Stats */}
          <div className="space-y-lg">
            <div>
              <span className="font-label-sm text-[11px] text-outline block mb-xs font-semibold">Đồng nghiệp đã check-in</span>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2.5 overflow-hidden">
                  {colleagueAvatars.slice(0, 3).map((a, idx) => (
                    <UserAvatar key={idx} name={a.name} src={a.avatar_url} size="sm" className="border-2 border-surface-container-low" />
                  ))}
                  {colleagueAvatars.length > 3 && (
                    <div className="h-7 w-7 rounded-full bg-primary-fixed border-2 border-surface-container-low flex items-center justify-center font-bold text-[9px] text-primary">
                      +{colleagueAvatars.length - 3}
                    </div>
                  )}
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant italic">
                  {colleagueAvatars.length > 0 ? `${colleagueAvatars.length} đồng nghiệp hoàn thành` : "Chưa ai check-in"}
                </span>
              </div>
            </div>

            <div className="p-md bg-surface-bright rounded-xl">
              <p className="font-label-sm text-xs text-outline mb-xs font-semibold">Hạn chót</p>
              <p className="font-title-md text-sm text-on-surface font-bold">{deadlineText}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
