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

  React.useEffect(() => {
    setLocalPosts(posts);
  }, [posts]);

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
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-2">
        <div>
          <nav className="flex gap-2 text-xs font-inter text-on-surface-variant/70 mb-2">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-primary font-semibold">Nhiệm vụ Check-in</span>
          </nav>
          <h1 className="font-manrope font-bold text-headline-lg text-on-surface">Nhiệm vụ Check-in</h1>
          <p className="mt-1 text-sm text-on-surface-variant font-inter">Hoàn thành check-in bằng cách chia sẻ bài đăng trên Facebook cá nhân.</p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center bg-surface-container-low p-1 rounded-xl border-none">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-[10px] transition-all flex items-center gap-1.5 font-inter",
              viewMode === "list" ? "bg-surface-container-highest text-primary" : "bg-transparent text-on-surface-variant hover:text-on-surface"
            )}
          >
            <List className="w-3.5 h-3.5" />
            Danh sách
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-[10px] transition-all flex items-center gap-1.5 font-inter",
              viewMode === "calendar" ? "bg-surface-container-highest text-primary" : "bg-transparent text-on-surface-variant hover:text-on-surface"
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
