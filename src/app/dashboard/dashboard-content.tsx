import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DashboardOverview } from "@/components/modules/dashboard/dashboard-overview";
import {
  getCachedRecentCheckins,
  getCachedDashboardPosts,
  getCachedMonthlyStats,
} from "@/lib/cache";
import { getStartOfDayVN } from "@/lib/pc-kho";

export default async function DashboardContent() {
  const session = await auth();
  const userId = session?.user?.id;

  const today = getStartOfDayVN();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const [recentCheckins, dashboardPosts, monthlyStats, user, dashboardTasks, pcTasks, pcSubmissions, todayExercises] =
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
      userId ? db.pcBuildTask.findMany({
        where: { date: { gte: today, lt: tomorrow } },
        include: {
          submissions: {
            where: { user_id: userId }
          }
        }
      }) : Promise.resolve([]),
      userId ? db.pcSubmission.findMany({
        where: {
          user_id: userId,
          submitted_at: { gte: today, lt: tomorrow }
        }
      }) : Promise.resolve([]),
      userId ? db.pcExercise.findMany({
        where: { exercise_date: { gte: today, lt: tomorrow } }
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

  // Filter uncompleted PC Build Tasks and PC Exercises
  const uncompletedPcTasks = pcTasks.filter(task => {
    const checkin = task.checkins[0];
    return !checkin || (checkin.build_data as any)?.is_draft === true;
  });

  const uncompletedExercises = todayExercises.filter(ex => {
    const sub = pcSubmissions.find(s => s.exercise_id === ex.id);
    return !sub || (sub.parts_answer as any)?.is_draft === true;
  });

  const pcTasksMapped = uncompletedPcTasks.map(t => ({
    id: `pc-task-${t.id}`,
    title: `💻 Đào tạo: Lắp ráp PC (${t.customer_need})`,
    thumbnail_url: null,
    start_at: t.date.toISOString(),
    url: "/training/pc-build",
    is_pc_build: true,
  }));

  const exercisesMapped = uncompletedExercises.map(ex => ({
    id: `pc-ex-${ex.id}`,
    title: `🛠️ Luyện tập: ${ex.title}`,
    thumbnail_url: null,
    start_at: ex.exercise_date.toISOString(),
    url: "/build-pc",
    is_pc_build: true,
  }));

  const combinedDashboardPosts = [
    ...pcTasksMapped,
    ...exercisesMapped,
    ...dashboardPosts
  ];

  return (
    <DashboardOverview
      userName={userName}
      pendingCount={pendingCount}
      completedCount={completedCount}
      totalPostsCount={totalPostsCount}
      trustScore={trustScore}
      activityFeed={activityFeed}
      dashboardPosts={combinedDashboardPosts}
      dashboardTasks={allDashboardTasks}
    />
  );
}
