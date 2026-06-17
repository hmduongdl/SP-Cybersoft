export default function AdminQueueSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl border-none p-5 space-y-3">
            <div className="h-4 bg-surface-container rounded-xl w-20" />
            <div className="h-8 bg-surface-container rounded-xl w-12" />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-2xl border-none p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-10 bg-surface-container rounded-xl" />
          <div className="h-10 bg-surface-container rounded-xl" />
          <div className="h-10 bg-surface-container rounded-xl" />
        </div>
      </div>

      {/* Table / Cards */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl border-none p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-surface-container shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-surface-container rounded-xl w-1/3" />
                <div className="h-3 bg-surface-container rounded-xl w-1/2" />
                <div className="flex items-center gap-4 pt-1">
                  <div className="h-3 bg-surface-container rounded-lg w-24" />
                  <div className="h-6 bg-surface-container rounded-full w-20" />
                </div>
              </div>
              <div className="h-8 w-8 rounded-lg bg-surface-container" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
