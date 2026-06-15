"use client";

import React, { useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
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

type Avatar = {
  id: string;
  name: string;
  imageUrl: string;
};

type CalendarProps = {
  posts: Post[];
  completedAvatarsByDate?: Record<string, Avatar[]>;
  onCheckIn: (post: Post) => void;
};

export function PostCalendarView({ posts, completedAvatarsByDate = {}, onCheckIn }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"MONTH" | "WEEK">("MONTH");

  const next = () => {
    setCurrentDate((prev) => (viewMode === "MONTH" ? addMonths(prev, 1) : addWeeks(prev, 1)));
  };

  const prev = () => {
    setCurrentDate((prev) => (viewMode === "MONTH" ? subMonths(prev, 1) : subWeeks(prev, 1)));
  };

  const today = () => setCurrentDate(new Date());

  const getDaysInView = () => {
    if (viewMode === "MONTH") {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
  };

  const days = getDaysInView();
  const weekDays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];

  const renderSinglePost = (post: Post) => {
    const isCompleted = post.status === "COMPLETED";
    return (
      <div
        className="group relative w-full h-full cursor-pointer overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"
        onClick={() => onCheckIn(post)}
        title={post.title}
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110"
          style={{ backgroundImage: `url(${post.thumbnailUrl || ""})` }}
        />
        <div className="absolute inset-0 flex items-center justify-center transition-opacity group-hover:opacity-0 bg-black/5 dark:bg-black/20 group-hover:bg-black/40">
          {isCompleted ? (
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md animate-pulse">
              <AlertCircle className="w-5 h-5" />
            </div>
          )}
        </div>
        {/* Tooltip on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end min-h-[50%]">
          <p className="text-xs font-semibold line-clamp-2">{post.title}</p>
        </div>
      </div>
    );
  };

  const renderDoublePosts = (post1: Post, post2: Post) => {
    return (
      <div className="relative w-full h-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-inner">
        {/* Top Right Triangle */}
        <div
          className="absolute inset-0 cursor-pointer transition-all duration-300 z-10 hover:z-30 hover:brightness-110 group/p1"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
          onClick={() => onCheckIn(post1)}
          title={post1.title}
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 transition-all duration-300 group-hover/p1:opacity-100 group-hover/p1:scale-110"
            style={{ backgroundImage: `url(${post1.thumbnailUrl || ""})` }}
          />
          <div className="absolute top-[25%] right-[25%] -translate-x-1/2 -translate-y-1/2 transition-opacity group-hover/p1:opacity-0">
             {post1.status === "COMPLETED" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 drop-shadow-md" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-500 drop-shadow-md" />
            )}
          </div>
          <div className="absolute inset-0 flex items-start justify-end p-2 opacity-0 group-hover/p1:opacity-100 bg-black/30 transition-opacity pointer-events-none">
             <p className="text-[10px] text-white font-medium max-w-[60%] text-right line-clamp-2 leading-tight drop-shadow-md mt-6">{post1.title}</p>
          </div>
        </div>

        {/* Bottom Left Triangle */}
        <div
          className="absolute inset-0 cursor-pointer transition-all duration-300 z-20 hover:z-30 hover:brightness-110 group/p2"
          style={{ clipPath: "polygon(0 0, 100% 100%, 0 100%)" }}
          onClick={() => onCheckIn(post2)}
          title={post2.title}
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 transition-all duration-300 group-hover/p2:opacity-100 group-hover/p2:scale-110"
            style={{ backgroundImage: `url(${post2.thumbnailUrl || ""})` }}
          />
          <div className="absolute bottom-[25%] left-[25%] translate-x-1/2 translate-y-1/2 transition-opacity group-hover/p2:opacity-0">
             {post2.status === "COMPLETED" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 drop-shadow-md" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-500 drop-shadow-md" />
            )}
          </div>
          <div className="absolute inset-0 flex items-end justify-start p-2 opacity-0 group-hover/p2:opacity-100 bg-black/30 transition-opacity pointer-events-none">
             <p className="text-[10px] text-white font-medium max-w-[60%] text-left line-clamp-2 leading-tight drop-shadow-md mb-6">{post2.title}</p>
          </div>
        </div>

        {/* Divider line for aesthetics */}
        <div className="absolute inset-0 pointer-events-none z-25">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
          </svg>
        </div>
      </div>
    );
  };

  const renderAvatars = (dateKey: string) => {
    const avatars = completedAvatarsByDate[dateKey] || [];
    if (avatars.length === 0) return null;

    const displayAvatars = avatars.slice(0, 3);
    const extraCount = avatars.length - 3;

    return (
      <div className="absolute bottom-1 right-1 flex -space-x-1.5 z-40 pointer-events-none">
        {displayAvatars.map((a, i) => (
          <div
            key={a.id}
            className="relative w-5 h-5 rounded-full border border-white dark:border-slate-900 bg-slate-200 overflow-hidden shadow-sm pointer-events-auto"
            title={a.name}
          >
            <img src={a.imageUrl || `https://ui-avatars.com/api/?name=${a.name}`} alt={a.name} className="w-full h-full object-cover" />
          </div>
        ))}
        {extraCount > 0 && (
          <div className="relative w-5 h-5 rounded-full border border-white dark:border-slate-900 bg-slate-800 text-[9px] text-white flex items-center justify-center font-medium shadow-sm z-10 pointer-events-auto">
            +{extraCount}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 min-w-[180px]">
            {viewMode === "MONTH"
              ? format(currentDate, "MMMM yyyy")
              : `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d")}`}
          </h2>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button onClick={prev} className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={today} className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors">
              Hôm nay
            </button>
            <button onClick={next} className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Toggles */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setViewMode("MONTH")}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
              viewMode === "MONTH" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            Tháng
          </button>
          <button
            onClick={() => setViewMode("WEEK")}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
              viewMode === "WEEK" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            Tuần
          </button>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center font-semibold text-xs text-slate-400 uppercase tracking-wider py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className={cn("grid grid-cols-7 gap-2", viewMode === "MONTH" ? "auto-rows-[1fr]" : "")}>
        {days.map((day, idx) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayPosts = posts.filter((p) => format(new Date(p.scheduledAt), "yyyy-MM-dd") === dateKey);
          
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={idx}
              className={cn(
                "relative min-h-[130px] rounded-2xl border p-2 transition-colors flex flex-col",
                isCurrentDay ? "border-indigo-500/50 bg-indigo-50/30 dark:bg-indigo-900/10 dark:border-indigo-500/30" : "border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900/40",
                !isCurrentMonth && viewMode === "MONTH" ? "opacity-40 grayscale-[0.5]" : ""
              )}
            >
              {/* Date Number */}
              <div className="flex justify-between items-start mb-2 z-10 relative pointer-events-none">
                <span
                  className={cn(
                    "text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                    isCurrentDay ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-slate-700 dark:text-slate-300"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Content Box */}
              <div className="flex-1 w-full relative min-h-[80px]">
                {dayPosts.length === 1 && renderSinglePost(dayPosts[0])}
                {dayPosts.length >= 2 && renderDoublePosts(dayPosts[0], dayPosts[1])}
              </div>

              {/* Avatars */}
              {viewMode === "MONTH" && renderAvatars(dateKey)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
