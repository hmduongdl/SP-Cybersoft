"use client";

import React from "react";
import Link from "next/link";

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
    <div className="space-y-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Welcome Header */}
      <div className="mb-2xl">
        <h2 className="font-headline-lg text-headline-lg text-on-background mb-sm">Chào mừng quay lại, {userName}!</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {pendingCount > 0 
            ? `Bạn có ${pendingCount} bài viết cần check-in trong tuần này. Hãy bắt đầu ngay!` 
            : "Tuyệt vời! Bạn đã hoàn thành xuất sắc tất cả check-in tuần này."}
        </p>
      </div>

      {/* Bento Grid Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Left Column: Stats and Announcements */}
        <div className="lg:col-span-8 space-y-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-lg">
            {/* Stat Card 1 */}
            <div className="bg-white p-lg rounded-2xl card-shadow border border-outline-variant/10 group hover:scale-[1.02] transition-all duration-300">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-md">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
              </div>
              <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-xs">Bài Chưa Check-in</p>
              <p className="font-headline-lg text-headline-lg text-primary">{String(pendingCount).padStart(2, "0")}</p>
            </div>

            {/* Stat Card 2 */}
            <div className="bg-white p-lg rounded-2xl card-shadow border border-outline-variant/10 group hover:scale-[1.02] transition-all duration-300">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-md">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-xs">Đã Hoàn Thành</p>
              <p className="font-headline-lg text-headline-lg text-secondary">{String(completedCount).padStart(2, "0")}</p>
            </div>

            {/* Stat Card 3 */}
            <div className="bg-white p-lg rounded-2xl card-shadow border border-outline-variant/10 group hover:scale-[1.02] transition-all duration-300">
              <div className="w-12 h-12 bg-tertiary-container/20 rounded-xl flex items-center justify-center text-tertiary mb-md">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
              </div>
              <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-xs font-medium">Tổng Điểm Tích Lũy</p>
              <p className="font-headline-lg text-headline-lg text-tertiary">{totalPoints}</p>
            </div>
          </div>

          {/* Announcements Section (Large Bento Item) */}
          <div className="bg-white p-lg rounded-2xl card-shadow border border-outline-variant/10">
            <div className="flex justify-between items-center mb-xl">
              <h3 className="font-title-lg text-title-lg flex items-center gap-2 text-on-background">
                <span className="material-symbols-outlined text-primary">campaign</span>
                Thông báo mới nhất
              </h3>
              <button className="text-primary font-label-md hover:underline">Xem tất cả</button>
            </div>

            <div className="space-y-md">
              <div className="flex gap-lg items-start p-md bg-surface-container-low rounded-xl border-l-4 border-primary">
                <div className="flex-grow">
                  <h4 className="font-title-md text-title-md mb-xs text-on-background">Đánh giá hiệu suất quý này bắt đầu vào tuần tới</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">
                    Hãy đảm bảo tất cả các bài viết like, share trên trang cá nhân của bạn đã được check-in đầy đủ trước thứ Sáu để ghi nhận dữ liệu hiệu quả chiến dịch.
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-label-sm text-label-sm font-semibold">Quan trọng</span>
                    <span className="font-label-sm text-label-sm text-outline">15 tháng 6, 2026</span>
                  </div>
                </div>
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 hidden sm:block">
                  <img 
                    className="w-full h-full object-cover" 
                    alt="Corporate performance discussions" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDOxl723qS7SjAW45aMbqObwvHSjtxEuMN9pk-SpxXQL5G2HOMhFl0yl7APNI5WTEnVi6Yo53NAb6S73JHqIBvo6YW7DPcqp_3ysKxA-WghT8vBuHjtgeEK-BZEOTMMtmGNnM85gtCpzz4HUn9BRAUbyll1oDjBIctZmMXVuWX8PogjjzIIVsWPxhu6dbsp_5JP1sRuLrguS6cXw-k0eAWRApJNJTA4RmKTXWh1vvudRWOyqC2eTw6h3eu80YNL4nClMGdkyPRIvck"
                  />
                </div>
              </div>

              <div className="flex gap-lg items-start p-md hover:bg-surface-container-low rounded-xl transition-colors">
                <div className="flex-grow">
                  <h4 className="font-title-md text-title-md mb-xs text-on-background">Ra mắt chương trình chăm sóc sức khỏe nhân viên mới</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">
                    Chúng tôi rất vui mừng thông báo về sự hợp tác của công ty với Headspace để mang lại quyền lợi thiền định và giảm áp lực công việc cho nhân viên. Thư mời kích hoạt tài khoản miễn phí đã được gửi qua email.
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-secondary-container/20 text-secondary rounded-full font-label-sm text-label-sm font-semibold">Phúc lợi</span>
                    <span className="font-label-sm text-label-sm text-outline">10 tháng 6, 2026</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Activity Feed */}
        <div className="lg:col-span-4">
          <div className="bg-white p-lg rounded-2xl card-shadow border border-outline-variant/10 h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-xl">
                <h3 className="font-title-lg text-title-lg text-on-background">Hoạt động check-in</h3>
                <span className="material-symbols-outlined text-outline">sync</span>
              </div>

              <div className="space-y-lg">
                {activityFeed.length > 0 ? (
                  activityFeed.map((feed) => (
                    <div className="flex gap-md" key={feed.id}>
                      <div className="relative flex-shrink-0">
                        {feed.userImage ? (
                          <img 
                            alt={feed.userName} 
                            className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" 
                            src={feed.userImage}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                            {feed.userName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 bg-secondary text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                          <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                        </div>
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                          <strong className="text-on-background font-semibold">{feed.userName}</strong> đã hoàn thành check-in bài viết <span className="text-primary font-medium">{feed.postTitle}</span>.
                        </p>
                        <p className="font-label-sm text-label-sm text-outline mt-xs">{timeAgo(feed.submittedAt)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-on-surface-variant font-body-sm">
                    Chưa có hoạt động check-in nào diễn ra hôm nay.
                  </div>
                )}
              </div>
            </div>

            <Link href="/posts" className="w-full mt-xl py-3 border border-outline-variant/30 rounded-xl font-label-md text-on-surface-variant hover:bg-surface-container transition-colors text-center inline-block">
              Xem danh sách bài viết
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
