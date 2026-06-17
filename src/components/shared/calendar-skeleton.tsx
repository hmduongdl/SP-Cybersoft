export default function CalendarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 bg-surface-container rounded-lg" />
        <div className="h-6 bg-surface-container rounded-xl w-40" />
        <div className="h-8 w-8 bg-surface-container rounded-lg" />
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-4 bg-surface-container rounded-xl mx-auto w-8" />
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-surface-container-lowest rounded-xl border-none p-1.5 space-y-1"
          >
            <div className="h-4 w-4 bg-surface-container rounded-lg" />
            <div className="h-3 bg-surface-container rounded-lg w-full" />
            <div className="h-3 bg-surface-container rounded-lg w-2/3" />
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      <div className="bg-surface-container-lowest rounded-2xl border-none p-5 space-y-3">
        <div className="h-5 bg-surface-container rounded-xl w-48" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-surface-container rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
