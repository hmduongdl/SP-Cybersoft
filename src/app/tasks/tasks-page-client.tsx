"use client";

import React, { useState, useCallback } from "react";
import { PostListView } from "@/components/modules/tasks/post-list-view";
import { PostCalendarView } from "@/components/modules/tasks/post-calendar-view";
import { SubmitCheckinModal } from "@/components/SubmitCheckinModal";
import { Toaster } from "sonner";
import { useHopeStar } from "@/app/actions/hope-star-actions";
import { cn } from "@/lib/utils";
import { List, Calendar } from "lucide-react";

type ViewMode = "list" | "calendar";

export default function TasksPageClient({
  posts,
  allPosts = [],
  userHopeStars = 0,
  userUsedStarsThisMonth = 0,
  currentPage = 1,
  totalPages = 1
}: {
  posts: any[],
  allPosts?: any[],
  userHopeStars?: number,
  userUsedStarsThisMonth?: number,
  currentPage?: number,
  totalPages?: number
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [localPosts, setLocalPosts] = useState(posts);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

  const handleCheckIn = (post: any) => {
    setSelectedPost(post);
  };

  const handleModalClose = () => {
    setSelectedPost(null);
  };

  const handleModalSuccess = () => {
    if (selectedPost) {
      setLocalPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, status: "COMPLETED", checkinStatus: "PENDING" } : p));
    }
  };

  const handleUseHopeStar = useCallback(async (postId: string) => {
    const result = await useHopeStar(postId);
    if (result.success) {
      setLocalPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, status: "COMPLETED", checkinStatus: "APPROVED" }
            : p
        )
      );
    }
    return result;
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="top-right" richColors duration={1500} />
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-500 font-bold mb-2">Bảng tin</p>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tight font-manrope">Danh Sách Bài Share</h1>
          <p className="mt-2 text-on-surface-variant text-lg">Quản lý và cập nhật tiến độ công việc mạng xã hội.</p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center bg-surface-container p-1 rounded-lg-xl border-none/80 shadow-ambient">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg-lg transition-all flex items-center gap-1.5",
              viewMode === "list" ? "bg-surface-container-lowest text-indigo-600 shadow-ambient" : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <List className="w-3.5 h-3.5" />
            Danh sách
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg-lg transition-all flex items-center gap-1.5",
              viewMode === "calendar" ? "bg-surface-container-lowest text-indigo-600 shadow-ambient" : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            Lịch
          </button>
        </div>
      </header>

      {viewMode === "list" ? (
        <PostListView
          posts={localPosts}
          onCheckIn={handleCheckIn}
          onUseHopeStar={handleUseHopeStar}
          userHopeStars={userHopeStars}
          userUsedStarsThisMonth={userUsedStarsThisMonth}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      ) : (
        <PostCalendarView
          posts={allPosts}
          onCheckIn={handleCheckIn}
        />
      )}

      {selectedPost && (
        <SubmitCheckinModal
          post={selectedPost}
          isOpen={!!selectedPost}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
