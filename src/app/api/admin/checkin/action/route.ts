import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { deleteImage } from "@/lib/upload";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import { recalculateTrustScoresForUsers } from "@/lib/trust-score";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Authenticate & authorize Admin
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    const { checkinIds, action, rejectReason } = await request.json();

    if (!checkinIds || !Array.isArray(checkinIds) || checkinIds.length === 0) {
      return NextResponse.json(
        { error: "Thiếu thông tin danh sách check-in." },
        { status: 400 }
      );
    }

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { error: "Hành động không hợp lệ." },
        { status: 400 }
      );
    }

    if (action === "REJECT" && !rejectReason) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp lý do từ chối." },
        { status: 400 }
      );
    }

    // 3. Update database
    if (action === "APPROVE") {
      await db.checkin.updateMany({
        where: {
          id: { in: checkinIds },
        },
        data: {
          status: "APPROVED",
          reject_reason: null,
          reviewed_by: session.user.id,
        },
      });
    } else {
      // REJECT: fetch checkins to delete their images before updating DB
      const checkins = await db.checkin.findMany({
        where: { id: { in: checkinIds } },
        select: { id: true, image_url: true },
      });

      for (const c of checkins) {
        await deleteImage(c.image_url);
      }

      await db.checkin.updateMany({
        where: {
          id: { in: checkinIds },
        },
        data: {
          status: "REJECTED",
          reject_reason: rejectReason,
          reviewed_by: session.user.id,
        },
      });
    }

    // Fetch unique user_ids from affected checkins to recalculate trust scores
    const affectedCheckins = await db.checkin.findMany({
      where: { id: { in: checkinIds } },
      select: { user_id: true },
      distinct: ["user_id"],
    });
    const affectedUserIds = affectedCheckins.map(c => c.user_id);

    await recalculateTrustScoresForUsers(affectedUserIds);

    // Revalidate cache after admin approves/rejects checkins
    revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");
    revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
    revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");

    return NextResponse.json({
      success: true,
      message: `Đã ${action === "APPROVE" ? "phê duyệt" : "từ chối"} ${checkinIds.length} lượt check-in thành công.`,
    });
  } catch (error: any) {
    console.error("Checkin Action Error:", error);
    return NextResponse.json(
      { error: error.message || "Đã xảy ra lỗi khi xử lý phê duyệt." },
      { status: 500 }
    );
  }
}
