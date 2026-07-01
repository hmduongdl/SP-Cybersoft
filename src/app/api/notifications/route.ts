import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadNotificationCount } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [notifications, unreadCount] = await Promise.all([
      getNotifications(session.user.id, 20),
      getUnreadNotificationCount(session.user.id),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error("[notifications] GET error:", err);
    return NextResponse.json({ error: "Lỗi server." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { notificationId, markAll } = body;

    if (markAll) {
      await markAllNotificationsAsRead(session.user.id);
      return NextResponse.json({ success: true });
    }

    if (!notificationId) {
      return NextResponse.json({ error: "Thiếu notificationId." }, { status: 400 });
    }

    await markNotificationAsRead(notificationId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[notifications] PATCH error:", err);
    return NextResponse.json({ error: "Lỗi server." }, { status: 500 });
  }
}
