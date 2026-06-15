import { db } from "@/lib/db";
import { format } from "date-fns";
import PostsPageClient from "./posts-page-client";
import { auth } from "@/auth";

export default async function PostsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  // Fetch all posts ordered by scheduledAt
  const postsFromDb = await db.post.findMany({
    orderBy: { scheduledAt: 'asc' },
    include: {
      submissions: {
        where: { userId },
        select: { status: true },
      },
    },
  });

  // Map to frontend Post structure
  const posts = postsFromDb.map(post => {
    // If the user has a submission, check its status
    const userSubmission = post.submissions[0];
    let status = "PENDING";
    
    if (userSubmission && userSubmission.status === "APPROVED") {
      status = "COMPLETED";
    } else if (userSubmission && userSubmission.status === "AUTO_VERIFIED") {
      status = "COMPLETED";
    }

    return {
      id: post.id,
      title: post.title,
      description: post.description || "",
      originalUrl: post.originalUrl,
      thumbnailUrl: post.thumbnailUrl,
      scheduledAt: post.scheduledAt.toISOString(),
      status,
    };
  });

  // Fetch completed submissions across the company to build avatars for Calendar
  // Group by date
  const allSubmissions = await db.submission.findMany({
    where: {
      status: {
        in: ["APPROVED", "AUTO_VERIFIED"],
      },
    },
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
      post: {
        select: { scheduledAt: true },
      },
    },
  });

  const completedAvatarsByDate: Record<string, any[]> = {};

  allSubmissions.forEach(sub => {
    if (!sub.post || !sub.user) return;
    const dateKey = format(new Date(sub.post.scheduledAt), "yyyy-MM-dd");
    if (!completedAvatarsByDate[dateKey]) {
      completedAvatarsByDate[dateKey] = [];
    }
    
    // Deduplicate user by ID per date
    if (!completedAvatarsByDate[dateKey].some(u => u.id === sub.user.id)) {
      completedAvatarsByDate[dateKey].push({
        id: sub.user.id,
        name: sub.user.name || "Unknown",
        imageUrl: sub.user.image,
      });
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PostsPageClient posts={posts} completedAvatarsByDate={completedAvatarsByDate} />
    </div>
  );
}
