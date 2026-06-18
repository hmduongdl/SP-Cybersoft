import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-2 text-on-surface-variant">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium animate-pulse">Đang tải dữ liệu nhiệm vụ...</p>
      </div>
    </div>
  );
}
