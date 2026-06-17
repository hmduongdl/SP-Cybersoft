import { Suspense } from "react";
import CalendarSkeleton from "@/components/shared/calendar-skeleton";
import CalendarContainer from "./calendar-container";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarContainer />
      </Suspense>
    </div>
  );
}
