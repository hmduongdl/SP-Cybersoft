import { Card } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <header className="pb-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400 font-medium">Lịch làm việc</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Lịch Công Việc</h1>
      </header>

      <Card className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-dashed border-2 border-slate-800">
        <div className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 mb-4 shadow-lg">
          <CalendarIcon className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Chưa có lịch đăng bài</h2>
        <p className="text-sm text-slate-400 max-w-sm">
          Các bài viết được lên lịch và phân bổ cho bạn sẽ xuất hiện tại đây. Hãy theo dõi thường xuyên.
        </p>
      </Card>
    </div>
  );
}
