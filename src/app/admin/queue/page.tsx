import { Suspense } from "react";
import AdminQueueSkeleton from "@/components/shared/admin-queue-skeleton";
import AdminQueueList from "./admin-queue-list";

export const dynamic = "force-dynamic";

export default function AdminQueuePage(props: {
  searchParams?: Promise<{ page?: string; tab?: string; search?: string; dept?: string; module?: string }>;
}) {
  return (
    <Suspense fallback={<AdminQueueSkeleton />}>
      <AdminQueueList searchParams={props.searchParams} />
    </Suspense>
  );
}
