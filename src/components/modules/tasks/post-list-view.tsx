"use client";

import { useEffect, useState, useCallback } from "react";
import { differenceInSeconds, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, Star, ImageIcon, Search } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Pagination } from "@/components/ui/pagination";
import type { UseHopeStarResult } from "@/app/actions/hope-star-actions";
import { vi } from "date-fns/locale";

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
  author?: string | null;
  status: "PENDING" | "COMPLETED" | "EXPIRED";
  checkinStatus?: "AUTO_APPROVED" | "PENDING" | "APPROVED" | "REJECTED" | null;
  allow_late_submit?: boolean;
  is_archived?: boolean;
};

type PostStatus = "NOT_SUBMITTED" | "SUBMITTED" | "PENDING_REVIEW" | "REJECTED" | "EXPIRED" | "LOCKED";

function getPostStatus(
  post: Post,
  now: Date
): { status: PostStatus; label: string; badgeClass: string } {
  const checkinState = post.checkinStatus || (post.status === "COMPLETED" ? "APPROVED" : null);
  const scheduled = new Date(post.start_at || post.scheduledAt || now);
  const deadline = new Date(scheduled.getTime() + 24 * 60 * 60 * 1000);
  const isExpired = now > deadline && !post.allow_late_submit;

  if (checkinState === "APPROVED" || checkinState === "AUTO_APPROVED") {
    return {
      status: "SUBMITTED",
      label: "Đã duyệt",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (checkinState === "PENDING") {
    return {
      status: "PENDING_REVIEW",
      label: "Chờ duyệt",
      badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    };
  }
  if (checkinState === "REJECTED") {
    return {
      status: "REJECTED",
      label: "Bị từ chối",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    };
  }
  if (post.is_archived) {
    return {
      status: "LOCKED",
      label: "Đã khoá",
      badgeClass: "bg-surface-container text-on-surface-variant border-outline-variant/10",
    };
  }
  if (isExpired) {
    return {
      status: "EXPIRED",
      label: "Quá hạn",
      badgeClass: "bg-red-50 text-red-700 border-red-200",
    };
  }
  return {
    status: "NOT_SUBMITTED",
    label: "Chưa nộp",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
}

const AUTHOR_LABELS: Record<string, string> = {
  songphuong_tech: "Song Phương Tech",
  songphuong: "Song Phương",
};

function displayAuthor(author: string | null | undefined): string {
  if (!author) return "—";
  return AUTHOR_LABELS[author] || author;
}

/** Safe thumbnail with fallback when image fails to load */
function SafeThumbnail({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center text-outline bg-surface-container">
        <ImageIcon className="w-5 h-5" />
      </div>
    );
  }

  return (
    <Image
      className="object-cover"
      src={src}
      alt={alt}
      fill
      sizes="48px"
      onError={() => setFailed(true)}
    />
  );
}

function DeadlineCell({ startAtDate, allowLateSubmit }: { startAtDate: string; allowLateSubmit?: boolean }) {
  const [timeLeft, setTimeLeft] = useState("--:--:--");
  const [remainingHours, setRemainingHours] = useState(24);
  const [isExpired, setIsExpired] = useState(false);

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

  if (isExpired && !allowLateSubmit) {
    return (
      <span className="text-xs font-semibold text-red-500">Đã quá hạn</span>
    );
  }

  if (isExpired && allowLateSubmit) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg-xl border bg-emerald-50 text-emerald-700 border-emerald-200">
        <Clock className="w-3 h-3" />
        Nộp bù
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2 py-1 rounded-lg-xl border",
        remainingHours <= 2
          ? "bg-red-50 text-red-600 border-red-200"
          : remainingHours <= 6
          ? "bg-amber-50 text-amber-600 border-amber-200"
          : "bg-surface-container-low text-on-surface-variant border-outline-variant/10"
      )}
    >
      <Clock className="w-3 h-3" />
      {timeLeft}
    </span>
  );
}

function ActionCell({
  post,
  postStatus,
  onCheckIn,
  userHopeStars,
  userUsedStarsThisMonth,
  onUseHopeStar,
}: {
  post: Post;
  postStatus: PostStatus;
  onCheckIn?: (post: Post) => void;
  userHopeStars?: number;
  userUsedStarsThisMonth?: number;
  onUseHopeStar?: (postId: string) => Promise<UseHopeStarResult>;
}) {
  const [isUsingHopeStar, setIsUsingHopeStar] = useState(false);
  const hasStars = (userHopeStars ?? 0) > 0;
  const canUseStarThisMonth = (userUsedStarsThisMonth ?? 0) < 3;
  const canUseHopeStar = postStatus === "EXPIRED" && hasStars && canUseStarThisMonth;

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

  switch (postStatus) {
    case "NOT_SUBMITTED":
      return (
        <button
          onClick={() => onCheckIn?.(post)}
          className="whitespace-nowrap rounded-lg-xl bg-gradient-to-br from-[#0050cb] to-[#1155d0] hover:brightness-110 active:scale-[0.97] text-white font-bold text-xs px-5 py-2.5 transition-all duration-200 shadow-ambient hover:shadow-ambient"
        >
          Nộp bằng chứng
        </button>
      );
    case "EXPIRED":
      if (canUseHopeStar) {
        return (
          <button
            onClick={handleUseHopeStarClick}
            disabled={isUsingHopeStar}
            className="whitespace-nowrap rounded-lg-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.97] text-white font-bold px-4 py-2.5 text-xs transition-all duration-200 shadow-ambient hover:shadow-ambient disabled:opacity-60 inline-flex items-center gap-1"
          >
            {isUsingHopeStar ? (
              <span className="w-3 h-3 rounded-lg-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <Star className="w-3 h-3 fill-white/30" />
            )}
            {isUsingHopeStar ? "Đang xử lý..." : "Dùng sao hy vọng"}
          </button>
        );
      }
      return (
        <button
          disabled
          className="whitespace-nowrap rounded-lg-xl bg-[#eaedff] text-primary/40 font-bold text-xs px-4 py-2.5 cursor-not-allowed inline-flex items-center gap-1.5"
        >
          <Clock className="w-3.5 h-3.5" />
          Đã khoá
        </button>
      );
    case "LOCKED":
      return (
        <button
          disabled
          className="whitespace-nowrap rounded-lg-xl bg-[#eaedff] text-primary/40 font-bold text-xs px-4 py-2.5 cursor-not-allowed inline-flex items-center gap-1.5"
        >
          <Clock className="w-3.5 h-3.5" />
          Đã khoá
        </button>
      );
    case "SUBMITTED":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 py-2.5">
          <CheckCircle2 className="w-4 h-4" style={{ fontVariationSettings: "'FILL' 1" }} />
          Đã hoàn thành
        </span>
      );
    case "PENDING_REVIEW":
      return (
        <span className="inline-flex items-center gap-2 text-xs font-bold text-outline py-2.5">
          <Clock className="w-4 h-4" />
          Đang chờ
        </span>
      );
    case "REJECTED":
      return (
        <button
          onClick={() => onCheckIn?.(post)}
          className="whitespace-nowrap rounded-lg-xl bg-gradient-to-br from-[#0050cb] to-[#1155d0] hover:brightness-110 active:scale-[0.97] text-white font-bold text-xs px-5 py-2.5 transition-all duration-200 shadow-ambient hover:shadow-ambient"
        >
          Nộp lại
        </button>
      );
    default:
      return null;
  }
}

export function PostListView({ posts, onCheckIn, userHopeStars = 0, userUsedStarsThisMonth = 0, onUseHopeStar, currentPage = 1, totalPages = 1 }: {
  posts: Post[];
  onCheckIn?: (post: Post) => void;
  userHopeStars?: number;
  userUsedStarsThisMonth?: number;
  onUseHopeStar?: (postId: string) => Promise<UseHopeStarResult>;
  currentPage?: number;
  totalPages?: number;
}) {
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "COMPLETED" | "EXPIRED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();

  const filteredPosts = posts
    .filter((post) => {
      if (filter === "ALL") return true;
      if (filter === "COMPLETED") return !!post.checkinStatus || post.status === "COMPLETED";

      const scheduled = new Date(post.start_at || post.scheduledAt || now);
      const deadline = new Date(scheduled.getTime() + 24 * 60 * 60 * 1000);
      const isActuallyExpired = (now > deadline && !post.allow_late_submit) || post.is_archived;
      const submitted = !!post.checkinStatus || post.status === "COMPLETED";

      if (filter === "EXPIRED") return isActuallyExpired && !submitted;
      if (filter === "PENDING") return !isActuallyExpired && !submitted;

      return true;
    })
    .filter((post) =>
      searchQuery
        ? post.title.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hope Stars Status Banner */}
      {(userHopeStars > 0 || userUsedStarsThisMonth > 0) && (
        <div className="flex items-center gap-3 p-4 rounded-lg-2xl bg-gradient-to-r from-amber-50 to-amber-50/60 border border-amber-200 shadow-ambient">
          <div className="w-10 h-10 rounded-lg-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
            <Star className="w-5 h-5 fill-amber-400" />
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

      {/* Filter Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center space-x-2 bg-[#f2f3ff] p-1.5 rounded-lg-full w-fit">
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
                "px-6 py-2.5 rounded-lg-full text-xs font-bold transition-all duration-200",
                filter === f.id
                  ? "bg-[#0050cb] text-white shadow-ambient"
                  : "text-on-surface-variant font-semibold hover:bg-surface-container-lowest/50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-sm">
          <div className="relative flex items-center bg-[#f2f3ff] rounded-lg-2xl px-5 py-2.5 group transition-all focus-within:bg-surface-container-lowest border border-transparent focus-within:border-indigo-200">
            <Search className="w-4 h-4 text-outline mr-3" />
            <input
              className="bg-transparent border-none focus:ring-0 w-full text-sm text-on-surface placeholder:text-outline"
              placeholder="Tìm tên bài viết..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      {filteredPosts.length > 0 ? (
        <>
          <section className="bg-surface-container-lowest rounded-lg-[24px] overflow-hidden shadow-[0_20px_40px_rgba(19,27,46,0.06)]">
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] bg-[#f2f3ff] px-8 py-3.5">
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">BÀI VIẾT</div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">TRẠNG THÁI</div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">DEADLINE</div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em] text-right">HÀNH ĐỘNG</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-outline-variant/10">
              {filteredPosts.map((post) => {
                const startAtDate = post.start_at || post.scheduledAt || now.toISOString();
                const thumbnailUrl = post.thumbnail_url || post.thumbnailUrl;
                const { status: postStatus, label: statusLabel, badgeClass } = getPostStatus(post, now);
                const postUrl = post.url || post.originalUrl || "#";

                return (
                  <div
                    key={post.id}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center px-8 py-4 group hover:bg-[#f2f3ff]/50 transition-colors duration-200"
                  >
                    {/* Thumbnail + Title + Author */}
                    <div className="flex items-center space-x-4 min-w-0 pr-3">
                      <div className="w-12 h-12 rounded-lg-xl overflow-hidden bg-surface-container border-none flex-shrink-0 relative">
                        <SafeThumbnail src={thumbnailUrl} alt={post.title} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {/* Title — links directly to original post */}
                        <a
                          href={postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-on-surface hover:text-[#0050cb] hover:underline line-clamp-1 transition-colors block"
                        >
                          {post.title}
                        </a>
                        {/* Author replaces "Xem bài gốc" */}
                        <span className="text-[12px] text-[#0050cb] font-semibold mt-1 block">
                          {displayAuthor(post.author)}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <span
                        className={cn(
                          "inline-flex items-center px-3 py-1 rounded-lg-full font-bold text-xs border",
                          badgeClass
                        )}
                      >
                        {postStatus === "PENDING_REVIEW" && (
                          <span className="w-1.5 h-1.5 rounded-lg-full bg-amber-500 animate-ping mr-1.5" />
                        )}
                        {statusLabel}
                      </span>
                    </div>

                    {/* Deadline */}
                    <div>
                      {postStatus === "SUBMITTED" || postStatus === "PENDING_REVIEW" || postStatus === "REJECTED" ? (
                        <span className="text-xs text-on-surface-variant font-semibold">
                          {format(new Date(startAtDate), "dd/MM/yyyy", { locale: vi })}
                        </span>
                      ) : (
                        <DeadlineCell startAtDate={startAtDate} allowLateSubmit={post.allow_late_submit} />
                      )}
                    </div>

                    {/* Action */}
                    <div className="text-right">
                      <ActionCell
                        post={post}
                        postStatus={postStatus}
                        onCheckIn={onCheckIn}
                        userHopeStars={userHopeStars}
                        userUsedStarsThisMonth={userUsedStarsThisMonth}
                        onUseHopeStar={onUseHopeStar}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="px-8 py-6 flex items-center justify-between bg-[#f2f3ff]/30">
              <p className="text-xs text-outline">
                Hiển thị {filteredPosts.length} trong tổng số {posts.length} nhiệm vụ
              </p>
              <div className="flex items-center space-x-6">
                <span className="text-xs font-semibold text-on-surface-variant">
                  Trang {currentPage} / {totalPages}
                </span>
                <div className="flex space-x-2">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => {
                      const params = new URLSearchParams(searchParams.toString());
                      if (page <= 1) {
                        params.delete("page");
                      } else {
                        params.set("page", String(page));
                      }
                      const qs = params.toString();
                      router.push(qs ? `/tasks?${qs}` : "/tasks");
                    }}
                  />
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="bg-surface-container-lowest rounded-lg-[24px] overflow-hidden shadow-[0_20px_40px_rgba(19,27,46,0.06)] py-20 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-lg-full bg-surface-container-low flex items-center justify-center mb-4 text-outline">
            <span className="material-symbols-outlined text-4xl">folder_open</span>
          </div>
          <h3 className="text-lg font-bold text-on-surface font-manrope">Không có bài viết nào</h3>
          <p className="text-xs text-on-surface-variant mt-1">Không tìm thấy bài viết nào theo bộ lọc hiện tại.</p>
        </section>
      )}
    </div>
  );
}
