import { db } from "@/lib/db";
import { getEffectivePlan, PLAN_FEATURES } from "@/lib/plan-utils";
import {
  getPlanPauseState,
  PLAN_PAUSE_SELECT,
  resumePausedPlanIfNeeded,
} from "@/lib/plan-pause";

export interface QuotaResult {
  allowed: boolean;
  message?: string;
  tokensUsedThisMonth?: number;
  tokenLimitMonthly?: number;
}

/**
 * Kiểm tra hạn mức token hàng tháng dựa theo plan của user.
 * Admin và MAX không bị giới hạn thực tế (50M tokens/tháng).
 */
export async function checkAndResetQuota(
  userId: string,
  estimatedCost: number
): Promise<QuotaResult> {
  try {
    await resumePausedPlanIfNeeded(userId);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        ...PLAN_PAUSE_SELECT,
        tokens_used_today: true,
        last_token_reset: true,
      },
    });

    if (!user) return { allowed: false, message: "Không tìm thấy người dùng." };

    const effectivePlan = getEffectivePlan(
      user.role,
      user.plan,
      user.plan_expires_at,
      getPlanPauseState(user)
    );
    const features = PLAN_FEATURES[effectivePlan];
    const monthlyLimit = features.aiTokenLimitMonthly;

    // Reset hàng ngày nếu sang ngày mới
    const now = new Date();
    const lastReset = new Date(user.last_token_reset);
    const isNewDay =
      now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
      now.getUTCMonth() !== lastReset.getUTCMonth() ||
      now.getUTCDate() !== lastReset.getUTCDate();

    let tokensUsed = user.tokens_used_today;
    if (isNewDay) {
      await db.user.update({
        where: { id: userId },
        data: { tokens_used_today: 0, last_token_reset: now },
      });
      tokensUsed = 0;
    }

    // Tính daily limit từ monthly (chia đều 30 ngày)
    const dailyLimit = Math.floor(monthlyLimit / 30);

    if (tokensUsed + estimatedCost > dailyLimit) {
      const planLabel =
        effectivePlan === "FREE"
          ? "Miễn phí"
          : effectivePlan === "PRO"
          ? "Pro"
          : "MAX";
      return {
        allowed: false,
        tokensUsedThisMonth: tokensUsed,
        tokenLimitMonthly: monthlyLimit,
        message: `Bạn đã đạt giới hạn AI hôm nay (gói ${planLabel}). Nâng cấp gói để tiếp tục sử dụng.`,
      };
    }

    return {
      allowed: true,
      tokensUsedThisMonth: tokensUsed,
      tokenLimitMonthly: monthlyLimit,
    };
  } catch {
    // Nếu có lỗi, cho phép qua để tránh block người dùng
    return { allowed: true };
  }
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
