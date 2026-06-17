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
import Image from "next/image";
import { Clock, CheckCircle2, AlertCircle, XCircle, ExternalLink, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

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
  
  // Floating tooltip state
  const [hoveredPost, setHoveredPost] = useState<Post | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

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

  const handlePostMouseEnter = (post: Post, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredPost(post);
    setTooltipPos({
      x: rect.left + window.scrollX + rect.width / 2,
      y: rect.top + window.scrollY - 8,
    });
  };

  const handlePostMouseLeave = () => {
    setHoveredPost(null);
  };

  const renderSinglePost = (post: Post) => {
    const checkinState = post.checkinStatus || (post.status === "COMPLETED" ? "APPROVED" : null);
    const isSubmitted = !!checkinState;
    const thumbnailUrl = post.thumbnail_url || post.thumbnailUrl;

    return (
      <div
        className="group absolute inset-0 cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-inner"
        onClick={() => onCheckIn(post)}
        onMouseEnter={(e) => handlePostMouseEnter(post, e)}
        onMouseLeave={handlePostMouseLeave}
      >
        {thumbnailUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 transition-all duration-500 group-hover:scale-110"
            style={{ backgroundImage: `url(${thumbnailUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-indigo-100/30" />
        )}
        
        {/* Overlay scrim */}
        <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/5 transition-colors" />

        <div className="relative p-2.5 h-full flex flex-col justify-between z-10">
          <div className="flex justify-end">
            {isSubmitted ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[9px] border border-emerald-600 shadow-sm">
                Đã nộp
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white font-bold text-[9px] border border-indigo-700 shadow-sm animate-pulse">
                Share
              </span>
            )}
          </div>
          <p className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight bg-white/90 p-1.5 rounded-lg border border-slate-200/50 backdrop-blur-sm shadow-sm">
            {post.title}
          </p>
        </div>
      </div>
    );
  };

  const renderDoublePosts = (post1: Post, post2: Post) => {
    const checkinState1 = post1.checkinStatus || (post1.status === "COMPLETED" ? "APPROVED" : null);
    const checkinState2 = post2.checkinStatus || (post2.status === "COMPLETED" ? "APPROVED" : null);

    const thumb1 = post1.thumbnail_url || post1.thumbnailUrl;
    const thumb2 = post2.thumbnail_url || post2.thumbnailUrl;

    return (
      <div className="relative w-full h-full overflow-hidden bg-slate-100">
        {/* Top-Left Half (Post 1) */}
        <div
          className="absolute inset-0 cursor-pointer transition-all duration-200 z-10 origin-top-left hover:scale-[1.05] hover:z-30 hover:brightness-105 group/p1"
          style={{ 
            clipPath: "polygon(0 0, 100% 0, 0 100%)",
            transformOrigin: "25% 25%" 
          }}
          onClick={() => onCheckIn(post1)}
          onMouseEnter={(e) => handlePostMouseEnter(post1, e)}
          onMouseLeave={handlePostMouseLeave}
        >
          {thumb1 ? (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-60 transition-all duration-300 group-hover/p1:opacity-85"
              style={{ backgroundImage: `url(${thumb1})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 to-blue-200/30" />
          )}
          <div className="absolute top-[20%] left-[20%] z-20">
             {checkinState1 === "APPROVED" || checkinState1 === "AUTO_APPROVED" ? (
              <CheckCircle2 className="text-emerald-600 bg-white rounded-full w-5 h-5 shadow-sm" />
            ) : checkinState1 === "PENDING" ? (
              <Clock className="text-amber-600 bg-white rounded-full w-5 h-5 shadow-sm" />
            ) : checkinState1 === "REJECTED" ? (
              <XCircle className="text-rose-600 bg-white rounded-full w-5 h-5 shadow-sm" />
            ) : (
              <span className="flex items-center justify-center w-5 h-5 bg-indigo-600 text-white rounded-full text-[9px] font-bold shadow-sm">1</span>
            )}
          </div>
        </div>

        {/* Bottom-Right Half (Post 2) */}
        <div
          className="absolute inset-0 cursor-pointer transition-all duration-200 z-20 origin-bottom-right hover:scale-[1.05] hover:z-30 hover:brightness-105 group/p2"
          style={{ 
            clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
            transformOrigin: "75% 75%" 
          }}
          onClick={() => onCheckIn(post2)}
          onMouseEnter={(e) => handlePostMouseEnter(post2, e)}
          onMouseLeave={handlePostMouseLeave}
        >
          {thumb2 ? (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-60 transition-all duration-300 group-hover/p2:opacity-85"
              style={{ backgroundImage: `url(${thumb2})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-100/40 to-purple-200/30" />
          )}
          <div className="absolute bottom-[20%] right-[20%] z-20">
             {checkinState2 === "APPROVED" || checkinState2 === "AUTO_APPROVED" ? (
              <CheckCircle2 className="text-emerald-600 bg-white rounded-full w-5 h-5 shadow-sm" />
            ) : checkinState2 === "PENDING" ? (
              <Clock className="text-amber-600 bg-white rounded-full w-5 h-5 shadow-sm" />
            ) : checkinState2 === "REJECTED" ? (
              <XCircle className="text-rose-600 bg-white rounded-full w-5 h-5 shadow-sm" />
            ) : (
              <span className="flex items-center justify-center w-5 h-5 bg-indigo-600 text-white rounded-full text-[9px] font-bold shadow-sm">2</span>
            )}
          </div>
        </div>

        {/* Diagonal Separator Line */}
        <div className="absolute inset-0 pointer-events-none z-25">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <line x1="100" y1="0" x2="0" y2="100" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
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
      <div className="absolute bottom-1.5 right-1.5 flex -space-x-1.5 z-40 pointer-events-none">
        {displayAvatars.map((a) => (
          <div
            key={a.id}
            className="relative w-5 h-5 rounded-full border border-white bg-slate-200 overflow-hidden shadow-sm pointer-events-auto"
            title={a.name}
          >
            <Image src={a.imageUrl || `https://ui-avatars.com/api/?name=${a.name}`} alt={a.name} fill className="object-cover" sizes="20px" />
          </div>
        ))}
        {extraCount > 0 && (
          <div className="relative w-5 h-5 rounded-full border border-white bg-indigo-600 text-[8px] text-white flex items-center justify-center font-bold shadow-sm z-10 pointer-events-auto">
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Calendar Header Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 capitalize">{formattedMonthYear}</h2>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={prev} 
              className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={today} 
              className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              Hôm nay
            </button>
            <button 
              onClick={next} 
              className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-sm">
          <button 
            onClick={() => setViewMode("WEEK")} 
            className={cn(
              "px-4 py-1.5 text-xs font-bold rounded-lg transition-all", 
              viewMode === "WEEK" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            Theo tuần
          </button>
          <button 
            onClick={() => setViewMode("MONTH")} 
            className={cn(
              "px-4 py-1.5 text-xs font-bold rounded-lg transition-all", 
              viewMode === "MONTH" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            Theo tháng
          </button>
        </div>
      </div>

      {/* Calendar Table Layout */}
      <div className="bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden">
        {/* Day Names Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50">
          {weekDays.map((day) => (
            <div key={day} className="py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 border-t border-slate-100">
          {days.map((day, idx) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayPosts = posts.filter((p) => format(new Date(p.start_at || p.scheduledAt || new Date()), "yyyy-MM-dd") === dateKey);

            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={idx}
                className={cn(
                  "relative min-h-[140px] flex flex-col p-2 hover:bg-slate-50/40 transition-colors duration-200",
                  !isCurrentMonth && viewMode === "MONTH" ? "bg-slate-50/20 opacity-30" : "bg-white",
                  isCurrentDay && "bg-indigo-50/10"
                )}
              >
                {/* Cell Date Number */}
                <div className="flex justify-between items-start mb-2 z-20">
                  <span
                    className={cn(
                      "text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full",
                      isCurrentDay ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Content Box (Posts inside Cell) */}
                <div className="flex-1 w-full relative min-h-[80px] z-10 rounded-lg overflow-hidden border border-slate-200/50">
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

      {/* Floating Hover Tooltip */}
      {hoveredPost && (
        <div 
          className="fixed z-[999] -translate-x-1/2 -translate-y-full bg-slate-950/95 backdrop-blur-md text-white text-xs p-4 rounded-xl shadow-2xl border border-slate-800/80 w-64 pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border tracking-wider",
              hoveredPost.team === "TECH" ? "bg-blue-950 text-blue-400 border-blue-900/50" :
              hoveredPost.team === "SALES" ? "bg-pink-950 text-pink-400 border-pink-900/50" :
              "bg-indigo-950 text-indigo-400 border-indigo-900/50"
            )}>
              {hoveredPost.team || "ALL"}
            </span>

            {/* Checkin Status Badge inside Tooltip */}
            {hoveredPost.checkinStatus === "APPROVED" || hoveredPost.checkinStatus === "AUTO_APPROVED" ? (
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã duyệt
              </span>
            ) : hoveredPost.checkinStatus === "PENDING" ? (
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Chờ duyệt
              </span>
            ) : hoveredPost.checkinStatus === "REJECTED" ? (
              <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Bị từ chối
              </span>
            ) : (
              <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Chưa nộp
              </span>
            )}
          </div>

          <h4 className="font-bold text-sm text-slate-100 uppercase tracking-tight line-clamp-2 mb-1.5">
            {hoveredPost.title}
          </h4>

          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
            {hoveredPost.description || "Thực hiện like và chia sẻ bài viết này công khai."}
          </p>

          <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900 pt-2">
            <span>Bắt đầu: {format(new Date(hoveredPost.start_at || hoveredPost.scheduledAt || new Date()), "HH:mm dd/MM")}</span>
            <span className="text-indigo-400 font-semibold flex items-center gap-0.5">
              Click to action <ExternalLink className="w-2.5 h-2.5" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

