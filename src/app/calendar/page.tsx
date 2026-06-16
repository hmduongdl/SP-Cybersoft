import { db } from "@/lib/db";
import { auth } from "@/auth";
import { format } from "date-fns";
import CalendarClient from "./calendar-client";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [postsFromDb, allCheckins] = await Promise.all([
    db.post.findMany({
      orderBy: { start_at: 'asc' },
      include: userId
        ? {
            checkins: {
              where: { user_id: userId },
              select: { status: true },
            },
          }
        : undefined,
    }),
    db.checkin.findMany({
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
    })
  ]);

  // Map to frontend Post structure
  const posts = postsFromDb.map(post => {
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
    <div className="space-y-6">
      <CalendarClient posts={posts} completedAvatarsByDate={completedAvatarsByDate} />
    </div>
  );
}
