import { db } from "@/lib/db";
import { format } from "date-fns";
import PostsPageClient from "./posts-page-client";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  // Fetch all posts ordered by start_at
  const postsFromDb = await db.post.findMany({
    orderBy: { start_at: 'asc' },
    include: userId
      ? {
          checkins: {
            where: { user_id: userId },
            select: { status: true },
          },
        }
      : undefined,
  });

  // Map to frontend Post structure
  const posts = postsFromDb.map(post => {
    // If the user has a checkin, check its status
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
      start_at: post.start_at.toISOString(),
      status,
    };
  });

  // Fetch completed checkins across the company to build avatars for Calendar
  // Group by date
  const allCheckins = await db.checkin.findMany({
    where: {
      status: {
        in: ["APPROVED", "AUTO_APPROVED"],
      },
    },
    include: {
      user: {
        select: { id: true, name: true, avatar_url: true },
      },
      post: {
        select: { start_at: true },
      },
    },
  });

  const completedAvatarsByDate: Record<string, any[]> = {};

  allCheckins.forEach(sub => {
    if (!sub.post || !sub.user) return;
    const dateKey = format(new Date(sub.post.start_at), "yyyy-MM-dd");
    if (!completedAvatarsByDate[dateKey]) {
      completedAvatarsByDate[dateKey] = [];
    }
    
    // Deduplicate user by ID per date
    if (!completedAvatarsByDate[dateKey].some(u => u.id === sub.user.id)) {
      completedAvatarsByDate[dateKey].push({
        id: sub.user.id,
        name: sub.user.name || "Unknown",
        imageUrl: sub.user.avatar_url,
      });
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PostsPageClient posts={posts} completedAvatarsByDate={completedAvatarsByDate} />
    </div>
  );
}
