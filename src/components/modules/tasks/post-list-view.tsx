"use client";

import { useEffect, useState, useCallback } from "react";
import { differenceInSeconds, format } from "date-fns";
import { cn } from "@/lib/utils";
import { ExternalLink, Clock, CheckCircle2, AlertCircle, XCircle, Star, ImageIcon } from "lucide-react";
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
  status: "PENDING" | "COMPLETED" | "EXPIRED";
  checkinStatus?: "AUTO_APPROVED" | "PENDING" | "APPROVED" | "REJECTED" | null;
};

type PostStatus = "NOT_SUBMITTED" | "SUBMITTED" | "PENDING_REVIEW" | "REJECTED" | "EXPIRED";

function getPostStatus(
  post: Post,
  now: Date
): { status: PostStatus; label: string; badgeClass: string } {
  const checkinState = post.checkinStatus || (post.status === "COMPLETED" ? "APPROVED" : null);
  const scheduled = new Date(post.start_at || post.scheduledAt || now);
  const deadline = new Date(scheduled.getTime() + 24 * 60 * 60 * 1000);
  const isExpired = now > deadline;

  if (checkinState === "APPROVED" || checkinState === "AUTO_APPROVED") {
    return {
      status: "SUBMITTED",
      label: "Đã nộp",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (checkinState === "PENDING") {
    return {
      status: "PENDING_REVIEW",
      label: "Chờ duyệt",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }
  if (checkinState === "REJECTED") {
    return {
      status: "REJECTED",
      label: "Bị từ chối",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
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
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  };
}

function DeadlineCell({ startAtDate }: { startAtDate: string }) {
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

  if (isExpired) {
    return (
      <span className="text-xs font-semibold text-red-500">Đã quá hạn</span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2 py-1 rounded-md border",
        remainingHours <= 2
          ? "bg-red-50 text-red-600 border-red-200"
          : remainingHours <= 6
          ? "bg-amber-50 text-amber-600 border-amber-200"
          : "bg-slate-50 text-slate-600 border-slate-200"
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
          className="whitespace-nowrap rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-semibold px-3.5 py-1.5 text-xs transition-all duration-200 shadow-sm hover:shadow-md"
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
            className="whitespace-nowrap rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-[0.97] text-white font-semibold px-3.5 py-1.5 text-xs transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 inline-flex items-center gap-1"
          >
            {isUsingHopeStar ? (
              <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
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
          className="whitespace-nowrap rounded-lg bg-slate-100 text-slate-400 font-semibold px-3.5 py-1.5 text-xs cursor-not-allowed border border-slate-200"
        >
          Đã khoá
        </button>
      );
    case "SUBMITTED":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Đã duyệt
        </span>
      );
    case "PENDING_REVIEW":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
          Chờ duyệt
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
          <XCircle className="w-3.5 h-3.5" />
          Bị từ chối
        </span>
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();

  const filteredPosts = posts.filter((post) => {
    if (filter === "ALL") return true;
    if (filter === "COMPLETED") return !!post.checkinStatus || post.status === "COMPLETED";

    const scheduled = new Date(post.start_at || post.scheduledAt || now);
    const deadline = new Date(scheduled.getTime() + 24 * 60 * 60 * 1000);
    const isActuallyExpired = now > deadline;
    const submitted = !!post.checkinStatus || post.status === "COMPLETED";

    if (filter === "EXPIRED") return isActuallyExpired && !submitted;
    if (filter === "PENDING") return !isActuallyExpired && !submitted;

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header section with Filter Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-2">
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

      {/* Table Layout */}
      {filteredPosts.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50">
                  <th className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Bài viết
                  </th>
                  <th className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Trạng thái
                  </th>
                  <th className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Deadline
                  </th>
                  <th className="py-3.5 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPosts.map((post) => {
                  const startAtDate = post.start_at || post.scheduledAt || now.toISOString();
                  const thumbnailUrl = post.thumbnail_url || post.thumbnailUrl;
                  const { status: postStatus, label: statusLabel, badgeClass } = getPostStatus(post, now);

                  return (
                    <tr key={post.id} className="hover:bg-slate-50/60 transition-colors duration-150">
                      {/* Thumbnail + Title */}
                      <td className="py-3 pl-4 pr-3 whitespace-nowrap">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Thumbnail 48px */}
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 relative">
                            {thumbnailUrl ? (
                              <Image
                                className="object-cover"
                                src={thumbnailUrl}
                                alt={post.title}
                                fill
                                sizes="48px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          {/* Title + URL link */}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate max-w-[280px]">
                              {post.title}
                            </p>
                            <a
                              href={post.url || post.originalUrl || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-500 hover:text-indigo-600 hover:underline mt-0.5"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Xem bài gốc
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Status badge */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase border tracking-wider",
                            badgeClass
                          )}
                        >
                          {postStatus === "PENDING_REVIEW" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          )}
                          {postStatus === "SUBMITTED" && <CheckCircle2 className="w-3 h-3" />}
                          {postStatus === "REJECTED" && <XCircle className="w-3 h-3" />}
                          {postStatus === "EXPIRED" && <AlertCircle className="w-3 h-3" />}
                          {statusLabel}
                        </span>
                      </td>

                      {/* Deadline countdown */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {postStatus === "SUBMITTED" || postStatus === "PENDING_REVIEW" || postStatus === "REJECTED" ? (
                          <span className="text-xs text-slate-400">
                            {format(new Date(startAtDate), "dd/MM/yyyy HH:mm", { locale: vi })}
                          </span>
                        ) : (
                          <DeadlineCell startAtDate={startAtDate} />
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 pl-3 pr-4 whitespace-nowrap text-right">
                        <ActionCell
                          post={post}
                          postStatus={postStatus}
                          onCheckIn={onCheckIn}
                          userHopeStars={userHopeStars}
                          userUsedStarsThisMonth={userUsedStarsThisMonth}
                          onUseHopeStar={onUseHopeStar}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
        </>
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
