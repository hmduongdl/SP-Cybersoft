import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DashboardOverview } from "@/components/modules/dashboard/dashboard-overview";
import {
  getCachedRecentCheckins,
  getCachedDashboardPosts,
  getCachedMonthlyStats,
} from "@/lib/cache";

function getTodayColKey(): string {
  const day = new Date().getDay();
  const map: Record<number, string> = {
    0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
  };
  return map[day];
}

export default async function DashboardContent() {
  const session = await auth();
  const userId = session?.user?.id;

  const [recentCheckins, dashboardPosts, monthlyStats, user, dashboardTasks] =
    await Promise.all([
      getCachedRecentCheckins(userId || ""),
      userId ? getCachedDashboardPosts(userId) : Promise.resolve([]),
      userId ? getCachedMonthlyStats(userId) : Promise.resolve({ completedThisMonth: 0, totalPostsThisMonth: 0, pendingThisMonth: 0 }),
      userId ? db.user.findUnique({ where: { id: userId }, select: { trust_score: true } }) : Promise.resolve(null),
      userId ? db.task.findMany({
        where: {
          is_archived: false,
          status: { not: "DONE" },
          due_date: { not: null },
          OR: [
            { creator_id: userId },
            { assignees: { some: { user_id: userId } } }
          ]
        },
        orderBy: { due_date: 'asc' },
        take: 5,
        select: { id: true, title: true, due_date: true, status: true }
      }) : Promise.resolve([]),
    ]);

  const trustScore = user?.trust_score ?? 80;
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

  const allDashboardTasks = dashboardTasks.map(t => ({ id: t.id, title: t.title, due_date: t.due_date?.toISOString() || "", status: t.status }));
  return (
    <DashboardOverview
      userName={userName}
      pendingCount={pendingCount}
      completedCount={completedCount}
      totalPostsCount={totalPostsCount}
      trustScore={trustScore}
      activityFeed={activityFeed}
      dashboardPosts={dashboardPosts}
      dashboardTasks={allDashboardTasks}
    />
  );
}
