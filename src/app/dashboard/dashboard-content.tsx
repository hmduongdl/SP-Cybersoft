import { auth } from "@/auth";
import { DashboardOverview } from "@/components/modules/dashboard/dashboard-overview";
import {
  getCachedTotalPostsCount,
  getCachedUserCompletedCount,
  getCachedRecentCheckins,
  getCachedDashboardPosts,
  getCachedWeeklyStats,
} from "@/lib/cache";

export default async function DashboardContent() {
  const session = await auth();
  const userId = session?.user?.id;

  const [totalPostsCount, completedCount, recentCheckins, dashboardPosts, weeklyStats] =
    await Promise.all([
      getCachedTotalPostsCount(),
      userId ? getCachedUserCompletedCount(userId) : Promise.resolve(0),
      getCachedRecentCheckins(),
      userId ? getCachedDashboardPosts(userId) : Promise.resolve([]),
      userId ? getCachedWeeklyStats(userId) : Promise.resolve({ completedThisWeek: 0, totalPostsThisWeek: 0 }),
    ]);

  const pendingCount = Math.max(0, totalPostsCount - completedCount);
  const totalPoints = completedCount * 100;
  const userName = session?.user?.name || "Thành viên";

  const activityFeed = recentCheckins.map(sub => ({
    id: sub.id,
    userName: sub.user?.name || "Thành viên ẩn danh",
    userImage: sub.user?.avatar_url || null,
    postTitle: sub.post?.title || "Bài viết mới",
    submittedAt: sub.submitted_at.toISOString(),
    status: sub.status,
  }));

  const weeklyProgress = weeklyStats.totalPostsThisWeek > 0
    ? Math.round((weeklyStats.completedThisWeek / weeklyStats.totalPostsThisWeek) * 100)
    : 0;
  const remainingPosts = Math.max(0, weeklyStats.totalPostsThisWeek - weeklyStats.completedThisWeek);

  return (
    <DashboardOverview
      userName={userName}
      pendingCount={pendingCount}
      completedCount={completedCount}
      totalPoints={totalPoints}
      activityFeed={activityFeed}
      dashboardPosts={dashboardPosts}
      weeklyProgress={weeklyProgress}
      completedThisWeek={weeklyStats.completedThisWeek}
      totalPostsThisWeek={weeklyStats.totalPostsThisWeek}
      remainingPosts={remainingPosts}
    />
  );
}
