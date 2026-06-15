"use client";

import React, { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";
import { cn } from "@/lib/utils";

type Post = {
  id: string;
  title: string;
  description: string;
  originalUrl: string;
  thumbnailUrl?: string | null;
  scheduledAt: string;
  status: "PENDING" | "COMPLETED" | "EXPIRED";
};

const PostRowCard = ({ post, onCheckIn }: { post: Post; onCheckIn: (post: Post) => void }) => {
  const [timeLeft, setTimeLeft] = useState("00:00:00");
  const [isExpired, setIsExpired] = useState(false);
  const [remainingHours, setRemainingHours] = useState(24);

  useEffect(() => {
    const calculateTime = () => {
      const scheduled = new Date(post.scheduledAt);
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
  }, [post.scheduledAt]);

  const isCompleted = post.status === "COMPLETED";

  // Determine badge styling based on completion, expiration, and urgency
  let badgeClass = "bg-primary-fixed text-on-primary-fixed-variant";
  let badgeIcon = "new_releases";
  let badgeText = `${remainingHours}h còn lại`;

  if (isCompleted) {
    badgeClass = "bg-secondary-container text-on-secondary-container";
    badgeIcon = "check_circle";
    badgeText = "Hoàn thành";
  } else if (isExpired) {
    badgeClass = "bg-error-container text-on-error-container";
    badgeIcon = "lock";
    badgeText = "Quá hạn 24h";
  } else if (remainingHours <= 2) {
    badgeClass = "bg-error-container text-on-error-container animate-pulse";
    badgeIcon = "priority_high";
    badgeText = "Gấp! Còn 2h";
  } else if (remainingHours <= 6) {
    badgeClass = "bg-tertiary-fixed text-on-tertiary-fixed-variant";
    badgeIcon = "schedule";
    badgeText = "Sắp hết hạn";
  }

  // Timer color
  let timerTextClass = "text-primary";
  let timerIcon = "timer";
  if (isCompleted) {
    timerTextClass = "text-on-surface-variant opacity-50";
  } else if (isExpired) {
    timerTextClass = "text-error";
    timerIcon = "lock";
  } else if (remainingHours <= 2) {
    timerTextClass = "text-error font-bold";
  }

  return (
    <div className={cn(
      "group bg-white rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center gap-lg border border-outline-variant/20 hover:shadow-md transition-all duration-300",
      isCompleted && "opacity-90"
    )}>
      {/* Thumbnail */}
      <div className={cn(
        "w-full md:w-32 h-36 md:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container-low border border-outline-variant/10",
        isCompleted && "grayscale"
      )}>
        {post.thumbnailUrl ? (
          <img 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            src={post.thumbnailUrl} 
            alt={post.title}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary text-xs font-semibold">
            No Image
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-title-md text-title-md text-on-surface truncate group-hover:text-primary transition-colors">
          {post.title}
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 mb-2">
          {post.description || "Hãy thực hiện chia sẻ bài viết này lên mạng xã hội và check-in."}
        </p>
        <div className="flex items-center gap-2">
          <span className={cn("material-symbols-outlined text-[18px]", timerTextClass)}>{timerIcon}</span>
          <span className={cn("font-label-md text-label-md", timerTextClass)}>
            {isCompleted ? "00:00:00" : timeLeft}
          </span>
        </div>
      </div>

      {/* Action / Badges */}
      <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-outline-variant/10">
        <span className={cn("px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1", badgeClass)}>
          <span className="material-symbols-outlined text-[14px]">{badgeIcon}</span>
          {badgeText}
        </span>
        
        {isCompleted ? (
          <button 
            className="px-6 py-2 bg-surface-container-highest text-outline rounded-lg font-label-md text-label-md cursor-not-allowed" 
            disabled
          >
            Đã check-in
          </button>
        ) : isExpired ? (
          <button 
            className="px-6 py-2 bg-surface-container-highest text-outline rounded-lg font-label-md text-label-md cursor-not-allowed" 
            disabled
          >
            Đã khóa
          </button>
        ) : (
          <button 
            onClick={() => onCheckIn(post)}
            className="px-6 py-2 bg-primary hover:bg-primary-container text-white rounded-lg font-label-md text-label-md transition-all active:scale-95 shadow-sm hover:shadow"
          >
            Check-in
          </button>
        )}
      </div>
    </div>
  );
};

export function PostListView({ posts, onCheckIn }: { posts: Post[], onCheckIn?: (post: Post) => void }) {
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "COMPLETED" | "EXPIRED">("ALL");

  const filteredPosts = posts.filter((post) => {
    if (filter === "ALL") return true;
    if (filter === "COMPLETED") return post.status === "COMPLETED";

    const scheduled = new Date(post.scheduledAt);
    const deadline = new Date(scheduled.getTime() + 24 * 60 * 60 * 1000);
    const isActuallyExpired = new Date() > deadline;

    if (filter === "EXPIRED") return isActuallyExpired && post.status !== "COMPLETED";
    if (filter === "PENDING") return !isActuallyExpired && post.status !== "COMPLETED";

    return true;
  });

  return (
    <div className="space-y-lg animate-in fade-in duration-300">
      {/* Header section with Filter Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-md mb-xl">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-background mb-xs">Danh sách bài viết</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Thực hiện Like, Share bài truyền thông nội bộ và check-in đúng hạn.</p>
        </div>
        <div className="flex flex-wrap items-center gap-sm">
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "PENDING", label: "Chưa hoàn thành" },
            { id: "COMPLETED", label: "Đã check-in" },
            { id: "EXPIRED", label: "Quá hạn" }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={cn(
                "px-4 py-2 rounded-full font-label-md text-label-md border transition-all duration-200",
                filter === f.id
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid containing list rows */}
      {filteredPosts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {filteredPosts.map((post) => (
            <PostRowCard 
              key={post.id} 
              post={post} 
              onCheckIn={(p) => onCheckIn ? onCheckIn(p) : console.log("Check-in", p)} 
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-outline-variant/10 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 text-outline-variant">
            <span className="material-symbols-outlined text-4xl">folder_open</span>
          </div>
          <h3 className="font-title-lg text-title-lg text-on-background">Không có bài viết nào</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Không tìm thấy bài viết nào theo bộ lọc hiện tại.</p>
        </div>
      )}
    </div>
  );
}
