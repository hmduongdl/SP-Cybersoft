import { Suspense } from "react";
import PostListSkeleton from "@/components/shared/post-list-skeleton";
import TaskListContainer from "./task-list-container";

export const dynamic = "force-dynamic";

export default function TasksPage(props: {
  searchParams?: Promise<{ page?: string }>;
}) {
  return (
    <Suspense fallback={<PostListSkeleton />}>
      <TaskListContainer searchParams={props.searchParams} />
    </Suspense>
  );
}
