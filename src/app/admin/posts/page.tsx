"use client";

import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { useLayout } from "@/components/shared/layout-context";
import { PostTaskAdmin } from "@/components/modules/tasks/post-task-admin";
import { useSession } from "next-auth/react";

export default function AdminPostsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  if (role !== "ADMIN") {
    return (
      <div className="space-y-6 text-on-surface animate-in fade-in duration-300">
        <div>
          <nav className="flex gap-2 text-xs font-inter text-on-surface-variant/70 mb-2">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-primary font-semibold">Quản lý bài viết</span>
          </nav>
          <h1 className="font-manrope font-bold text-headline-lg text-on-surface">Quản lý bài viết</h1>
          <p className="mt-1 text-sm text-on-surface-variant font-inter">Lên lịch và quản lý các bài đăng công việc cho đội ngũ nhân sự.</p>
        </div>

        <Card className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-dashed border-2 border-red-200 bg-red-50/50">
          <div className="h-16 w-16 rounded-full bg-surface-container-lowest border border-red-200 flex items-center justify-center text-red-500 mb-4 shadow-ambient">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-on-surface mb-2 font-manrope">Quyền truy cập bị từ chối</h2>
          <p className="text-sm text-on-surface-variant max-w-sm">
            Trang này chỉ dành cho tài khoản có vai trò Quản trị viên (Admin). Vui lòng chuyển Chế độ giả lập ở góc dưới bên trái của Sidebar thành "Admin" để xem nội dung.
          </p>
        </Card>
      </div>
    );
  }

  return <PostTaskAdmin />;
}
