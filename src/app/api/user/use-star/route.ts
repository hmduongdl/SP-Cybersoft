import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await request.json();
    if (!postId) {
      return NextResponse.json({ error: "Thiếu ID bài viết." }, { status: 400 });
    }

    const userId = session.user.id;

    // Execute everything in a transaction to prevent race conditions
    const result = await db.$transaction(async (tx) => {
      // 1. Verify post exists and is past 24h window
      const post = await tx.post.findUnique({ where: { id: postId } });
      if (!post) {
        throw { status: 404, message: "Bài viết không tồn tại." };
      }

      const now = new Date();
      const postDeadline = new Date(post.start_at.getTime() + 24 * 60 * 60 * 1000);
      if (now < postDeadline) {
        throw { status: 400, message: "Bài viết chưa kết thúc thời hạn 24 giờ." };
      }

      // 2. Check that no approved checkin exists for this post + user
      const existingCheckin = await tx.checkin.findFirst({
        where: {
          user_id: userId,
          post_id: postId,
          status: { in: ["APPROVED", "AUTO_APPROVED"] },
        },
      });
      if (existingCheckin) {
        throw { status: 400, message: "Bài viết này đã có check-in được duyệt." };
      }

      // 3. Check user's hope_stars balance and monthly limit with auto-reset
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          hope_stars: true,
          used_stars_this_month: true,
          last_star_reset_at: true,
        },
      });
      if (!user) {
        throw { status: 404, message: "Người dùng không tồn tại." };
      }

      // Auto-reset monthly counter if new month
      const lastReset = user.last_star_reset_at || now;
      const isNewMonth =
        now.getMonth() !== lastReset.getMonth() ||
        now.getFullYear() !== lastReset.getFullYear();
      const usedThisMonth = isNewMonth ? 0 : user.used_stars_this_month;

      if (user.hope_stars <= 0) {
        throw { status: 400, message: "Bạn không có Ngôi sao hy vọng nào." };
      }
      if (usedThisMonth >= 3) {
        throw { status: 400, message: "Bạn đã sử dụng hết 3 Ngôi sao hy vọng trong tháng này." };
      }

      // 4. Deduct star and create approved checkin
      const updateData: any = {
        hope_stars: { decrement: 1 },
        used_stars_this_month: isNewMonth ? 1 : { increment: 1 },
        last_star_reset_at: now,
      };

      await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Find existing PENDING/REJECTED checkin to update, or create new
      const existingAnyCheckin = await tx.checkin.findFirst({
        where: { user_id: userId, post_id: postId },
        orderBy: { submitted_at: "desc" },
      });

      if (existingAnyCheckin) {
        await tx.checkin.update({
          where: { id: existingAnyCheckin.id },
          data: {
            status: "APPROVED",
            reject_reason: "Được xóa lỗi bằng Ngôi sao hy vọng",
            reviewed_by: userId,
          },
        });
      } else {
        await tx.checkin.create({
          data: {
            user_id: userId,
            post_id: postId,
            image_url: "",
            status: "APPROVED",
            reject_reason: "Được xóa lỗi bằng Ngôi sao hy vọng",
            reviewed_by: userId,
            submitted_at: now,
          },
        });
      }

      return true;
    });

    return NextResponse.json({
      success: true,
      message: "Đã sử dụng 1 Ngôi sao hy vọng để xóa lỗi check-in.",
    });
  } catch (error: any) {
    if (error?.status && error?.message) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Use Star Error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi khi sử dụng sao." },
      { status: 500 }
    );
  }
}
