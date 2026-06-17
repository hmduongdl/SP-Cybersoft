"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

export interface UseHopeStarResult {
  success: boolean;
  error?: string;
  remainingStars?: number;
  usedThisMonth?: number;
}

/**
 * Server Action: Sử dụng 1 Ngôi sao hy vọng để xóa lỗi quên check-in.
 *
 * Logic:
 * - Kiểm tra bài đăng đã hết hạn 24h chưa
 * - Kiểm tra nhân viên có hope_stars > 0 và used_stars_this_month < 3
 * - Trong Prisma Transaction: trừ sao, tăng used_stars_this_month, tạo/gán checkin APPROVED
 */
export async function useHopeStar(postId: string): Promise<UseHopeStarResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Vui lòng đăng nhập lại." };
    }

    const userId = session.user.id;

    // Validate & execute in transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Fetch user with current star data
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, hope_stars: true, used_stars_this_month: true, last_star_reset_at: true },
      });

      if (!user) {
        throw new Error("Không tìm thấy thông tin nhân viên.");
      }

      // 2. Reset monthly counter if new month has started
      const now = new Date();
      const lastReset = user.last_star_reset_at || now;
      const isNewMonth =
        now.getMonth() !== lastReset.getMonth() ||
        now.getFullYear() !== lastReset.getFullYear();

      let usedThisMonth = user.used_stars_this_month;
      if (isNewMonth) {
        usedThisMonth = 0;
        await tx.user.update({
          where: { id: userId },
          data: { used_stars_this_month: 0, last_star_reset_at: now },
        });
      }

      // 3. Validate star balance
      if (user.hope_stars <= 0) {
        throw new Error("Bạn không còn Ngôi sao hy vọng nào.");
      }

      // 4. Validate monthly limit (after potential reset)
      if (usedThisMonth >= 3) {
        throw new Error(
          "Bạn đã sử dụng hết 3 Ngôi sao hy vọng trong tháng này."
        );
      }

      // 4. Fetch post to check deadline
      const post = await tx.post.findUnique({
        where: { id: postId },
        select: { id: true, start_at: true, title: true },
      });

      if (!post) {
        throw new Error("Không tìm thấy bài viết.");
      }

      // 5. Check 24h deadline has passed
      const deadline = new Date(post.start_at.getTime() + 24 * 60 * 60 * 1000);
      if (new Date() < deadline) {
        throw new Error(
          "Bài viết chưa hết thời hạn 24h. Vui lòng nộp bằng chứng check-in bình thường."
        );
      }

      // 6. Check existing checkin — must not exist or be PENDING/REJECTED
      const existingCheckin = await tx.checkin.findFirst({
        where: { user_id: userId, post_id: postId },
        select: { id: true, status: true },
      });

      if (
        existingCheckin &&
        (existingCheckin.status === "APPROVED" ||
          existingCheckin.status === "AUTO_APPROVED")
      ) {
        throw new Error("Bài viết này đã được check-in và phê duyệt.");
      }

      // 7. Update user stars
      await tx.user.update({
        where: { id: userId },
        data: {
          hope_stars: { decrement: 1 },
          used_stars_this_month: { increment: 1 },
          last_star_reset_at: now,
        },
      });

      const note = "Được xóa lỗi bằng Ngôi sao hy vọng";

      // 8. Create or update checkin with APPROVED status
      if (existingCheckin) {
        await tx.checkin.update({
          where: { id: existingCheckin.id },
          data: {
            status: "APPROVED",
            reject_reason: note,
          },
        });
      } else {
        await tx.checkin.create({
          data: {
            user_id: userId,
            post_id: postId,
            status: "APPROVED",
            image_url: "",
            reject_reason: note,
          },
        });
      }

      return {
        remainingStars: user.hope_stars - 1,
        usedThisMonth: usedThisMonth + 1,
      };
    });

    // Revalidate cache after using a hope star
    revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");
    revalidateTag(CACHE_TAGS.POSTS_LIST, "default");

    return {
      success: true,
      remainingStars: result.remainingStars,
      usedThisMonth: result.usedThisMonth,
    };
  } catch (error: any) {
    console.error("useHopeStar Error:", error);
    return {
      success: false,
      error: error.message || "Đã xảy ra lỗi khi sử dụng Ngôi sao hy vọng.",
    };
  }
}
