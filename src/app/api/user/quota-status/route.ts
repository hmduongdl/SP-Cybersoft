import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getEffectivePlan, getNextDailyResetDate, PLAN_FEATURES } from "@/lib/plan-utils";
import { getPlanPauseState, PLAN_PAUSE_SELECT } from "@/lib/plan-pause";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        ...PLAN_PAUSE_SELECT,
        tokens_used_today: true,
        last_token_reset: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const effectivePlan = getEffectivePlan(
      user.role,
      user.plan,
      user.plan_expires_at,
      getPlanPauseState(user)
    );
    const monthlyLimit = PLAN_FEATURES[effectivePlan].aiTokenLimitMonthly;
    const dailyLimit = Math.floor(monthlyLimit / 30);

    const now = new Date();
    const lastReset = new Date(user.last_token_reset);
    const isNewDay =
      now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
      now.getUTCMonth() !== lastReset.getUTCMonth() ||
      now.getUTCDate() !== lastReset.getUTCDate();

    const tokensUsed = isNewDay ? 0 : (user.tokens_used_today ?? 0);
    const usagePercent =
      dailyLimit > 0 ? Math.min(100, Math.round((tokensUsed / dailyLimit) * 100)) : 0;

    const upgradePlan = effectivePlan === "FREE" ? "PRO" : "MAX";
    const quotaExceeded = dailyLimit > 0 && tokensUsed >= dailyLimit;

    return NextResponse.json({
      daily_token_limit: dailyLimit,
      tokens_used_today: tokensUsed,
      usage_percent: usagePercent,
      token_limit_monthly: monthlyLimit,
      effective_plan: effectivePlan,
      upgrade_plan: upgradePlan,
      resets_at: getNextDailyResetDate().toISOString(),
      quota_exceeded: quotaExceeded,
    });
  } catch (error: unknown) {
    console.error("Quota status error:", error);
    return NextResponse.json(
      { error: "Không thể lấy thông tin hạn mức." },
      { status: 500 }
    );
  }
}
