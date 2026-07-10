import { db } from "@/lib/db";
import {
  buildQuotaExceededMessage,
  getEffectivePlan,
  getNextDailyResetDate,
  PLAN_FEATURES,
} from "@/lib/plan-utils";
import {
  getPlanPauseState,
  PLAN_PAUSE_SELECT,
  resumePausedPlanIfNeeded,
} from "@/lib/plan-pause";

export interface QuotaResult {
  allowed: boolean;
  message?: string;
  tokensUsedToday?: number;
  dailyLimit?: number;
  tokenLimitMonthly?: number;
  effectivePlan?: string;
  upgradePlan?: "PRO" | "MAX";
  resetsAt?: Date;
  quotaExceeded?: boolean;
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
      const resetsAt = getNextDailyResetDate();
      const upgradePlan = effectivePlan === "FREE" ? "PRO" : "MAX";
      const message =
        effectivePlan === "MAX"
          ? `Bạn đã đạt giới hạn AI token hôm nay (${tokensUsed.toLocaleString("vi-VN")}/${dailyLimit.toLocaleString("vi-VN")}). Đợi reset vào ${resetsAt.toLocaleDateString("vi-VN", { day: "numeric", month: "long", timeZone: "Asia/Ho_Chi_Minh" })}.`
          : buildQuotaExceededMessage(
              "AI token hôm nay",
              tokensUsed,
              dailyLimit,
              resetsAt,
              upgradePlan
            );
      return {
        allowed: false,
        tokensUsedToday: tokensUsed,
        dailyLimit,
        tokenLimitMonthly: monthlyLimit,
        effectivePlan,
        upgradePlan,
        resetsAt,
        quotaExceeded: true,
        message,
      };
    }

    return {
      allowed: true,
      tokensUsedToday: tokensUsed,
      dailyLimit,
      tokenLimitMonthly: monthlyLimit,
      effectivePlan,
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
