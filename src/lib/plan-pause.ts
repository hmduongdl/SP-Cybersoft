import { UserPlan } from "@prisma/client";
import { db } from "@/lib/db";
import { getEffectivePlan, type PlanPauseState } from "@/lib/plan-utils";

export const PLAN_PAUSE_SELECT = {
  role: true,
  plan: true,
  plan_expires_at: true,
  paused_plan: true,
  paused_plan_expires_at: true,
} as const;

export type { PlanPauseState };

export function getPlanPauseState(user: {
  paused_plan?: string | null;
  paused_plan_expires_at?: Date | null;
}): PlanPauseState | undefined {
  if (!user.paused_plan) return undefined;
  return {
    pausedPlan: user.paused_plan,
    pausedPlanExpiresAt: user.paused_plan_expires_at,
  };
}

export function shouldResumePausedPlan(user: {
  role: string;
  plan: string;
  plan_expires_at: Date | null;
  paused_plan: string | null;
}): boolean {
  if (user.role === "ADMIN") return false;
  if (!user.paused_plan) return false;
  if (user.plan !== "MAX") return false;
  if (!user.plan_expires_at) return false;
  return new Date() > user.plan_expires_at;
}

/** Khôi phục gói đã pause sau khi hết hạn trial MAX. */
export async function resumePausedPlanIfNeeded(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: PLAN_PAUSE_SELECT,
  });

  if (!user || !shouldResumePausedPlan(user)) return;

  const resumedPlan = user.paused_plan as UserPlan;

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        plan: resumedPlan,
        plan_expires_at: user.paused_plan_expires_at,
        paused_plan: null,
        paused_plan_expires_at: null,
      },
    });

    await tx.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: resumedPlan.toLowerCase(),
        expiresAt: user.paused_plan_expires_at,
      },
      update: {
        plan: resumedPlan.toLowerCase(),
        expiresAt: user.paused_plan_expires_at,
      },
    });
  });
}

export async function getResolvedUserPlan(userId: string) {
  await resumePausedPlanIfNeeded(userId);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: PLAN_PAUSE_SELECT,
  });

  if (!user) return null;

  return {
    user,
    effectivePlan: getEffectivePlan(
      user.role,
      user.plan,
      user.plan_expires_at,
      getPlanPauseState(user)
    ),
  };
}
