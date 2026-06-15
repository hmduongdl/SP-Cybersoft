import { BarChart3, Clock4, Flag, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { getCurrentQuarter } from '@/lib/date';

const stats = [
    { label: 'Nhiệm vụ đang xử lý', value: '28', icon: Clock4, accent: 'text-emerald-400' },
    { label: 'Hoàn thành trong tuần', value: '76%', icon: BarChart3, accent: 'text-blue-400' },
    { label: 'Nhóm hoạt động', value: '5', icon: Users, accent: 'text-amber-300' },
    { label: 'Deadline sắp tới', value: '2', icon: Flag, accent: 'text-rose-400' },
];

export function DashboardOverview() {
    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((item) => (
                    <Card key={item.label} className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{item.label}</p>
                                <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                            </div>
                            <div className={`rounded-3xl bg-slate-800/80 p-3 ${item.accent}`}>
                                <item.icon className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-sm leading-6 text-slate-400">
                            Cập nhật mới nhất: {format(new Date(), 'dd/MM/yyyy')} — quý {getCurrentQuarter()}.
                        </p>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
                <Card className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Tổng quan hoạt động</p>
                            <h2 className="mt-2 text-2xl font-semibold text-white">Lịch biểu & tiến độ nhóm</h2>
                        </div>
                        <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs uppercase tracking-[0.35em] text-slate-400">
                            Q{getCurrentQuarter()}
                        </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-5">
                            <p className="text-sm text-slate-400">Sự kiện tiếp theo</p>
                            <p className="mt-3 text-lg font-medium text-white">Họp dự án Sprint</p>
                            <p className="mt-2 text-sm text-slate-500">14:00, Thứ tư</p>
                        </div>
                        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-5">
                            <p className="text-sm text-slate-400">Mục tiêu chính</p>
                            <p className="mt-3 text-lg font-medium text-white">Hoàn thành dashboard MVP</p>
                            <p className="mt-2 text-sm text-slate-500">Đến hạn trong 3 ngày</p>
                        </div>
                    </div>
                </Card>

                <Card className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Hoạt động nhóm</p>
                            <h2 className="mt-2 text-2xl font-semibold text-white">Phân bổ công việc</h2>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="rounded-3xl bg-slate-950/90 p-4">
                            <p className="text-sm text-slate-400">Nguyễn An</p>
                            <p className="mt-2 text-sm text-slate-200">Theo dõi tài liệu, giao tiếp đội ngũ.</p>
                        </div>
                        <div className="rounded-3xl bg-slate-950/90 p-4">
                            <p className="text-sm text-slate-400">Lê Bình</p>
                            <p className="mt-2 text-sm text-slate-200">Thiết kế component và kiểm thử giao diện.</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
