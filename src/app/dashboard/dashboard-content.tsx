import { auth } from "@/auth";
import { DashboardOverview } from "@/components/modules/dashboard/dashboard-overview";
import {
  getCachedTotalPostsCount,
  getCachedUserCompletedCount,
  getCachedRecentCheckins,
} from "@/lib/cache";

export default async function DashboardContent() {
  const session = await auth();
  const userId = session?.user?.id;

  const [totalPostsCount, completedCount, recentCheckins] = await Promise.all([
    getCachedTotalPostsCount(),
    userId ? getCachedUserCompletedCount(userId) : Promise.resolve(0),
    getCachedRecentCheckins(),
  ]);

  const pendingCount = Math.max(0, totalPostsCount - completedCount);
  const totalPoints = completedCount * 100;
  const userName = session?.user?.name || "Thành viên";

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
