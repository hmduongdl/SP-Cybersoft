import { Suspense } from "react";
import AnalyticsSkeleton from "@/components/shared/analytics-skeleton";
import AnalyticsContainer from "./analytics-container";

export const dynamic = 'force-dynamic';

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContainer />
    </Suspense>
  );
}
