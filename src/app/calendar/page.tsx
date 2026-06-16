import CalendarClient from "./calendar-client";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <header className="pb-6">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-600 font-bold">Lịch làm việc</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Lịch Công Việc</h1>
      </header>

      <CalendarClient />
    </div>
  );
}
