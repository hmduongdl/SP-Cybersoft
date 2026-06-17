export default function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-4 bg-surface-container rounded-lg-xl w-32" />
        <div className="h-8 bg-surface-container rounded-lg-xl w-56" />
        <div className="h-4 bg-surface-container rounded-lg-xl w-72" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-lg-2xl border-none p-5 space-y-3">
            <div className="h-4 bg-surface-container rounded-lg-xl w-24" />
            <div className="h-8 bg-surface-container rounded-lg-xl w-16" />
            <div className="h-3 bg-surface-container rounded-lg-xl w-20" />
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-surface-container-lowest rounded-lg-2xl border-none p-6">
          <div className="h-5 bg-surface-container rounded-lg-xl w-40 mb-6" />
          <div className="h-48 bg-surface-container rounded-lg-lg" />
        </div>
        {/* Department Chart */}
        <div className="bg-surface-container-lowest rounded-lg-2xl border-none p-6">
          <div className="h-5 bg-surface-container rounded-lg-xl w-48 mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 bg-surface-container rounded-lg w-24" />
                <div className="flex-1 h-4 bg-surface-container rounded-lg-full" />
                <div className="h-4 bg-surface-container rounded-lg w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Worst posts table */}
      <div className="bg-surface-container-lowest rounded-lg-2xl border-none p-6">
        <div className="h-5 bg-surface-container rounded-lg-xl w-44 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 bg-surface-container rounded-lg w-3/5" />
              <div className="flex-1 h-4 bg-surface-container rounded-lg-full" />
              <div className="h-4 bg-surface-container rounded-lg w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
