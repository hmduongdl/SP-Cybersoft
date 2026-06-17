"use client";

import React, { useState, useCallback } from "react";
import { PostListView } from "@/components/modules/tasks/post-list-view";
import { SubmitCheckinModal } from "@/components/SubmitCheckinModal";
import { Toaster } from "sonner";
import { useHopeStar } from "@/app/actions/hope-star-actions";

export default function TasksPageClient({
  posts: initialPosts,
  userHopeStars = 0,
  userUsedStarsThisMonth = 0,
  currentPage = 1,
  totalPages = 1
}: {
  posts: any[],
  userHopeStars?: number,
  userUsedStarsThisMonth?: number,
  currentPage?: number,
  totalPages?: number
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

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
      <Toaster position="top-right" richColors duration={1500} />
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-500 font-bold mb-2">Bảng tin</p>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Danh Sách Bài Share</h1>
          <p className="mt-2 text-slate-500 text-lg">Quản lý và cập nhật tiến độ công việc mạng xã hội.</p>
        </div>
      </header>

      <PostListView
        posts={posts}
        onCheckIn={handleCheckIn}
        onUseHopeStar={handleUseHopeStar}
        userHopeStars={userHopeStars}
        userUsedStarsThisMonth={userUsedStarsThisMonth}
        currentPage={currentPage}
        totalPages={totalPages}
      />

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
