export default function PostListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-surface-container-lowest rounded-lg-2xl border-none overflow-hidden flex flex-col sm:flex-row"
        >
          {/* Thumbnail placeholder */}
          <div className="sm:w-48 h-40 bg-surface-container shrink-0" />
          <div className="flex-1 p-5 space-y-3">
            {/* Title */}
            <div className="h-5 bg-surface-container rounded-lg-xl w-3/4" />
            {/* Description */}
            <div className="h-4 bg-surface-container rounded-lg-xl w-full" />
            <div className="h-4 bg-surface-container rounded-lg-xl w-5/6" />
            {/* Meta row */}
            <div className="flex items-center gap-3 pt-2">
              <div className="h-6 bg-surface-container rounded-lg-full w-20" />
              <div className="h-4 bg-surface-container rounded-lg w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
