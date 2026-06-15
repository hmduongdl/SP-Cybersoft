import { DashboardOverview } from "@/components/modules/dashboard/dashboard-overview";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Bảng điều khiển</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Tổng quan công việc</h1>
        </div>
      </header>

      <DashboardOverview />
    </div>
  );
}
