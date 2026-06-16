"use client";

import React, { useEffect, useState, useCallback } from "react";
import { differenceInSeconds } from "date-fns";
import { cn } from "@/lib/utils";
import { ExternalLink, Clock, CheckCircle2, AlertCircle, XCircle, Star } from "lucide-react";
import { toast } from "sonner";
import type { UseHopeStarResult } from "@/app/actions/hope-star-actions";

type Post = {
  id: string;
  title: string;
  description: string;
  url: string;
  originalUrl?: string;
  thumbnail_url?: string | null;
  thumbnailUrl?: string | null;
  start_at: string;
  scheduledAt?: string;
  team?: "ALL" | "TECH" | "SALES";
  status: "PENDING" | "COMPLETED" | "EXPIRED";
  checkinStatus?: "AUTO_APPROVED" | "PENDING" | "APPROVED" | "REJECTED" | null;
};

const PostCard = ({ post, onCheckIn, userHopeStars, userUsedStarsThisMonth, onUseHopeStar }: {
  post: Post;
  onCheckIn: (post: Post) => void;
  userHopeStars?: number;
  userUsedStarsThisMonth?: number;
  onUseHopeStar?: (postId: string) => Promise<UseHopeStarResult>;
}) => {
  const [timeLeft, setTimeLeft] = useState("24:00:00");
  const [isExpired, setIsExpired] = useState(false);
  const [remainingHours, setRemainingHours] = useState(24);

  const startAtDate = post.start_at || post.scheduledAt || new Date().toISOString();
  const originalUrl = post.url || post.originalUrl || "#";
  const thumbnailUrl = post.thumbnail_url || post.thumbnailUrl;

  useEffect(() => {
    const calculateTime = () => {
      const scheduled = new Date(startAtDate);
      const deadline = new Date(scheduled.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();
      const diffSeconds = differenceInSeconds(deadline, now);

      if (diffSeconds <= 0) {
        setIsExpired(true);
        setTimeLeft("00:00:00");
        setRemainingHours(0);
        return;
      }

      const h = Math.floor(diffSeconds / 3600);
      const m = Math.floor((diffSeconds % 3600) / 60);
      const s = diffSeconds % 60;
      
      setTimeLeft(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
      setRemainingHours(h);
      setIsExpired(false);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startAtDate]);

  // Determine checkin state flags
  const checkinState = post.checkinStatus || (post.status === "COMPLETED" ? "APPROVED" : null);
  const isSubmitted = !!checkinState;

  // Hope star state
  const [isUsingHopeStar, setIsUsingHopeStar] = useState(false);
  const hasStars = (userHopeStars ?? 0) > 0;
  const canUseStarThisMonth = (userUsedStarsThisMonth ?? 0) < 3;
  const canUseHopeStar = isExpired && !isSubmitted && hasStars && canUseStarThisMonth;

  const handleUseHopeStarClick = useCallback(async () => {
    if (!onUseHopeStar || !canUseHopeStar) return;
    setIsUsingHopeStar(true);
    try {
      const result = await onUseHopeStar(post.id);
      if (result.success) {
        toast.success("Đã xóa lỗi check-in bằng Ngôi sao hy vọng!");
      } else {
        toast.error(result.error || "Không thể sử dụng Ngôi sao hy vọng.");
      }
    } catch {
      toast.error("Đã xảy ra lỗi, vui lòng thử lại.");
    } finally {
      setIsUsingHopeStar(false);
    }
  }, [post.id, onUseHopeStar, canUseHopeStar]);

  // Team badge styling
  let teamBadgeClass = "bg-indigo-50 text-indigo-700 border-indigo-150";
  let teamLabel = "Tất cả";
  if (post.team === "TECH") {
    teamBadgeClass = "bg-blue-50 text-blue-700 border-blue-150";
    teamLabel = "Tech";
  } else if (post.team === "SALES") {
    teamBadgeClass = "bg-pink-50 text-pink-700 border-pink-150";
    teamLabel = "Sales";
  }

  return (
    <div className="flex flex-col bg-white rounded-xl border border-slate-200/80 shadow-soft hover:shadow-lg transition-all duration-300 overflow-hidden group">
      {/* 1. Header Card Panel */}
      <div className="p-4 border-b border-slate-100 flex flex-col gap-2 bg-slate-50/40">
        <div className="flex items-center justify-between gap-2">
          {/* Team Badge */}
          <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border tracking-wider", teamBadgeClass)}>
            {teamLabel}
          </span>
          
          {/* Countdown Clock */}
          {isSubmitted ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" /> Done
            </span>
          ) : isExpired ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
              <AlertCircle className="w-3.5 h-3.5" /> Quá 24h
            </span>
          ) : (
            <span className={cn(
              "inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-sm",
              remainingHours <= 2 
                ? "bg-rose-500 text-white border-rose-600 animate-pulse" 
                : remainingHours <= 6 
                  ? "bg-amber-50 text-amber-700 border-amber-200" 
                  : "bg-indigo-50 text-indigo-700 border-indigo-100"
            )}>
              <Clock className="w-3.5 h-3.5 animate-spin-slow" />
              {timeLeft}
            </span>
          )}
        </div>

        {/* Post Title */}
        <h3 className="font-headline-md text-sm font-bold uppercase text-slate-900 tracking-tight line-clamp-1 mt-1 group-hover:text-indigo-600 transition-colors duration-200">
          {post.title}
        </h3>
      </div>

      {/* 2. Body Card Panel */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Aspect Ratio 16:9 Thumbnail */}
        <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200/50 relative">
          {thumbnailUrl ? (
            <img 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
              src={thumbnailUrl} 
              alt={post.title}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100/50 text-indigo-400 select-none">
              <span className="material-symbols-outlined text-3xl mb-1">image</span>
              <span className="text-[10px] font-semibold tracking-wider uppercase">TeamSync Banner</span>
            </div>
          )}
        </div>

        {/* Description & URL */}
        <div className="flex-grow flex flex-col justify-between gap-3">
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {post.description || "Hãy thực hiện like và chia sẻ bài viết này công khai trên Facebook cá nhân."}
          </p>

          <a 
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors mt-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Xem link bài gốc</span>
          </a>
        </div>
      </div>

      {/* 3. Footer Card Panel */}
      <div className="p-4 pt-0">
        {!isSubmitted ? (
          isExpired ? (
            <div className="space-y-2">
              <button
                className="w-full rounded-lg bg-slate-100 text-slate-400 font-semibold py-2.5 text-center text-xs cursor-not-allowed border border-slate-200"
                disabled
              >
                Đã khoá (Quá 24 giờ)
              </button>
              {canUseHopeStar && (
                <button
                  onClick={handleUseHopeStarClick}
                  disabled={isUsingHopeStar}
                  className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-semibold py-2.5 text-center text-xs transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {isUsingHopeStar ? (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  ) : (
                    <Star className="w-3.5 h-3.5 fill-white/30" />
                  )}
                  {isUsingHopeStar ? "Đang xử lý..." : `Sử dụng 1 Ngôi sao hy vọng (Còn ${userHopeStars} sao)`}
                </button>
              )}
            </div>
          ) : (
            <button 
              onClick={() => onCheckIn(post)}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold py-2.5 text-center text-xs transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Nộp bằng chứng share
            </button>
          )
        ) : (
          checkinState === "APPROVED" || checkinState === "AUTO_APPROVED" ? (
            <div className="w-full rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold py-2.5 text-center text-xs flex items-center justify-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Đã duyệt (Approved)
            </div>
          ) : checkinState === "PENDING" ? (
            <div className="w-full rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-semibold py-2.5 text-center text-xs flex items-center justify-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Chờ duyệt (Pending)
            </div>
          ) : (
            <div className="w-full rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold py-2.5 text-center text-xs flex items-center justify-center gap-1.5 shadow-sm">
              <XCircle className="w-4 h-4 text-rose-500" />
              Bị từ chối (Rejected)
            </div>
          )
        )}
      </div>
    </div>
  );
};

export function PostListView({ posts, onCheckIn, userHopeStars = 0, userUsedStarsThisMonth = 0, onUseHopeStar }: {
  posts: Post[];
  onCheckIn?: (post: Post) => void;
  userHopeStars?: number;
  userUsedStarsThisMonth?: number;
  onUseHopeStar?: (postId: string) => Promise<UseHopeStarResult>;
}) {
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "COMPLETED" | "EXPIRED">("ALL");

  const filteredPosts = posts.filter((post) => {
    if (filter === "ALL") return true;
    if (filter === "COMPLETED") return !!post.checkinStatus || post.status === "COMPLETED";

    const scheduled = new Date(post.start_at || post.scheduledAt || new Date());
    const deadline = new Date(scheduled.getTime() + 24 * 60 * 60 * 1000);
    const isActuallyExpired = new Date() > deadline;
    const submitted = !!post.checkinStatus || post.status === "COMPLETED";

    if (filter === "EXPIRED") return isActuallyExpired && !submitted;
    if (filter === "PENDING") return !isActuallyExpired && !submitted;

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header section with Filter Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-headline-lg text-2xl font-bold text-slate-900 mb-1">Danh sách bài viết</h2>
          <p className="text-sm text-slate-500">Thực hiện Like, Share bài truyền thông nội bộ và check-in đúng hạn.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "PENDING", label: "Chưa nộp" },
            { id: "COMPLETED", label: "Đã nộp" },
            { id: "EXPIRED", label: "Quá hạn" }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200",
                filter === f.id
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hope Stars Status Banner */}
      {(userHopeStars > 0 || userUsedStarsThisMonth > 0) && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-amber-50/60 border border-amber-200 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
            <Star className="w-4.5 h-4.5 fill-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800">
              Ngôi sao hy vọng: {userHopeStars} sao
            </p>
            <p className="text-xs text-amber-600">
              Đã sử dụng {userUsedStarsThisMonth}/3 lượt trong tháng này
              {userUsedStarsThisMonth >= 3
                ? " (đã đạt giới hạn)"
                : userHopeStars > 0
                ? " — Có thể xóa lỗi cho bài quá hạn"
                : ""}
            </p>
          </div>
        </div>
      )}

      {/* Grid Layout of cards - minimum 3 columns on Desktop */}
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onCheckIn={(p) => onCheckIn ? onCheckIn(p) : console.log("Check-in", p)}
              userHopeStars={userHopeStars}
              userUsedStarsThisMonth={userUsedStarsThisMonth}
              onUseHopeStar={onUseHopeStar}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-400">
            <span className="material-symbols-outlined text-4xl">folder_open</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900">Không có bài viết nào</h3>
          <p className="text-xs text-slate-500 mt-1">Không tìm thấy bài viết nào theo bộ lọc hiện tại.</p>
        </div>
      )}
    </div>
  );
}

