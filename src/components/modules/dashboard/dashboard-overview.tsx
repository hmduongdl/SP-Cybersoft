"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  CheckCircle,
  Clock,
  ChevronRight,
  Info,
  Sparkles,
  ArrowRight,
  FileText,
  ShieldCheck,
  ChevronDown,
  LayoutDashboard,
  TrendingUp,
} from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import { fetchMonthlyStats } from "@/app/dashboard/actions";

interface ActivityFeedItem {
  id: string;
  userName: string;
  userImage: string | null;
  postTitle: string;
  submittedAt: string;
  status: string;
}

interface DashboardPost {
  id: string;
  title: string;
  thumbnail_url: string | null;
  start_at: string;
  url: string;
}

interface DashboardOverviewProps {
  userName: string;
  pendingCount: number;
  completedCount: number;
  totalPostsCount: number;
  trustScore: number;
  activityFeed: ActivityFeedItem[];
  dashboardPosts: DashboardPost[];
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
  } catch {
    return "Mới đây";
  }
}

function countdownLabel(startAt: string) {
  const now = Date.now();
  const start = new Date(startAt).getTime();
  const THIRTY_HOURS = 30 * 60 * 60 * 1000;
  const deadline = start + THIRTY_HOURS;
  const remaining = deadline - now;
  if (remaining <= 0) return "Đã hết hạn";
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `Còn ${hours}h ${minutes}p`;
  return `Còn ${minutes} phút`;
}

function statusBadge(status: string) {
  if (status === "AUTO_APPROVED") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase tracking-widest whitespace-nowrap bg-tertiary-fixed text-on-tertiary-fixed-variant">
        Duyệt tự động
      </span>
    );
  }
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase tracking-widest whitespace-nowrap bg-emerald-100 text-emerald-700">
        Đã duyệt
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase tracking-widest whitespace-nowrap bg-red-100 text-red-600">
        Từ chối
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase tracking-widest whitespace-nowrap bg-amber-100 text-amber-700">
      Đang chờ
    </span>
  );
}

const DONUT_R = 80;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_R;

// Generate list of available months (from 6 months ago to current month)
function generateMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("vi-VN", { month: "long", year: "numeric" });
    options.push({ value, label });
  }

  return options;
}

export function DashboardOverview({
  userName,
  pendingCount: initialPendingCount,
  completedCount: initialCompletedCount,
  totalPostsCount: initialTotalPostsCount,
  trustScore,
  activityFeed,
  dashboardPosts,
}: DashboardOverviewProps) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthOptions = generateMonthOptions();

  // State for month selection
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [stats, setStats] = useState({
    pending: initialPendingCount,
    completed: initialCompletedCount,
    total: initialTotalPostsCount,
  });
  const [monthlyDashboardPosts, setMonthlyDashboardPosts] = useState(dashboardPosts);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  // Fetch stats when month changes
  useEffect(() => {
    const loadStats = async () => {
      setIsLoadingStats(true);
      try {
        const result = await fetchMonthlyStats(selectedMonth);
        setStats({
          pending: result.pendingThisMonth,
          completed: result.completedThisMonth,
          total: result.totalPostsThisMonth,
        });
        setMonthlyDashboardPosts(result.dashboardPosts);
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadStats();
  }, [selectedMonth]);

  const pendingCount = stats.pending;
  const completedCount = stats.completed;
  const totalPostsCount = stats.total;
  const progress = Math.min(Math.max(totalPostsCount > 0 ? Math.round((completedCount / totalPostsCount) * 100) : 0, 0), 100);
  const dashOffset = DONUT_CIRCUMFERENCE * (1 - progress / 100);

  const trustColor =
    trustScore >= 70 ? "emerald" :
      trustScore >= 40 ? "amber" :
        "rose";

  const remainingPosts = Math.max(0, totalPostsCount - completedCount);

  const selectedMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || "Tháng này";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* Welcome Header with Month Selector */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="flex-1">
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
              ? `Bạn có ${pendingCount} bài viết cần check-in trong ${selectedMonthLabel.toLowerCase()}.`
              : `Tuyệt vời! Bạn đã hoàn thành xuất sắc tất cả check-in ${selectedMonthLabel.toLowerCase()}.`}
          </p>
        </div>

        {/* Month Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMonthDropdown(!showMonthDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-lowest rounded-xl border border-outline/20 hover:border-outline/40 transition-colors shadow-ambient"
            disabled={isLoadingStats}
          >
            <span className="text-sm font-semibold text-on-surface">{selectedMonthLabel}</span>
            <ChevronDown className={cn(
              "w-4 h-4 text-on-surface-variant transition-transform",
              showMonthDropdown && "rotate-180"
            )} />
          </button>

          {/* Dropdown Menu */}
          {showMonthDropdown && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-surface-container-lowest rounded-xl shadow-lg border border-outline/20 z-50 p-2">
              {monthOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedMonth(option.value);
                    setShowMonthDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    selectedMonth === option.value
                      ? "bg-primary text-on-primary"
                      : "text-on-surface hover:bg-surface-container"
                  )}
                  disabled={isLoadingStats}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Bài chưa check-in */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-6 flex flex-col justify-between shadow-ambient dark:shadow-none border border-transparent dark:border-slate-800">
          <div className="flex justify-between items-start">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              pendingCount > 0 ? "bg-red-50" : "bg-emerald-50"
            )}>
              {pendingCount > 0 ? (
                <Clock className="w-5 h-5 text-red-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <span className="inline-flex items-center px-3 py-1 text-[12px] font-bold rounded-full uppercase tracking-wider bg-primary-container text-primary">
              {completedCount}/{totalPostsCount}
            </span>
          </div>
          <div className="mt-6">
            <p className="font-inter text-[12px] font-semibold tracking-widest uppercase text-on-surface-variant/70">
              Bài Chưa Check-in
            </p>
            <p className={cn(
              "font-manrope text-[40px] font-bold leading-tight",
              pendingCount > 0 ? "text-red-600" : "text-emerald-600"
            )}>
              {pendingCount}
            </p>
            {pendingCount === 0 && (
              <p className="text-[11px] text-emerald-600/80 font-medium mt-1 font-inter">
                Bạn không còn bài nào cần check
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Đã hoàn thành */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-6 flex flex-col justify-between shadow-ambient dark:shadow-none border border-transparent dark:border-slate-800">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-600 text-[12px] font-bold rounded-full uppercase tracking-wider">
              {selectedMonthLabel}
            </span>
          </div>
          <div className="mt-6">
            <p className="font-inter text-[12px] font-semibold tracking-widest uppercase text-on-surface-variant/70">
              Đã Hoàn Thành
            </p>
            <p className="font-manrope text-[40px] font-bold text-emerald-600 leading-tight">
              {completedCount}
            </p>
          </div>
        </div>

        {/* Card 3: Độ tin cậy */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-6 flex flex-col justify-between shadow-ambient dark:shadow-none border border-transparent dark:border-slate-800">
          <div className="flex justify-between items-start">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              trustColor === "emerald" ? "bg-emerald-50" : trustColor === "amber" ? "bg-amber-50" : "bg-rose-50"
            )}>
              <ShieldCheck className={cn(
                "w-5 h-5",
                trustColor === "emerald" ? "text-emerald-600" : trustColor === "amber" ? "text-amber-600" : "text-rose-600"
              )} />
            </div>
            <span className={cn(
              "inline-flex items-center px-3 py-1 text-[12px] font-bold rounded-full uppercase tracking-wider",
              trustColor === "emerald" ? "bg-emerald-50 text-emerald-600" : trustColor === "amber" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
            )}>
              {trustScore >= 70 ? "Cao" : trustScore >= 40 ? "Vừa" : "Thấp"}
            </span>
          </div>
          <div className="mt-6">
            <p className="font-inter text-[12px] font-semibold tracking-widest uppercase text-on-surface-variant/70">
              Độ Tin Cậy
            </p>
            <p className={cn(
              "font-manrope text-[40px] font-bold leading-tight",
              trustColor === "emerald" ? "text-emerald-600" : trustColor === "amber" ? "text-amber-600" : "text-rose-600"
            )}>
              {trustScore}
            </p>
            <div className="mt-3 space-y-1.5">
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    trustColor === "emerald" ? "bg-emerald-500" : trustColor === "amber" ? "bg-amber-500" : "bg-rose-500"
                  )}
                  style={{ width: `${trustScore}%` }}
                />
              </div>
              <p className="text-[11px] text-on-surface-variant/60 font-inter">
                {trustScore} / 100 điểm — dựa trên lịch sử duyệt bài
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">

        {/* LEFT COLUMN: col-span-8 */}
        <div className="lg:col-span-8 space-y-6">

          {/* Nhiệm vụ trọng tâm hôm nay */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-manrope text-headline-md font-bold text-on-surface">
                {selectedMonth === currentMonthKey ? "Nhiệm vụ trọng tâm hôm nay" : `Bài viết trong ${selectedMonthLabel.toLowerCase()}`}
              </h2>
              <Link
                href="/like-share"
                className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {monthlyDashboardPosts.length > 0 ? (
              <div className="space-y-3">
                {monthlyDashboardPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/like-share?postId=${post.id}`}
                    className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-4 flex items-center gap-4 shadow-ambient dark:shadow-none border border-transparent dark:border-slate-800 hover:-translate-y-0.5 transition-all cursor-pointer group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                      {post.thumbnail_url ? (
                        <img
                          src={post.thumbnail_url}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-6 h-6 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-inter text-[15px] font-bold text-on-surface dark:text-slate-100 truncate group-hover:text-primary transition-colors">
                        {post.title}
                      </p>
                      <p className="text-[13px] text-on-surface-variant mt-0.5">
                        {post.url ? new URL(post.url).hostname.replace("www.", "") : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-[11px] font-bold rounded-full">
                        <Clock className="w-3 h-3" />
                        {countdownLabel(post.start_at)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-lowest rounded-2xl p-8 text-center shadow-ambient">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-sm text-on-surface-variant">
                  Không có nhiệm vụ nào đang chờ. Bạn đã hoàn thành hết rồi!
                </p>
              </div>
            )}
          </div>

          {/* Check-in gần đây */}
          <div>
            <h2 className="font-manrope text-headline-md font-bold text-on-surface mb-4">
              Check-in gần đây
            </h2>

            <div className="space-y-3">
              {activityFeed.length > 0 ? (
                activityFeed.map((feed) => (
                  <div
                    className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-4 flex items-center gap-4 shadow-ambient dark:shadow-none border border-transparent dark:border-slate-800 hover:-translate-y-0.5 transition-all"
                    key={feed.id}
                  >
                    <UserAvatar
                      name={feed.userName}
                      src={feed.userImage}
                      size="md"
                      className="w-10 h-10"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-inter text-[14px] font-semibold text-on-surface dark:text-slate-100 truncate">
                        {feed.postTitle}
                      </p>
                      <p className="text-[12px] text-on-surface-variant">
                        {timeAgo(feed.submittedAt)}
                      </p>
                    </div>
                    {statusBadge(feed.status)}
                  </div>
                ))
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
                href="/like-share"
                className="w-full mt-2 py-3.5 hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface rounded-xl text-xs font-bold transition-all duration-150 text-center flex items-center justify-center gap-1 bg-surface-bright shadow-ambient"
              >
                <span>Xem danh sách bài viết</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: col-span-4 */}
        <div className="lg:col-span-4 space-y-6">

          {/* Tiến độ hoàn thành tháng */}
          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-6 shadow-ambient dark:shadow-none border border-transparent dark:border-slate-800">
            <h2 className="font-manrope text-headline-md font-bold text-on-surface dark:text-slate-100 mb-6">
              Tiến độ hoàn thành {selectedMonthLabel.toLowerCase()}
            </h2>

            <div className="flex flex-col items-center">
              {/* SVG Donut Chart */}
              <div className="relative w-48 h-48">
                <svg
                  className="w-full h-full -rotate-90"
                  viewBox="0 0 200 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Background track */}
                  <circle
                    cx="100"
                    cy="100"
                    r={DONUT_R}
                    stroke="#f1f5f9"
                    strokeWidth="16"
                    fill="none"
                  />
                  {/* Progress arc */}
                  <circle
                    cx="100"
                    cy="100"
                    r={DONUT_R}
                    stroke="url(#progressGradient)"
                    strokeWidth="16"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={DONUT_CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Center percentage text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-manrope text-[36px] font-extrabold text-slate-900 dark:text-slate-100 leading-none">
                    {progress}%
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-inter mt-1">
                    Hoàn thành
                  </span>
                </div>
              </div>

              <p className="text-center text-sm text-on-surface-variant mt-4 font-inter">
                {remainingPosts > 0
                  ? `Chỉ còn ${remainingPosts} bài viết nữa là đạt 100% chỉ tiêu ${selectedMonthLabel.toLowerCase()}`
                  : `Bạn đã đạt 100% chỉ tiêu ${selectedMonthLabel.toLowerCase()}!`}
              </p>

              <div className="w-full mt-4 pt-4 border-t border-slate-100 flex justify-between text-sm">
                <span className="text-on-surface-variant font-inter">
                  Đã hoàn thành: <span className="font-bold text-on-surface">{completedCount}</span>
                </span>
              </div>
            </div>
          </div>

          {/* AI Scan Assistant */}
          <div className="bg-[#FAFAFA] dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-ambient dark:shadow-none">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-manrope text-[16px] font-bold text-on-surface">
                  AI Scan Assistant
                </h3>
                <p className="text-[13px] text-on-surface-variant mt-1 leading-relaxed">
                  AI tự động kiểm tra ảnh check-in, xác minh nội dung và giúp tiết kiệm thời gian xét duyệt.
                </p>
                <Link
                  href="/admin/queue"
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-bold rounded-xl transition-colors"
                >
                  <span>Tìm hiểu ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Truy cập nhanh */}
          <div className="space-y-3">
            <h2 className="font-manrope text-headline-md font-bold text-on-surface">
              Truy cập nhanh
            </h2>

            {/* Task Manager Card */}
            <Link
              href="/tasks"
              className="block bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-5 shadow-ambient dark:shadow-none border border-transparent dark:border-slate-800 hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-inter text-[14px] font-bold text-on-surface dark:text-slate-100 group-hover:text-emerald-600 transition-colors">
                    Task Manager
                  </p>
                  <p className="text-[12px] text-on-surface-variant font-inter">
                    Quản lý công việc, nhiệm vụ và lọc theo thẻ
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" />
              </div>
            </Link>

            {/* SEO Tools Card */}
            <div className="block bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-5 shadow-ambient dark:shadow-none border border-transparent dark:border-slate-800 opacity-70">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-inter text-[14px] font-bold text-on-surface dark:text-slate-100">
                    SEO Tools
                  </p>
                  <p className="text-[12px] text-on-surface-variant font-inter">
                    Chức năng đang phát triển
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-1 rounded-full shrink-0">
                  Sớm ra mắt
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
