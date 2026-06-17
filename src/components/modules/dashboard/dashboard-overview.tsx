"use client";

import React from "react";
import Link from "next/link";
import { 
  Bell, 
  Megaphone, 
  Sparkles, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  Award,
  Users,
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-slate-900">
      
      {/* Welcome Header */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1.5">
          Chào mừng quay lại, {userName}!
        </h2>
        <p className="text-sm text-slate-600 font-medium">
          {pendingCount > 0 
            ? `Bạn có ${pendingCount} bài viết cần check-in trong tuần này. Hãy bắt đầu ngay!` 
            : "Tuyệt vời! Bạn đã hoàn thành xuất sắc tất cả check-in tuần này."}
        </p>
      </div>

      {/* Bento Grid Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Stats and Announcements */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Stat Card 1 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:scale-[1.01] transition-all duration-200">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Bài Chưa Check-in</p>
              <p className="text-3xl font-extrabold text-indigo-600">{String(pendingCount).padStart(2, "0")}</p>
            </div>

            {/* Stat Card 2 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:scale-[1.01] transition-all duration-200">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Đã Hoàn Thành</p>
              <p className="text-3xl font-extrabold text-emerald-600">{String(completedCount).padStart(2, "0")}</p>
            </div>

            {/* Stat Card 3 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:scale-[1.01] transition-all duration-200">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4">
                <Award className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Điểm Tích Lũy</p>
              <p className="text-3xl font-extrabold text-amber-600">{totalPoints}</p>
            </div>
          </div>

          {/* Announcements Section (Large Bento Item) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                <Megaphone className="w-5 h-5 text-indigo-650" />
                Thông báo mới nhất
              </h3>
              <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition">Xem tất cả</button>
            </div>

            <div className="space-y-4">
              {/* Announcement Item 1 */}
              <div className="flex gap-4 items-start p-4 bg-slate-50 hover:bg-slate-100/50 border border-slate-200/60 rounded-2xl transition duration-150">
                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-650 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-grow space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                    Đánh giá hiệu suất quý này bắt đầu vào tuần tới
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Hãy đảm bảo tất cả các bài viết like, share trên trang cá nhân của bạn đã được check-in đầy đủ trước thứ Sáu để ghi nhận dữ liệu hiệu quả chiến dịch.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-[10px] font-bold">
                      Quan trọng
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium font-mono">15 tháng 6, 2026</span>
                  </div>
                </div>
              </div>

              {/* Announcement Item 2 */}
              <div className="flex gap-4 items-start p-4 bg-slate-50 hover:bg-slate-100/50 border border-slate-200/60 rounded-2xl transition duration-150">
                <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-650 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div className="flex-grow space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                    Ra mắt chương trình chăm sóc sức khỏe nhân viên mới
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Chúng tôi rất vui mừng thông báo về sự hợp tác của công ty với Headspace để mang lại quyền lợi thiền định và giảm áp lực công việc cho nhân viên. Thư mời kích hoạt tài khoản miễn phí đã được gửi qua email.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold">
                      Phúc lợi
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium font-mono">10 tháng 6, 2026</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Activity Feed */}
        <div className="lg:col-span-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-500" />
                  Check-in gần đây
                </h3>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  Hoạt động
                </span>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {activityFeed.length > 0 ? (
                  activityFeed.map((feed) => (
                    <div className="flex gap-3 items-start hover:bg-slate-50 p-2 rounded-xl transition duration-150" key={feed.id}>
                      <div className="relative shrink-0">
                        <UserAvatar name={feed.userName} size="sm" className="w-9 h-9 text-xs" />
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                          <span className="material-symbols-outlined text-[9px] font-bold">check</span>
                        </div>
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-xs sm:text-sm text-slate-700 leading-snug">
                          <strong className="text-slate-900 font-bold">{feed.userName}</strong> đã check-in bài viết <span className="text-indigo-600 font-semibold">{feed.postTitle}</span>.
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium mt-1 font-mono">{timeAgo(feed.submittedAt)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 italic text-xs">
                    Chưa có hoạt động check-in nào diễn ra hôm nay.
                  </div>
                )}
              </div>
            </div>

            <Link 
              href="/tasks" 
              className="w-full mt-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-650 hover:text-slate-900 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1 shadow-sm"
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
