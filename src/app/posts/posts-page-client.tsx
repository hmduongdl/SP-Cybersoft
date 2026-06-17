"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PostListView } from "@/components/modules/tasks/post-list-view";
import { PostCalendarView } from "@/components/modules/tasks/post-calendar-view";
import { SubmitCheckinModal } from "@/components/SubmitCheckinModal";
import { LayoutList, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { useHopeStar } from "@/app/actions/hope-star-actions";

const STORAGE_KEY = "posts-view-preference";

function getInitialView(defaultView: "LIST" | "CALENDAR"): "LIST" | "CALENDAR" {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "LIST" || stored === "CALENDAR") return stored;
  }
  return defaultView;
}

export default function PostsPageClient({
  posts: initialPosts,
  completedAvatarsByDate,
  userHopeStars = 0,
  userUsedStarsThisMonth = 0,
  currentPage = 1,
  totalPages = 1,
  defaultView = "LIST",
}: {
  posts: any[],
  completedAvatarsByDate: any,
  userHopeStars?: number,
  userUsedStarsThisMonth?: number,
  currentPage?: number,
  totalPages?: number,
  defaultView?: "LIST" | "CALENDAR",
}) {
  const [view, setView] = useState<"LIST" | "CALENDAR">(() => getInitialView(defaultView));
  const [posts, setPosts] = useState(initialPosts);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sync view to URL and localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, view);
    const params = new URLSearchParams(searchParams.toString());
    const viewParam = view === "CALENDAR" ? "calendar" : "list";
    if (params.get("view") !== viewParam) {
      params.set("view", viewParam);
      router.replace(`/posts?${params.toString()}`, { scroll: false });
    }
  }, [view, router, searchParams]);

  const handleCheckIn = (post: any) => {
    setSelectedPost(post);
  };

  const handleModalClose = () => {
    setSelectedPost(null);
  };

  const handleModalSuccess = () => {
    if (selectedPost) {
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, status: "COMPLETED", checkinStatus: "PENDING" } : p));
    }
  };

  const handleUseHopeStar = useCallback(async (postId: string) => {
    const result = await useHopeStar(postId);
    if (result.success) {
      setPosts(prev =>
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
      <Toaster position="top-right" richColors />
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-500 font-bold mb-2">Bảng tin</p>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Bài Share</h1>
          <p className="mt-2 text-slate-500 text-lg">Quản lý và cập nhật tiến độ bài đăng mạng xã hội.</p>
        </div>

        {/* View Toggle */}
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl backdrop-blur-md border border-slate-200 shadow-sm">
          <button
            onClick={() => setView("LIST")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
              view === "LIST"
                ? "bg-white text-indigo-600 shadow-md scale-100"
                : "text-slate-600 hover:text-slate-900 hover:scale-105"
            )}
          >
            <LayoutList className="w-4 h-4" /> Danh Sách
          </button>
          <button
            onClick={() => setView("CALENDAR")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
              view === "CALENDAR"
                ? "bg-white text-indigo-600 shadow-md scale-100"
                : "text-slate-600 hover:text-slate-900 hover:scale-105"
            )}
          >
            <CalendarIcon className="w-4 h-4" /> Lịch
          </button>
        </div>
      </header>

      {view === "LIST" ? (
        <PostListView
          posts={posts}
          onCheckIn={handleCheckIn}
          onUseHopeStar={handleUseHopeStar}
          userHopeStars={userHopeStars}
          userUsedStarsThisMonth={userUsedStarsThisMonth}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      ) : (
        <PostCalendarView posts={posts} completedAvatarsByDate={completedAvatarsByDate} onCheckIn={handleCheckIn} />
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
