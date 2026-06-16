import { db } from "@/lib/db";
import { auth } from "@/auth";
import { DashboardOverview } from "@/components/modules/dashboard/dashboard-overview";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  // Fetch data concurrently for better performance
  const [totalPostsCount, completedCount, recentCheckins] = await Promise.all([
    db.post.count(),
    userId ? db.checkin.count({
      where: {
        user_id: userId,
        status: { in: ["APPROVED", "AUTO_APPROVED"] }
      }
    }) : Promise.resolve(0),
    db.checkin.findMany({
      take: 5,
      orderBy: { submitted_at: 'desc' },
      include: {
        user: { select: { name: true, avatar_url: true } },
        post: { select: { title: true } }
      }
    })
  ]);

  // Pending posts = total posts - completed
  const pendingCount = Math.max(0, totalPostsCount - completedCount);

  // Calculate total points (e.g. 100 points per completed check-in)
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
