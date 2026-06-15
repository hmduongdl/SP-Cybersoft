"use client";

import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { useLayout } from "@/components/shared/layout-context";
import { PostTaskAdmin } from "@/components/modules/tasks/post-task-admin";

export default function AdminPostsPage() {
  const { role } = useLayout();

  if (role !== "ADMIN") {
    return (
      <div className="space-y-6">
        <header className="pb-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400 font-medium">Cấu hình</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Quản Lý Bài Viết</h1>
        </header>

        <Card className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-dashed border-2 border-red-500/20 bg-red-500/5">
          <div className="h-16 w-16 rounded-full bg-slate-900 border border-red-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-lg">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Quyền truy cập bị từ chối</h2>
          <p className="text-sm text-slate-400 max-w-sm">
            Trang này chỉ dành cho tài khoản có vai trò Quản trị viên (Admin). Vui lòng chuyển Chế độ giả lập ở góc dưới bên trái của Sidebar thành "Admin" để xem nội dung.
          </p>
        </Card>
      </div>
    );
  }

  return <PostTaskAdmin />;
}
