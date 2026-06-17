import { db } from "@/lib/db";

export interface QuotaResult {
  allowed: boolean;
  message?: string;
}

/**
 * Kiểm tra và tự động reset hạn mức token hàng ngày của user.
 *
 * - Nếu đã bước sang ngày mới: reset `tokens_used_today` về 0,
 *   cập nhật `last_token_reset` thành thời gian hiện tại.
 * - Kiểm tra `tokens_used_today + estimatedCost <= daily_token_limit`.
 */
export async function checkAndResetQuota(
  userId: string,
  estimatedCost: number
): Promise<QuotaResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tokens_used_today: true,
      daily_token_limit: true,
      last_token_reset: true,
    },
  });
  if (!user) {
    return { allowed: false, message: "Người dùng không tồn tại." };
  }

  const now = new Date();
  const lastReset = new Date(user.last_token_reset);
  const isNewDay =
    now.getFullYear() !== lastReset.getFullYear() ||
    now.getMonth() !== lastReset.getMonth() ||
    now.getDate() !== lastReset.getDate();

  if (isNewDay) {
    await db.user.update({
      where: { id: userId },
      data: {
        tokens_used_today: 0,
        last_token_reset: now,
      },
    });
    // Đặt lại giá trị local để không cần re-query
    user.tokens_used_today = 0;
  }

  const limit = user.daily_token_limit ?? 100000;
  const tokensUsed = user.tokens_used_today ?? 0;
  const totalAfter = (isNewDay ? 0 : tokensUsed) + estimatedCost;

  if (totalAfter > limit) {
    return {
      allowed: false,
      message: `Bạn đã vượt quá hạn mức sử dụng AI trong ngày hôm nay (Hạn mức: ${limit.toLocaleString()} tokens). Vui lòng quay lại vào ngày mai!`,
    };
  }

  return { allowed: true };
}

/**
 * Ghi nhận số token đã tiêu hao vào DB sau khi stream hoàn tất.
 */
export async function recordTokenUsage(
  userId: string,
  tokensUsed: number
): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: {
      tokens_used_today: { increment: tokensUsed },
    },
  });
}
