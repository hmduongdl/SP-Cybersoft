"use client";

import React, { useEffect, useState } from "react";
import { Clock, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow, differenceInSeconds } from "date-fns";
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

const PostCard = ({ post, onCheckIn }: { post: Post; onCheckIn: (post: Post) => void }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [urgency, setUrgency] = useState<"normal" | "amber" | "red">("normal");

  useEffect(() => {
    const calculateTime = () => {
      const scheduled = new Date(post.scheduledAt);
      const deadline = new Date(scheduled.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();
      const diffSeconds = differenceInSeconds(deadline, now);

      if (diffSeconds <= 0) {
        setIsExpired(true);
        setTimeLeft("00:00:00");
        setUrgency("red");
        return;
      }

      const h = Math.floor(diffSeconds / 3600);
      const m = Math.floor((diffSeconds % 3600) / 60);
      const s = diffSeconds % 60;
      setTimeLeft(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );

      if (diffSeconds < 3600) {
        setUrgency("red");
      } else if (diffSeconds < 6 * 3600) {
        setUrgency("amber");
      } else {
        setUrgency("normal");
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [post.scheduledAt]);

  const isCompleted = post.status === "COMPLETED";
  const disabled = isCompleted || isExpired;

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-md border border-white/20 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:bg-slate-900/70 dark:border-slate-800">
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
        {post.thumbnailUrl ? (
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            No Image
          </div>
        )}
        {/* Status Badge Overlays */}
        {isCompleted && (
          <div className="absolute top-3 right-3 bg-emerald-500/90 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 backdrop-blur-sm shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> Đã hoàn thành
          </div>
        )}
        {isExpired && !isCompleted && (
          <div className="absolute top-3 right-3 bg-rose-500/90 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 backdrop-blur-sm shadow-sm">
            <Lock className="w-3.5 h-3.5" /> Quá hạn
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Content */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
            {post.title}
          </h3>
          {post.description && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2 italic border-l-2 border-indigo-200 dark:border-indigo-800 pl-2">
              "{post.description}"
            </p>
          )}
        </div>

        {/* Countdown Timer */}
        {!isCompleted && (
          <div
            className={cn(
              "flex items-center gap-2 text-sm font-medium p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 transition-colors",
              urgency === "normal" && "text-emerald-600 dark:text-emerald-400",
              urgency === "amber" && "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
              urgency === "red" && "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 animate-pulse"
            )}
          >
            <Clock className="w-4 h-4" />
            <span>Còn lại: {timeLeft}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          disabled={disabled}
          onClick={() => onCheckIn(post)}
          className={cn(
            "mt-auto w-full py-2.5 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 focus:ring-2 focus:ring-offset-2",
            isCompleted
              ? "bg-slate-100 text-emerald-600 cursor-not-allowed dark:bg-slate-800 dark:text-emerald-500"
              : isExpired
              ? "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800"
              : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] focus:ring-indigo-500"
          )}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="w-5 h-5" /> Đã hoàn thành
            </>
          ) : isExpired ? (
            <>
              <Lock className="w-5 h-5" /> Quá hạn 24h
            </>
          ) : (
            "Bắt đầu Check-in"
          )}
        </button>
      </div>
    </div>
  );
};

export function PostListView({ posts, onCheckIn }: { posts: Post[], onCheckIn?: (post: Post) => void }) {
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "COMPLETED" | "EXPIRED">("ALL");

  const filteredPosts = posts.filter((post) => {
    if (filter === "ALL") return true;
    if (filter === "COMPLETED") return post.status === "COMPLETED";
    
    // Evaluate expired real-time or just based on status if we update status
    const scheduled = new Date(post.scheduledAt);
    const deadline = new Date(scheduled.getTime() + 24 * 60 * 60 * 1000);
    const isActuallyExpired = new Date() > deadline;

    if (filter === "EXPIRED") return isActuallyExpired && post.status !== "COMPLETED";
    if (filter === "PENDING") return !isActuallyExpired && post.status !== "COMPLETED";
    
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: "ALL", label: "Tất cả" },
          { id: "PENDING", label: "Chưa share" },
          { id: "COMPLETED", label: "Đã share" },
          { id: "EXPIRED", label: "Quá hạn" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={cn(
              "whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
              filter === f.id
                ? "bg-slate-900 text-white shadow-md dark:bg-indigo-500"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} onCheckIn={(p) => onCheckIn ? onCheckIn(p) : console.log("Check-in", p)} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">Không có bài viết nào</h3>
          <p className="text-slate-500 mt-1">Danh sách theo bộ lọc hiện tại đang trống.</p>
        </div>
      )}
    </div>
  );
}
