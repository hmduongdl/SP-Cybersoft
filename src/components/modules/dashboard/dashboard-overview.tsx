"use client";

import Link from "next/link";
import {
  CheckCircle,
  Clock,
  Award,
  ChevronRight,
  Info
} from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";

interface ActivityFeedItem {
  id: string;
  userName: string;
  userImage: string | null;
  postTitle: string;
  submittedAt: string;
}

interface DashboardOverviewProps {
  userName: string;
  pendingCount: number;
  completedCount: number;
  totalPoints: number;
  activityFeed: ActivityFeedItem[];
}

function timeAgo(dateString: string) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 10) return "Vừa xong";
    if (diffInSeconds < 60) return `${diffInSeconds} giây trước`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} ngày trước`;
  } catch (e) {
    return "Mới đây";
  }
}

export function DashboardOverview({
  userName,
  pendingCount,
  completedCount,
  totalPoints,
  activityFeed
}: DashboardOverviewProps) {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* Welcome Header */}
      <div>
        <nav className="flex gap-2 text-xs font-inter text-on-surface-variant/70 mb-2">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-primary font-semibold">Tổng quan</span>
        </nav>
        <h1 className="font-manrope font-bold text-headline-lg text-on-surface">
          Chào mừng quay lại, {userName}!
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant font-inter">
          {pendingCount > 0
            ? `Bạn có ${pendingCount} bài viết cần check-in trong tuần này.`
            : "Tuyệt vời! Bạn đã hoàn thành xuất sắc tất cả check-in tuần này."}
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 flex flex-col justify-between shadow-ambient">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <span className="inline-flex items-center px-3 py-1 bg-error-container text-on-error-container text-[12px] font-bold rounded-full uppercase tracking-wider">
              +{pendingCount} mới
            </span>
          </div>
          <div className="mt-6">
            <p className="font-inter text-[12px] font-semibold tracking-widest uppercase text-on-surface-variant/70">
              Bài Chưa Check-in
            </p>
            <p className="font-manrope text-[40px] font-bold text-on-surface leading-tight">
              {String(pendingCount).padStart(2, "0")}
            </p>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 flex flex-col justify-between shadow-ambient">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-on-tertiary-fixed-variant" />
            </div>
            <span className="inline-flex items-center px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant text-[12px] font-bold rounded-full uppercase tracking-wider">
              +12 tuần này
            </span>
          </div>
          <div className="mt-6">
            <p className="font-inter text-[12px] font-semibold tracking-widest uppercase text-on-surface-variant/70">
              Đã Hoàn Thành
            </p>
            <p className="font-manrope text-[40px] font-bold text-on-surface leading-tight">
              {String(completedCount).padStart(2, "0")}
            </p>
          </div>
        </div>

        {/* Points */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 flex flex-col justify-between shadow-ambient">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-[#fff3cd] flex items-center justify-center">
              <Award className="w-5 h-5 text-[#b45309]" />
            </div>
            <span className="inline-flex items-center px-3 py-1 bg-secondary-container text-on-secondary-container text-[12px] font-bold rounded-full uppercase tracking-wider">
              Optimal
            </span>
          </div>
          <div className="mt-6">
            <p className="font-inter text-[12px] font-semibold tracking-widest uppercase text-on-surface-variant/70">
              Điểm Tích Lũy
            </p>
            <p className="font-manrope text-[40px] font-bold text-on-surface leading-tight">
              {totalPoints.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Announcements + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10">

        {/* LEFT: Featured Announcement */}
        <div>
          <h2 className="font-manrope text-headline-md font-bold text-on-surface mb-6">
            Tin tức &amp; Thông báo
          </h2>

          {/* Featured Spotlight Card */}
          <div className="bg-surface-container-lowest rounded-[24px] p-10 flex flex-col justify-center min-h-[400px] shadow-ambient relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none" />
            <div className="relative z-10 space-y-8">
              <div>
                <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary text-[12px] font-bold rounded-full uppercase tracking-wider mb-4">
                  Thông báo mới
                </span>
                <h3 className="font-manrope text-[40px] lg:text-[48px] font-extrabold text-on-surface leading-[1.1] max-w-xl">
                  Hệ thống AI Scan đã sẵn sàng.
                </h3>
              </div>
              <p className="font-inter text-body-lg text-on-surface-variant leading-relaxed max-w-lg">
                Sử dụng AI để duyệt nhanh các bài nộp check-in với độ chính xác cao, giúp tối ưu hóa thời gian phản hồi.
              </p>
              <button className="gradient-primary hover:opacity-90 text-on-primary px-8 py-4 rounded-xl font-inter font-bold transition-all duration-150 w-fit">
                Xem chi tiết
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Activity Feed */}
        <div>
          <h2 className="font-manrope text-headline-md font-bold text-on-surface mb-6">
            Check-in gần đây
          </h2>

          <div className="space-y-4">
            {activityFeed.length > 0 ? (
              activityFeed.map((feed) => {
                const isAutoApproved = Math.random() > 0.5;
                return (
                  <div className="bg-surface-container-lowest rounded-2xl p-5 flex items-center gap-4 shadow-ambient hover:-translate-y-0.5 transition-all cursor-pointer" key={feed.id}>
                    <div className="relative shrink-0">
                      <UserAvatar name={feed.userName} size="sm" className="w-12 h-12" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-inter text-[15px] font-bold text-on-surface truncate">
                        {feed.postTitle}
                      </p>
                      <p className="text-[13px] text-on-surface-variant">
                        {timeAgo(feed.submittedAt)}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 text-[10px] font-extrabold rounded-full uppercase tracking-widest whitespace-nowrap ${
                      isAutoApproved
                        ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                        : "bg-secondary-container text-on-secondary-container"
                    }`}>
                      {isAutoApproved ? "Duyệt tự động" : "Đang chờ"}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="bg-surface-container-lowest rounded-2xl p-10 text-center shadow-ambient">
                <div className="w-12 h-12 mx-auto rounded-full bg-surface-container flex items-center justify-center mb-4">
                  <Info className="w-6 h-6 text-outline" />
                </div>
                <p className="text-body-sm text-outline">
                  Chưa có hoạt động check-in nào diễn ra hôm nay.
                </p>
              </div>
            )}

            <Link
              href="/tasks"
              className="w-full mt-4 py-3.5 hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface rounded-xl text-xs font-bold transition-all duration-150 text-center flex items-center justify-center gap-1 bg-surface-bright shadow-ambient"
            >
              <span>Xem danh sách bài viết</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
