export default function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded-md w-32" />
        <div className="h-8 bg-slate-200 rounded-md w-56" />
        <div className="h-4 bg-slate-100 rounded-md w-72" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="h-4 bg-slate-200 rounded-md w-24" />
            <div className="h-8 bg-slate-200 rounded-md w-16" />
            <div className="h-3 bg-slate-100 rounded-md w-20" />
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="h-5 bg-slate-200 rounded-md w-40 mb-6" />
          <div className="h-48 bg-slate-100 rounded-lg" />
        </div>
        {/* Department Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="h-5 bg-slate-200 rounded-md w-48 mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 bg-slate-200 rounded w-24" />
                <div className="flex-1 h-4 bg-slate-100 rounded-full" />
                <div className="h-4 bg-slate-200 rounded w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Worst posts table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="h-5 bg-slate-200 rounded-md w-44 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 bg-slate-200 rounded w-3/5" />
              <div className="flex-1 h-4 bg-slate-100 rounded-full" />
              <div className="h-4 bg-slate-200 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
