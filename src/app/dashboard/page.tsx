import { Suspense } from "react";
import DashboardSkeleton from "@/components/shared/dashboard-skeleton";
import DashboardContent from "./dashboard-content";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
