"use client";

import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { useLayout } from "@/components/shared/layout-context";
import { PostTaskAdmin } from "@/components/modules/tasks/post-task-admin";

export default function AdminPostsPage() {
  const { role } = useLayout();

  if (role !== "ADMIN") {
    return (
      <div className="space-y-6 text-slate-900 animate-in fade-in duration-300">
        <header className="pb-6 border-b border-slate-200">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500 font-semibold">Cấu hình</p>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900">Quản Lý Bài Viết</h1>
        </header>

        <Card className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-dashed border-2 border-red-200 bg-red-50/50">
          <div className="h-16 w-16 rounded-full bg-white border border-red-200 flex items-center justify-center text-red-500 mb-4 shadow-sm">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Quyền truy cập bị từ chối</h2>
          <p className="text-sm text-slate-600 max-w-sm">
            Trang này chỉ dành cho tài khoản có vai trò Quản trị viên (Admin). Vui lòng chuyển Chế độ giả lập ở góc dưới bên trái của Sidebar thành "Admin" để xem nội dung.
          </p>
        </Card>
      </div>
    );
  }

  return <PostTaskAdmin />;
}
