export default function CalendarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 bg-slate-200 rounded-lg" />
        <div className="h-6 bg-slate-200 rounded-md w-40" />
        <div className="h-8 w-8 bg-slate-200 rounded-lg" />
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded-md mx-auto w-8" />
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-white rounded-xl border border-slate-100 p-1.5 space-y-1"
          >
            <div className="h-4 w-4 bg-slate-200 rounded" />
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-2/3" />
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="h-5 bg-slate-200 rounded-md w-48" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
