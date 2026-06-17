export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Welcome text */}
      <div className="space-y-2">
        <div className="h-8 bg-surface-container rounded-lg-xl w-64" />
        <div className="h-4 bg-surface-container rounded-lg-xl w-96" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-lg-2xl border-none p-5 space-y-3">
            <div className="h-4 bg-surface-container rounded-lg-xl w-24" />
            <div className="h-8 bg-surface-container rounded-lg-xl w-16" />
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="bg-surface-container-lowest rounded-lg-2xl border-none p-6">
        <div className="h-5 bg-surface-container rounded-lg-xl w-40 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg-full bg-surface-container shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-surface-container rounded-lg-xl w-3/4" />
                <div className="h-3 bg-surface-container rounded-lg-xl w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
