import { auth } from "@/auth";
import { format } from "date-fns";
import PostsPageClient from "./posts-page-client";
import {
  getCachedPosts,
  getCachedApprovedCheckins,
  getCachedUserStarData,
} from "@/lib/cache";

const POSTS_PER_PAGE = 12;

export default async function PostListContainer(props: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await auth();
  const userId = session?.user?.id;

  const page = Math.max(1, Number(searchParams?.page) || 1);
  const skip = (page - 1) * POSTS_PER_PAGE;

  const [allPosts, allCheckins, currentUser] = await Promise.all([
    getCachedPosts(userId ?? undefined),
    getCachedApprovedCheckins(),
    userId ? getCachedUserStarData(userId) : Promise.resolve(null),
  ]);

  const paginatedPosts = allPosts.slice(skip, skip + POSTS_PER_PAGE);
  const totalPosts = allPosts.length;
  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

  const posts = paginatedPosts.map(post => {
    const userCheckin = (post as any).checkins?.[0];
    let status = "PENDING";

    if (userCheckin && (userCheckin.status === "APPROVED" || userCheckin.status === "AUTO_APPROVED")) {
      status = "COMPLETED";
    }

    return {
      id: post.id,
      title: post.title,
      description: post.description || "",
      url: post.url,
      thumbnail_url: post.thumbnail_url,
      start_at: new Date(post.start_at as unknown as string).toISOString(),
      status,
      team: post.team,
      checkinStatus: userCheckin ? userCheckin.status : null,
    };
  });

  const completedAvatarsByDate: Record<string, any[]> = {};
  allCheckins.forEach(sub => {
    if (!sub.post || !sub.user) return;
    const dateKey = format(new Date(sub.post.start_at), "yyyy-MM-dd");
    if (!completedAvatarsByDate[dateKey]) {
      completedAvatarsByDate[dateKey] = [];
    }
    if (!completedAvatarsByDate[dateKey].some(u => u.id === sub.user.id)) {
      completedAvatarsByDate[dateKey].push({
        id: sub.user.id,
        name: sub.user.name || "Unknown",
        imageUrl: sub.user.avatar_url,
      });
    }
  });

  return (
    <PostsPageClient
      posts={posts}
      completedAvatarsByDate={completedAvatarsByDate}
      userHopeStars={currentUser?.hope_stars ?? 0}
      userUsedStarsThisMonth={currentUser?.used_stars_this_month ?? 0}
        currentPage={page}
        totalPages={totalPages}
      />
  );
}
