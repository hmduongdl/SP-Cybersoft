import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DashboardOverview } from "@/components/modules/dashboard/dashboard-overview";
import {
  getCachedRecentCheckins,
  getCachedDashboardPosts,
  getCachedMonthlyStats,
} from "@/lib/cache";

export default async function DashboardContent() {
  const session = await auth();
  const userId = session?.user?.id;

  const [recentCheckins, dashboardPosts, monthlyStats, user] =
    await Promise.all([
      getCachedRecentCheckins(userId || ""),
      userId ? getCachedDashboardPosts(userId) : Promise.resolve([]),
      userId ? getCachedMonthlyStats(userId) : Promise.resolve({ completedThisMonth: 0, totalPostsThisMonth: 0, pendingThisMonth: 0 }),
      userId ? db.user.findUnique({ where: { id: userId }, select: { trust_score: true } }) : Promise.resolve(null),
    ]);

  const trustScore = user?.trust_score ?? 50;
  const userName = session?.user?.name || "Thành viên";

  // Ensure completedCount never exceeds totalPostsCount
  const totalPostsCount = monthlyStats.totalPostsThisMonth;
  const completedCount = Math.min(monthlyStats.completedThisMonth, totalPostsCount);
  const pendingCount = Math.max(0, totalPostsCount - completedCount);

  const activityFeed = recentCheckins.map(sub => ({
    id: sub.id,
    userName: sub.user?.name || "Thành viên ẩn danh",
    userImage: sub.user?.avatar_url || null,
    postTitle: sub.post?.title || "Bài viết mới",
    submittedAt: sub.submitted_at.toISOString(),
    status: sub.status,
  }));

  return (
    <DashboardOverview
      userName={userName}
      pendingCount={pendingCount}
      completedCount={completedCount}
      totalPostsCount={totalPostsCount}
      trustScore={trustScore}
      activityFeed={activityFeed}
      dashboardPosts={dashboardPosts}
    />
  );
}
