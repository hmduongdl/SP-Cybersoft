import { db } from "@/lib/db";
import { auth } from "@/auth";
import { DashboardOverview } from "@/components/modules/dashboard/dashboard-overview";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  // Count total posts in system
  const totalPostsCount = await db.post.count();

  // Count completed posts for this user
  const completedCount = userId 
    ? await db.checkin.count({
        where: {
          user_id: userId,
          status: { in: ["APPROVED", "AUTO_APPROVED"] }
        }
      })
    : 0;

  // Pending posts = total posts - completed
  const pendingCount = Math.max(0, totalPostsCount - completedCount);

  // Calculate total points (e.g. 100 points per completed check-in)
  const totalPoints = completedCount * 100;

  const userName = session?.user?.name || "Thành viên";

  // Fetch recent check-ins across the entire company for the Activity Feed
  const recentCheckins = await db.checkin.findMany({
    take: 5,
    orderBy: { submitted_at: 'desc' },
    include: {
      user: {
        select: { name: true, avatar_url: true }
      },
      post: {
        select: { title: true }
      }
    }
  });

  const activityFeed = recentCheckins.map(sub => ({
    id: sub.id,
    userName: sub.user?.name || "Thành viên ẩn danh",
    userImage: sub.user?.avatar_url || null,
    postTitle: sub.post?.title || "Bài viết mới",
    submittedAt: sub.submitted_at.toISOString()
  }));


  return (
    <DashboardOverview 
      userName={userName}
      pendingCount={pendingCount}
      completedCount={completedCount}
      totalPoints={totalPoints}
      activityFeed={activityFeed}
    />
  );
}
