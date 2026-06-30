"use client";

import { useEffect, useState } from "react";
import { differenceInSeconds, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Clock, ImageIcon, Search, ExternalLink, Users, Calendar, AlertCircle, ChevronLeft, ChevronRight, Lock, Check, FolderOpen } from "lucide-react";
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
      badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/15",
    };
  }
  if (checkinState === "PENDING") {
    return {
      status: "PENDING_REVIEW",
      label: "Chờ duyệt",
      badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/15",
    };
  }
  if (post.is_archived) {
    return {
      status: "LOCKED",
      label: "Đã khoá",
      badgeClass: "bg-slate-500/10 text-slate-500 border-slate-500/15",
    };
  }
  if (isExpired) {
    return {
      status: "EXPIRED",
      label: "Quá hạn",
      badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/15",
    };
  }
  if (checkinState === "REJECTED") {
    return {
      status: "REJECTED",
      label: "Bị từ chối",
      badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/15",
    };
  }
  return {
    status: "NOT_SUBMITTED",
    label: "Chưa nộp",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/15",
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

function SafeThumbnail({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center text-on-muted bg-surface-container">
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
    return <span className="text-xs text-on-muted italic font-medium">Chưa có ai</span>;
  }

  return (
    <div className="flex items-center -space-x-1.5 overflow-hidden">
      {visible.map((p) => (
        <div
          key={p.userId}
          className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-surface-container-lowest shrink-0"
        >
          <UserAvatar name={p.userName} src={p.userAvatar} size="sm" className="w-full h-full" />
        </div>
      ))}
      {overflow > 0 && (
        <span className="flex items-center justify-center text-[10px] font-bold text-on-muted bg-surface-container border border-surface-container-high rounded-full w-7 h-7 shrink-0 font-inter">
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
      <span className="text-xs font-bold text-rose-600 font-inter">Đã quá hạn</span>
    );
  }

  if (isExpired && allowLateSubmit) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold font-inter border border-emerald-500/10">
        Nộp bù
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border",
        remainingHours <= 2
          ? "bg-rose-500/10 text-rose-600 border-rose-500/10"
          : remainingHours <= 6
          ? "bg-amber-500/10 text-amber-600 border-amber-500/10"
          : "bg-surface-mid text-on-surface border-surface-container"
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
          className="whitespace-nowrap px-4 py-2 text-xs font-bold rounded-xl gradient-primary text-on-primary hover:brightness-105 transition-all font-manrope shadow-md shadow-primary/10 cursor-pointer border-none"
        >
          Check-in
        </button>
      );
    case "EXPIRED":
    case "LOCKED":
      return (
        <button
          disabled
          className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-xl bg-surface-container text-on-muted cursor-not-allowed inline-flex items-center gap-1.5 font-manrope border-none"
        >
          <Lock className="h-3.5 w-3.5" />
          Đã khóa
        </button>
      );
    case "SUBMITTED":
      return (
        <button
          disabled
          className="px-3 py-1.5 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/15 inline-flex items-center gap-1.5 cursor-not-allowed select-none font-manrope"
        >
          <Check className="h-3.5 w-3.5 font-extrabold" />
          Đã nộp
        </button>
      );
    case "PENDING_REVIEW":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 py-1.5 font-manrope animate-pulse">
          <Clock className="w-3.5 h-3.5" />
          Chờ duyệt
        </span>
      );
    case "REJECTED":
      return (
        <button
          onClick={() => onCheckIn?.(post)}
          className="whitespace-nowrap px-4 py-2 text-xs font-bold rounded-xl gradient-primary text-on-primary hover:brightness-105 transition-all font-manrope shadow-md shadow-primary/10 cursor-pointer border-none"
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Filter Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab Filters */}
        <div className="flex bg-surface-container-low p-1 rounded-2xl border border-surface-container-high overflow-x-auto max-w-full">
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
                "px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer border-none",
                filter === f.id
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-muted hover:text-on-surface"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex items-center bg-surface-container-low border border-surface-container-high rounded-xl px-3 py-2 w-full md:max-w-xs focus-within:border-primary transition-all">
          <Search className="w-4 h-4 text-on-muted mr-2 shrink-0" />
          <input
            className="bg-transparent border-none focus:ring-0 w-full text-xs text-on-surface placeholder:text-on-muted/80 focus:outline-none p-0"
            placeholder="Tìm kiếm tiêu đề bài đăng..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tasks strips card list */}
      {filteredPosts.length > 0 ? (
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const startAtDate = post.start_at || post.scheduledAt || now.toISOString();
            const thumbnailUrl = post.thumbnail_url || post.thumbnailUrl;
            const { status: postStatus, label: statusLabel, badgeClass } = getPostStatus(post, now);
            const postUrl = post.url || post.originalUrl || "#";

            return (
              <div
                key={post.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface-container-lowest border border-surface-container rounded-2xl hover:border-surface-container-high hover:shadow-card transition-all duration-200 gap-4"
              >
                {/* 1. Thumbnail + Title + Source */}
                <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-container shrink-0 relative border border-surface-container-high shadow-inner">
                    <SafeThumbnail src={thumbnailUrl} alt={post.title} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <a
                      href={postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-on-surface text-sm hover:text-primary hover:underline line-clamp-1 transition-colors flex items-center gap-1.5 group"
                    >
                      <span>{post.title}</span>
                      <ExternalLink className="h-3 w-3 text-on-muted shrink-0 group-hover:text-primary transition-colors" />
                    </a>
                    <span className="text-[10px] text-primary font-semibold block font-inter">
                      Nguồn: {displayAuthor(post.author)}
                    </span>
                  </div>
                </div>

                {/* 2. Grid Meta info on desktop, flex on mobile */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-between sm:justify-end">
                  {/* Status Badge */}
                  <div className="shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] border",
                        badgeClass
                      )}
                    >
                      {postStatus === "PENDING_REVIEW" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                      )}
                      {statusLabel}
                    </span>
                  </div>

                  {/* Deadline countdown */}
                  <div className="shrink-0 min-w-[90px]">
                    {postStatus === "SUBMITTED" || postStatus === "PENDING_REVIEW" || postStatus === "REJECTED" ? (
                      <span className="text-xs text-on-muted font-bold font-manrope flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-on-muted" />
                        {format(new Date(startAtDate), "dd/MM/yyyy", { locale: vi })}
                      </span>
                    ) : (
                      <DeadlineCell startAtDate={startAtDate} allowLateSubmit={post.allow_late_submit} />
                    )}
                  </div>

                  {/* Participants */}
                  <div className="shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-on-muted hidden sm:inline" />
                      <ParticipantsCell participants={participantsMap[post.id] || []} />
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0 text-right sm:pl-2">
                    <ActionCell
                      post={post}
                      postStatus={postStatus}
                      onCheckIn={onCheckIn}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pt-4 flex items-center justify-between text-xs text-on-muted">
              <p className="font-medium font-inter">
                Hiển thị {filteredPosts.length} trong tổng số {posts.length} nhiệm vụ
              </p>
              <div className="flex items-center gap-3">
                <span className="font-bold font-inter">
                  Trang {currentPage} / {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (currentPage > 1) {
                        handlePageChange(currentPage - 1);
                      }
                    }}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container hover:text-on-surface disabled:opacity-40 disabled:hover:bg-surface-container-low transition-all cursor-pointer border-none text-on-muted"
                    title="Trang trước"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (currentPage < totalPages) {
                        handlePageChange(currentPage + 1);
                      }
                    }}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container hover:text-on-surface disabled:opacity-40 disabled:hover:bg-surface-container-low transition-all cursor-pointer border-none text-on-muted"
                    title="Trang sau"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <section className="bg-surface-container-lowest rounded-3xl border border-surface-container py-16 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center mb-3 text-on-muted animate-bounce">
            <FolderOpen className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-on-surface font-manrope">Không tìm thấy bài viết</h3>
          <p className="text-[10px] text-on-muted mt-1 font-inter">Không có nhiệm vụ nào khớp với bộ lọc hiện tại.</p>
        </section>
      )}
    </div>
  );
}
