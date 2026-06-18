"use client";

import React, { useState, useMemo } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from "lucide-react";

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

type CalendarProps = {
  posts: Post[];
  onCheckIn: (post: Post) => void;
};

type DayStatus = "empty" | "partial" | "completed" | "overdue" | "mixed";

function getDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function getDayStatus(
  dayPosts: Post[],
  now: Date
): { status: DayStatus; completedCount: number; totalCount: number; missedCount: number } {
  if (dayPosts.length === 0) return { status: "empty", completedCount: 0, totalCount: 0, missedCount: 0 };

  let completedCount = 0;
  let missedCount = 0;

  for (const post of dayPosts) {
    const checkinState = post.checkinStatus || (post.status === "COMPLETED" ? "APPROVED" : null);
    const scheduled = new Date(post.start_at || post.scheduledAt || now);
    const deadline = new Date(scheduled.getTime() + 24 * 60 * 60 * 1000);
    const isExpired = now > deadline && !post.allow_late_submit;

    if (checkinState === "APPROVED" || checkinState === "AUTO_APPROVED") {
      completedCount++;
    } else if (isExpired || post.is_archived) {
      missedCount++;
    }
  }

  const status: DayStatus =
    completedCount === dayPosts.length
      ? "completed"
      : missedCount > 0 && completedCount === 0
      ? "overdue"
      : completedCount > 0
      ? "partial"
      : "empty";

  return { status, completedCount, totalCount: dayPosts.length, missedCount };
}

const STATUS_COLORS: Record<DayStatus, { bg: string; text: string }> = {
  completed: { bg: "bg-emerald-50", text: "text-emerald-700" },
  partial: { bg: "bg-amber-50", text: "text-amber-700" },
  empty: { bg: "bg-surface-container-low", text: "text-on-surface-variant" },
  overdue: { bg: "bg-red-50", text: "text-red-700" },
  mixed: { bg: "bg-amber-50", text: "text-amber-700" },
};

export function PostCalendarView({ posts, onCheckIn }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const now = useMemo(() => new Date(), []);

  const next = () => setCurrentDate((prev) => addMonths(prev, 1));
  const prev = () => setCurrentDate((prev) => subMonths(prev, 1));
  const today = () => setCurrentDate(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const postsByDate = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of posts) {
      const key = getDateKey(new Date(post.start_at || post.scheduledAt || now));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    }
    return map;
  }, [posts, now]);

  const filteredPostsByDate = useMemo(() => {
    // Only show posts for the current month being viewed
    const result = new Map<string, Post[]>();
    for (const day of days) {
      const key = getDateKey(day);
      if (postsByDate.has(key)) {
        result.set(key, postsByDate.get(key)!);
      }
    }
    return result;
  }, [days, postsByDate]);

  const handleCellClick = (post: Post) => {
    if (!post.is_archived) onCheckIn(post);
  };

  const formattedMonthYear = format(currentDate, "MMMM yyyy", { locale: vi });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Calendar Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-2xl font-bold text-on-surface capitalize font-manrope">
            {formattedMonthYear}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={prev}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-[#f2f3ff] hover:bg-surface-container-lowest hover:shadow-ambient transition-all text-on-surface-variant"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-[#f2f3ff] hover:bg-surface-container-lowest hover:shadow-ambient transition-all text-on-surface-variant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={today}
              className="px-4 py-1.5 rounded-full bg-[#f2f3ff] hover:bg-surface-container-lowest hover:shadow-ambient text-xs font-bold text-on-surface-variant transition-all"
            >
              Hôm nay
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center space-x-4 px-4 py-2 bg-[#f2f3ff] rounded-xl">
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-surface-container" />
            <span className="text-[11px] font-semibold text-on-surface-variant">Trống</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-300" />
            <span className="text-[11px] font-semibold text-on-surface-variant">Một phần</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-semibold text-on-surface-variant">Hoàn thành</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-300" />
            <span className="text-[11px] font-semibold text-on-surface-variant">Quá hạn</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-surface-container-lowest rounded-[24px] overflow-hidden shadow-[0_20px_40px_rgba(19,27,46,0.06)]">
        {/* Day Names Header */}
        <div className="grid grid-cols-7 bg-[#f2f3ff]">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em]"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dateKey = getDateKey(day);
            const dayPosts = postsByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);
            const { status: dayStatus, completedCount, totalCount, missedCount } = getDayStatus(dayPosts, now);
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const isPast = day < todayStart && !isCurrentDay;

            // Background color for entire cell based on day status
            const cellBg =
              dayPosts.length > 0
                ? STATUS_COLORS[dayStatus].bg
                : isPast
                ? "bg-surface-container-low/50"
                : "bg-surface-container-lowest";

            return (
              <div
                key={idx}
                className={cn(
                  "relative min-h-[120px] flex flex-col p-2 transition-colors duration-200 border border-[#f2f3ff]",
                  !isCurrentMonth ? "opacity-30" : cellBg,
                  isCurrentDay && "ring-2 ring-[#0050cb] ring-inset z-10"
                )}
              >
                {/* Date Number */}
                <div className="flex justify-between items-start mb-1 z-10">
                  <span
                    className={cn(
                      "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                      isCurrentDay
                        ? "bg-[#0050cb] text-white shadow-ambient"
                        : "text-on-surface-variant"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayPosts.length > 1 && (
                    <span className="text-[10px] font-bold text-outline">{dayPosts.length}</span>
                  )}
                </div>

                {/* Posts inside cell */}
                <div className="flex-1 space-y-1 z-10">
                  {dayPosts.length === 1 && (
                    <CalendarPostCard post={dayPosts[0]} onClick={handleCellClick} />
                  )}
                  {dayPosts.length === 2 && (
                    <>
                      <CalendarPostCard post={dayPosts[0]} onClick={handleCellClick} />
                      <CalendarPostCard post={dayPosts[1]} onClick={handleCellClick} />
                    </>
                  )}
                  {dayPosts.length > 2 && (
                    <>
                      <CalendarPostCard post={dayPosts[0]} onClick={handleCellClick} />
                      <CalendarPostCard post={dayPosts[1]} onClick={handleCellClick} />
                      <div className="text-[10px] font-bold text-[#0050cb] text-center py-0.5 bg-surface-container-lowest rounded-xl border border-[#f2f3ff]">
                        +{dayPosts.length - 2} bài
                      </div>
                    </>
                  )}
                </div>

                {/* Status dot indicator */}
                {dayPosts.length > 0 && (
                  <div className="absolute bottom-2 right-2 z-10">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        dayStatus === "completed"
                          ? "bg-emerald-400"
                          : dayStatus === "partial"
                          ? "bg-amber-400"
                          : dayStatus === "overdue"
                          ? "bg-red-400"
                          : "bg-slate-300"
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CalendarPostCard({
  post,
  onClick,
}: {
  post: Post;
  onClick: (post: Post) => void;
}) {
  const checkinState = post.checkinStatus || (post.status === "COMPLETED" ? "APPROVED" : null);
  const thumbnailUrl = post.thumbnail_url || post.thumbnailUrl;
  const postUrl = post.url || post.originalUrl || "#";

  const isSubmitted =
    checkinState === "APPROVED" || checkinState === "AUTO_APPROVED";
  const isRejected = checkinState === "REJECTED";
  const isPending = checkinState === "PENDING";

  const AUTHOR_LABELS: Record<string, string> = {
    songphuong_tech: "Song Phương Tech",
    songphuong: "Song Phương",
  };

  function displayAuthor(author: string | null | undefined): string {
    if (!author) return "";
    return AUTHOR_LABELS[author] || author;
  }

  const authorName = displayAuthor(post.author);

  return (
    <div
      title={post.title}
      className={cn(
        "group flex items-center gap-1.5 p-1.5 rounded-lg transition-all duration-200 border bg-surface-container-lowest hover:shadow-ambient max-h-[70px] overflow-hidden",
        isSubmitted
          ? "border-emerald-200 hover:border-emerald-300"
          : isRejected
          ? "border-rose-200 hover:border-rose-300"
          : isPending
          ? "border-amber-200 hover:border-amber-300"
          : "border-outline-variant/10 hover:border-[#0050cb]/30"
      )}
    >
      {/* Mini thumbnail */}
      <div className="w-6 h-6 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 relative">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes="24px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-outline">
            <ImageIcon className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Title + Author */}
      <div className="flex-1 min-w-0">
        <a
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "text-[11px] font-bold line-clamp-2 leading-snug break-words mt-1 hover:text-primary hover:underline transition-colors",
            isSubmitted
              ? "text-emerald-800"
              : isRejected
              ? "text-rose-700"
              : "text-slate-800"
          )}
        >
          {post.title}
        </a>
        {authorName && (
          <span className="text-[8px] text-primary font-semibold leading-tight block truncate">
            {authorName}
          </span>
        )}
      </div>

      {/* Action area */}
      {isSubmitted ? (
        <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
      ) : isRejected ? (
        <button
          onClick={(e) => { e.stopPropagation(); onClick(post); }}
          className="text-[8px] font-bold text-primary hover:underline flex-shrink-0 px-1"
        >
          Nộp lại
        </button>
      ) : post.is_archived ? (
        <span className="text-[8px] text-on-surface-variant/40 flex-shrink-0">Khoá</span>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onClick(post); }}
          className="text-[8px] font-bold text-primary hover:underline flex-shrink-0 px-1"
        >
          Check-in
        </button>
      )}
    </div>
  );
}
