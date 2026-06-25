"use client";

import { useEffect, useState } from "react";
import { differenceInSeconds, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Clock, ImageIcon, Search } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { vi } from "date-fns/locale";
import type { PostParticipant } from "@/lib/cache";
import { UserAvatar } from "@/components/shared/user-avatar";

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
      badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    };
  }
  if (checkinState === "PENDING") {
    return {
      status: "PENDING_REVIEW",
      label: "Chờ duyệt",
      badgeClass: "bg-amber-50 text-amber-700 border border-amber-100",
    };
  }
  // Locked/expired takes priority over rejected — only allow resubmit if still within deadline
  if (post.is_archived) {
    return {
      status: "LOCKED",
      label: "Đã khoá",
      badgeClass: "bg-surface-container-high/60 text-on-surface-variant border-none",
    };
  }
  if (isExpired) {
    return {
      status: "EXPIRED",
      label: "Quá hạn",
      badgeClass: "bg-red-500/10 text-red-600 border-none",
    };
  }
  if (checkinState === "REJECTED") {
    return {
      status: "REJECTED",
      label: "Bị từ chối",
      badgeClass: "bg-rose-50 text-rose-700 border border-rose-100",
    };
  }
  return {
    status: "NOT_SUBMITTED",
    label: "Chưa nộp",
    badgeClass: "bg-indigo-500/10 text-indigo-600 border-none",
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

function ParticipantsCell({ participants }: { participants: PostParticipant[] }) {
  const MAX_VISIBLE = 3;
  const visible = participants.slice(0, MAX_VISIBLE);
  const overflow = participants.length - MAX_VISIBLE;

  if (participants.length === 0) {
    return <span className="text-xs text-on-surface-variant/50 font-inter italic">Chưa có</span>;
  }

  return (
    <div className="flex items-center gap-0.5">
      {visible.map((p) => (
        <div
          key={p.userId}
          className="w-6 h-6 rounded-full overflow-hidden ring-2 ring-surface-container-lowest shrink-0"
        >
          <UserAvatar name={p.userName} src={p.userAvatar} size="sm" className="w-full h-full" />
        </div>
      ))}
      {overflow > 0 && (
        <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-low rounded-full px-1.5 py-0.5 ml-0.5 font-inter">
          +{overflow}
        </span>
      )}
    </div>
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
      <span className="text-xs font-semibold text-red-500 font-inter">Đã quá hạn</span>
    );
  }

  if (isExpired && allowLateSubmit) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 font-inter">
        <Clock className="w-3.5 h-3.5" />
        Nộp bù
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-xl",
        remainingHours <= 2
          ? "bg-red-500/10 text-red-600"
          : remainingHours <= 6
          ? "bg-amber-500/10 text-amber-600"
          : "bg-surface-container text-on-surface-variant"
      )}
    >
      <Clock className="w-3.5 h-3.5" />
      {timeLeft}
    </span>
  );
}

function ActionCell({
  post,
  postStatus,
  onCheckIn,
}: {
  post: Post;
  postStatus: PostStatus;
  onCheckIn?: (post: Post) => void;
}) {
  switch (postStatus) {
    case "NOT_SUBMITTED":
      return (
        <button
          onClick={() => onCheckIn?.(post)}
          className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-[8px] gradient-primary text-white hover:brightness-105 transition-all font-inter"
        >
          Check-in
        </button>
      );
    case "EXPIRED":
      return (
        <button
          disabled
          className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-[8px] bg-surface-container text-on-surface-variant/40 cursor-not-allowed inline-flex items-center gap-1 font-inter"
        >
          <span className="material-symbols-outlined text-[16px]">lock</span>
          Đã khoá
        </button>
      );
    case "LOCKED":
      return (
        <button
          disabled
          className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-[8px] bg-surface-container text-on-surface-variant/40 cursor-not-allowed inline-flex items-center gap-1 font-inter"
        >
          <span className="material-symbols-outlined text-[16px]">lock</span>
          Đã khoá
        </button>
      );
    case "SUBMITTED":
      return (
        <button
          disabled
          className="px-3 py-1.5 text-xs font-semibold rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant inline-flex items-center gap-1 cursor-not-allowed select-none font-inter"
        >
          <span className="material-symbols-outlined text-[16px] font-bold">check</span>
          Đã nộp
        </button>
      );
    case "PENDING_REVIEW":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant py-1.5 font-inter">
          <Clock className="w-3.5 h-3.5 animate-pulse" />
          Đang chờ
        </span>
      );
    case "REJECTED":
      return (
        <button
          onClick={() => onCheckIn?.(post)}
          className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-[8px] gradient-primary text-white hover:brightness-105 transition-all font-inter"
        >
          Nộp lại
        </button>
      );
    default:
      return null;
  }
}

export function PostListView({ posts, onCheckIn, currentPage = 1, totalPages = 1, participantsMap = {} }: {
  posts: Post[];
  onCheckIn?: (post: Post) => void;
  currentPage?: number;
  totalPages?: number;
  participantsMap?: Record<string, PostParticipant[]>;
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

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const qs = params.toString();
    router.push(qs ? `/like-share?${qs}` : "/like-share");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Filter Section - Floating directly on page bg */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-2 w-fit">
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
                "px-5 py-2 rounded-full text-xs font-semibold transition-all duration-150 font-inter",
                filter === f.id
                  ? "bg-primary-container text-primary"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search - Float borderless low surface container */}
        <div className="flex-1 max-w-sm">
          <div className="relative flex items-center bg-surface-container-low rounded-[10px] px-4 py-2 group transition-all duration-200">
            <Search className="w-4 h-4 text-on-surface-variant/50 mr-2.5 shrink-0" />
            <input
              className="bg-transparent border-none focus:ring-0 w-full text-sm text-on-surface placeholder:text-on-surface-variant/50 font-inter focus:outline-none p-0"
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
          <section className="bg-surface-container-lowest rounded-[16px] overflow-hidden shadow-[0_20px_40px_rgba(19,27,46,0.06)] border-none">
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] bg-surface-container-low px-8 py-3.5 text-on-surface-variant tracking-[0.05em] font-semibold font-inter uppercase text-[11px] leading-none">
              <div>BÀI VIẾT</div>
              <div>TRẠNG THÁI</div>
              <div>DEADLINE</div>
              <div>THÀNH VIÊN</div>
              <div className="text-right">HÀNH ĐỘNG</div>
            </div>

            {/* Table Rows - Hover background only, no line borders */}
            <div className="divide-y-0">
              {filteredPosts.map((post) => {
                const startAtDate = post.start_at || post.scheduledAt || now.toISOString();
                const thumbnailUrl = post.thumbnail_url || post.thumbnailUrl;
                const { status: postStatus, label: statusLabel, badgeClass } = getPostStatus(post, now);
                const postUrl = post.url || post.originalUrl || "#";

                return (
                  <div
                    key={post.id}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center px-8 py-4 group hover:bg-surface-container transition-all duration-150 border-none"
                  >
                    {/* Thumbnail + Title + Author */}
                    <div className="flex items-center space-x-4 min-w-0 pr-3">
                      <div className="w-12 h-12 rounded-[12px] overflow-hidden bg-surface-container border-none flex-shrink-0 relative">
                        <SafeThumbnail src={thumbnailUrl} alt={post.title} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {/* Title — links directly to original post */}
                        <a
                          href={postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-semibold text-on-surface font-inter hover:text-primary hover:underline line-clamp-1 transition-all duration-150 block"
                        >
                          {post.title}
                        </a>
                        {/* Author replaces "Xem bài gốc" */}
                        <span className="text-xs text-primary font-semibold mt-1 block font-inter">
                          {displayAuthor(post.author)}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <span
                        className={cn(
                          "inline-flex items-center px-3 py-1 rounded-full font-bold text-xs border-none",
                          badgeClass
                        )}
                      >
                        {postStatus === "PENDING_REVIEW" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping mr-1.5" />
                        )}
                        {statusLabel}
                      </span>
                    </div>

                    {/* Deadline */}
                    <div>
                      {postStatus === "SUBMITTED" || postStatus === "PENDING_REVIEW" || postStatus === "REJECTED" ? (
                        <span className="text-xs text-on-surface-variant font-semibold font-inter">
                          {format(new Date(startAtDate), "dd/MM/yyyy", { locale: vi })}
                        </span>
                      ) : (
                        <DeadlineCell startAtDate={startAtDate} allowLateSubmit={post.allow_late_submit} />
                      )}
                    </div>

                    {/* Participants */}
                    <div>
                      <ParticipantsCell participants={participantsMap[post.id] || []} />
                    </div>

                    {/* Action */}
                    <div className="text-right">
                      <ActionCell
                        post={post}
                        postStatus={postStatus}
                        onCheckIn={onCheckIn}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination - Minimal view */}
            <div className="px-8 py-6 flex items-center justify-between bg-surface-container-lowest border-t border-surface-container-low">
              <p className="text-xs text-on-surface-variant font-inter">
                Hiển thị {filteredPosts.length} trong tổng số {posts.length} nhiệm vụ
              </p>
              <div className="flex items-center space-x-4">
                <span className="text-xs font-semibold text-on-surface-variant font-inter">
                  Trang {currentPage} / {totalPages}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      if (currentPage > 1) {
                        handlePageChange(currentPage - 1);
                      }
                    }}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center justify-center shrink-0"
                    title="Trang trước"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                  <button
                    onClick={() => {
                      if (currentPage < totalPages) {
                        handlePageChange(currentPage + 1);
                      }
                    }}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center justify-center shrink-0"
                    title="Trang sau"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="bg-surface-container-lowest rounded-[16px] overflow-hidden shadow-[0_20px_40px_rgba(19,27,46,0.06)] py-20 text-center flex flex-col items-center justify-center border-none">
          <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-4 text-outline">
            <span className="material-symbols-outlined text-4xl">folder_open</span>
          </div>
          <h3 className="text-lg font-bold text-on-surface font-manrope">Không có bài viết nào</h3>
          <p className="text-xs text-on-surface-variant mt-1 font-inter">Không tìm thấy bài viết nào theo bộ lọc hiện tại.</p>
        </section>
      )}
    </div>
  );
}
