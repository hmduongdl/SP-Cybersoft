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
  isToday,
} from "date-fns";
import { vi } from "date-fns/locale";
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
  const weekDays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

  const renderSinglePost = (post: Post) => {
    const isCompleted = post.status === "COMPLETED";
    return (
      <div
        className="group absolute inset-0 cursor-pointer overflow-hidden"
        onClick={() => onCheckIn(post)}
        title={post.title}
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10 transition-all duration-500 group-hover:scale-110"
          style={{ backgroundImage: `url(${post.thumbnailUrl || ""})` }}
        />
        <div className="relative p-2 h-full flex flex-col justify-between z-10">
          <div className="flex justify-end">
            {isCompleted ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-label-sm text-[10px] font-semibold border border-emerald-200">
                Đã share
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed/30 text-primary font-label-sm text-[10px] font-semibold border border-primary-fixed/50 animate-pulse">
                Check-in
              </span>
            )}
          </div>
          <p className="text-[10px] font-semibold text-on-surface line-clamp-2 leading-tight bg-white/60 p-1 rounded backdrop-blur-[2px]">
            {post.title}
          </p>
        </div>
      </div>
    );
  };

  const renderDoublePosts = (post1: Post, post2: Post) => {
    return (
      <div className="relative w-full h-full overflow-hidden bg-slate-50/50">
        {/* Top Right Triangle */}
        <div
          className="absolute inset-0 cursor-pointer transition-all duration-300 z-10 hover:z-30 hover:brightness-110 group/p1"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
          onClick={() => onCheckIn(post1)}
          title={post1.title}
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10 transition-all duration-300 group-hover/p1:opacity-30 group-hover/p1:scale-110"
            style={{ backgroundImage: `url(${post1.thumbnailUrl || ""})` }}
          />
          <div className="absolute top-[25%] right-[25%] -translate-x-1/2 -translate-y-1/2">
             {post1.status === "COMPLETED" ? (
              <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
            ) : (
              <span className="material-symbols-outlined text-primary text-sm">pending</span>
            )}
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
            className="absolute inset-0 bg-cover bg-center opacity-10 transition-all duration-300 group-hover/p2:opacity-30 group-hover/p2:scale-110"
            style={{ backgroundImage: `url(${post2.thumbnailUrl || ""})` }}
          />
          <div className="absolute bottom-[25%] left-[25%] translate-x-1/2 translate-y-1/2">
             {post2.status === "COMPLETED" ? (
              <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
            ) : (
              <span className="material-symbols-outlined text-primary text-sm">pending</span>
            )}
          </div>
        </div>

        {/* Diagonal Separator */}
        <div className="absolute inset-0 pointer-events-none z-25">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
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
      <div className="absolute bottom-1 right-1 flex -space-x-2 z-40 pointer-events-none">
        {displayAvatars.map((a) => (
          <div
            key={a.id}
            className="relative w-5 h-5 rounded-full border border-white bg-slate-200 overflow-hidden shadow-sm pointer-events-auto"
            title={a.name}
          >
            <img src={a.imageUrl || `https://ui-avatars.com/api/?name=${a.name}`} alt={a.name} className="w-full h-full object-cover" />
          </div>
        ))}
        {extraCount > 0 && (
          <div className="relative w-5 h-5 rounded-full border border-white bg-primary text-[8px] text-white flex items-center justify-center font-bold shadow-sm z-10 pointer-events-auto">
            +{extraCount}
          </div>
        )}
      </div>
    );
  };

  const formattedMonthYear = viewMode === "MONTH"
    ? format(currentDate, "MMMM yyyy", { locale: vi })
    : `Tuần của ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: vi })}`;

  return (
    <div className="space-y-lg animate-in fade-in duration-300">
      {/* Calendar Header Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl">
        <div className="space-y-sm">
          <h2 className="font-headline-lg text-headline-lg text-on-background capitalize">{formattedMonthYear}</h2>
          <div className="flex items-center gap-xs">
            <button 
              onClick={prev} 
              className="p-1 hover:bg-surface-container rounded-full transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button 
              onClick={today} 
              className="px-4 py-1.5 bg-surface-container text-primary font-label-md rounded-lg hover:bg-surface-container-high transition-colors font-semibold"
            >
              Hôm nay
            </button>
            <button 
              onClick={next} 
              className="p-1 hover:bg-surface-container rounded-full transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-surface-container-low p-xs rounded-xl border border-outline-variant/20 shadow-sm">
          <button 
            onClick={() => setViewMode("WEEK")} 
            className={cn(
              "px-lg py-1.5 font-label-md rounded-lg transition-all font-semibold", 
              viewMode === "WEEK" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:bg-white/50"
            )}
          >
            Theo tuần
          </button>
          <button 
            onClick={() => setViewMode("MONTH")} 
            className={cn(
              "px-lg py-1.5 font-label-md rounded-lg transition-all font-semibold", 
              viewMode === "MONTH" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:bg-white/50"
            )}
          >
            Theo tháng
          </button>
        </div>
      </div>

      {/* Calendar Table Layout */}
      <div className="bg-white rounded-2xl shadow-lg border border-outline-variant/10 overflow-hidden">
        {/* Day Names Header */}
        <div className="grid grid-cols-7 border-b border-outline-variant/10 bg-surface-container-low/50">
          {weekDays.map((day) => (
            <div key={day} className="py-2.5 text-center font-label-md text-outline text-xs uppercase tracking-wider font-bold">
              {day}
            </div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-outline-variant/10 border-t border-outline-variant/10">
          {days.map((day, idx) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayPosts = posts.filter((p) => format(new Date(p.scheduledAt), "yyyy-MM-dd") === dateKey);

            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={idx}
                className={cn(
                  "relative min-h-[140px] flex flex-col p-2 hover:bg-surface-container-low transition-colors duration-250",
                  !isCurrentMonth && viewMode === "MONTH" ? "bg-surface-container-lowest/30 opacity-40" : "bg-white",
                  isCurrentDay && "bg-indigo-50/20 border-2 border-indigo-500/20"
                )}
              >
                {/* Cell Date Number */}
                <div className="flex justify-between items-start mb-2 z-20">
                  <span
                    className={cn(
                      "text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full",
                      isCurrentDay ? "bg-primary text-white" : "text-on-surface"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Content Box (Posts inside Cell) */}
                <div className="flex-1 w-full relative min-h-[80px] z-10 rounded-lg overflow-hidden border border-outline-variant/5">
                  {dayPosts.length === 1 && renderSinglePost(dayPosts[0])}
                  {dayPosts.length >= 2 && renderDoublePosts(dayPosts[0], dayPosts[1])}
                </div>

                {/* Avatar overlays */}
                {viewMode === "MONTH" && renderAvatars(dateKey)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
