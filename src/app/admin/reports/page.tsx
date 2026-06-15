"use client";

import { Card } from "@/components/ui/card";
import { BarChart3, Lock } from "lucide-react";
import { useLayout } from "@/components/shared/layout-context";

export default function AdminReportsPage() {
  const { role } = useLayout();

  if (role !== "ADMIN") {
    return (
      <div className="space-y-6">
        <header className="pb-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400 font-medium">Báo cáo</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Báo Cáo Chi Tiết</h1>
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

  return (
    <div className="space-y-6">
      <header className="pb-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400 font-medium font-semibold text-indigo-400">Admin Console</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Báo Cáo Chi Tiết</h1>
      </header>

      <Card className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-dashed border-2 border-slate-800">
        <div className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 mb-4 shadow-lg">
          <BarChart3 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Hệ thống báo cáo tổng quan</h2>
        <p className="text-sm text-slate-400 max-w-sm">
          Biểu đồ hiệu suất, tỷ lệ hoàn thành chia sẻ và tương tác của nhân viên sẽ được tải tự động từ máy chủ.
        </p>
      </Card>
    </div>
  );
}
