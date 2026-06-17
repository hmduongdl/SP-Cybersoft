import { Suspense } from "react";
import PostListSkeleton from "@/components/shared/post-list-skeleton";
import PostListContainer from "./post-list-container";

export const dynamic = "force-dynamic";

export default function PostsPage(props: {
  searchParams?: Promise<{ page?: string; view?: string }>;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Suspense fallback={<PostListSkeleton />}>
        <PostListContainer searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
