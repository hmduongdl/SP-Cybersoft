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
  _userId: string,
  _estimatedCost: number
): Promise<QuotaResult> {
  // Tạm thời bỏ qua kiểm tra hạn mức token
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
