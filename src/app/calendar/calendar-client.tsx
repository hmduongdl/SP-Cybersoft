"use client";

import React, { useState } from "react";
import { PostCalendarView } from "@/components/modules/tasks/post-calendar-view";
import { SubmitCheckinModal } from "@/components/SubmitCheckinModal";
import { Toaster } from "sonner";

export default function CalendarClient({ 
  posts: initialPosts, 
  completedAvatarsByDate 
}: { 
  posts: any[]; 
  completedAvatarsByDate: any; 
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="top-right" richColors />
      <header className="pb-2">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-500 font-bold mb-2">Lịch làm việc</p>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Lịch Công Việc</h1>
        <p className="mt-2 text-slate-500 text-lg">Quản lý và theo dõi bài share theo ngày trực quan.</p>
      </header>

      <PostCalendarView 
        posts={posts} 
        completedAvatarsByDate={completedAvatarsByDate} 
        onCheckIn={handleCheckIn} 
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

