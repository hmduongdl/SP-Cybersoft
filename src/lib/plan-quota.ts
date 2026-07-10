import { db } from "@/lib/db";
import {
  buildQuotaExceededMessage,
  getEffectivePlan,
  getNextMonthlyResetDate,
  isUnlimitedLimit,
  PLAN_FEATURES,
  type PlanType,
  type ReportPeriod,
} from "@/lib/plan-utils";
import {
  getPlanPauseState,
  PLAN_PAUSE_SELECT,
  resumePausedPlanIfNeeded,
} from "@/lib/plan-pause";

export type QuotaFeature = "ai_studio" | "report_export";

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  isUnlimited: boolean;
  resetsAt: Date;
  effectivePlan: PlanType;
  message?: string;
  upgradePlan?: "PRO" | "MAX";
}

const USAGE_SELECT = {
  ...PLAN_PAUSE_SELECT,
  ai_studio_uses_month: true,
  report_exports_month: true,
  usage_month_reset_at: true,
} as const;

async function getUserWithUsage(userId: string) {
  await resumePausedPlanIfNeeded(userId);
  return db.user.findUnique({
    where: { id: userId },
    select: USAGE_SELECT,
  });
}

function resolveEffectivePlan(user: {
  role: string;
  plan: string;
  plan_expires_at: Date | null;
  paused_plan: string | null;
  paused_plan_expires_at: Date | null;
}): PlanType {
  return getEffectivePlan(
    user.role,
    user.plan,
    user.plan_expires_at,
    getPlanPauseState(user)
  );
}

/** Reset counters khi sang tháng mới (theo múi giờ VN) */
async function ensureMonthlyReset(
  userId: string,
  usageMonthResetAt: Date
): Promise<void> {
  const now = new Date();
  const resetAt = getNextMonthlyResetDate(
    new Date(usageMonthResetAt.getTime() - 1)
  );

  if (now >= resetAt) {
    await db.user.update({
      where: { id: userId },
      data: {
        ai_studio_uses_month: 0,
        report_exports_month: 0,
        usage_month_reset_at: now,
      },
    });
  }
}

export { buildQuotaExceededMessage };

export async function checkAiStudioQuota(
  userId: string
): Promise<QuotaCheckResult> {
  const user = await getUserWithUsage(userId);
  if (!user) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      isUnlimited: false,
      resetsAt: getNextMonthlyResetDate(),
      effectivePlan: "FREE",
      message: "Không tìm thấy người dùng.",
    };
  }

  await ensureMonthlyReset(userId, user.usage_month_reset_at);

  const effectivePlan = resolveEffectivePlan(user);
  const features = PLAN_FEATURES[effectivePlan];
  const limit = features.aiStudioMonthlyLimit;
  const isUnlimited = isUnlimitedLimit(limit);

  const fresh = await db.user.findUnique({
    where: { id: userId },
    select: { ai_studio_uses_month: true },
  });
  const used = fresh?.ai_studio_uses_month ?? 0;
  const resetsAt = getNextMonthlyResetDate();

  if (!features.aiStudioEnabled) {
    return {
      allowed: false,
      used,
      limit,
      isUnlimited,
      resetsAt,
      effectivePlan,
      upgradePlan: "PRO",
      message: "AI Studio yêu cầu gói PRO trở lên.",
    };
  }

  if (isUnlimited || used < limit) {
    return { allowed: true, used, limit, isUnlimited, resetsAt, effectivePlan };
  }

  return {
    allowed: false,
    used,
    limit,
    isUnlimited,
    resetsAt,
    effectivePlan,
    upgradePlan: "MAX",
    message: buildQuotaExceededMessage("lượt AI Studio tháng này", used, limit, resetsAt, "MAX"),
  };
}

export async function recordAiStudioUse(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { ai_studio_uses_month: { increment: 1 } },
  });
}

export async function checkReportExportQuota(
  userId: string,
  period: ReportPeriod
): Promise<QuotaCheckResult> {
  const user = await getUserWithUsage(userId);
  if (!user) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      isUnlimited: false,
      resetsAt: getNextMonthlyResetDate(),
      effectivePlan: "FREE",
      message: "Không tìm thấy người dùng.",
    };
  }

  await ensureMonthlyReset(userId, user.usage_month_reset_at);

  const effectivePlan = resolveEffectivePlan(user);
  const features = PLAN_FEATURES[effectivePlan];
  const limit = features.reportExportMonthlyLimit;
  const isUnlimited = isUnlimitedLimit(limit);
  const resetsAt = getNextMonthlyResetDate();

  if (!features.periodicReports) {
    return {
      allowed: false,
      used: 0,
      limit,
      isUnlimited,
      resetsAt,
      effectivePlan,
      upgradePlan: "PRO",
      message: "Báo cáo định kỳ yêu cầu gói PRO trở lên.",
    };
  }

  if (!features.reportAllowedPeriods.includes(period)) {
    const periodLabel =
      period === "day" ? "ngày" : period === "week" ? "tuần" : "tháng";
    return {
      allowed: false,
      used: 0,
      limit,
      isUnlimited,
      resetsAt,
      effectivePlan,
      upgradePlan: "MAX",
      message: `Gói ${effectivePlan} chỉ hỗ trợ báo cáo theo tuần. Nâng cấp MAX để xuất báo cáo theo ${periodLabel}.`,
    };
  }

  const fresh = await db.user.findUnique({
    where: { id: userId },
    select: { report_exports_month: true },
  });
  const used = fresh?.report_exports_month ?? 0;

  if (isUnlimited || used < limit) {
    return { allowed: true, used, limit, isUnlimited, resetsAt, effectivePlan };
  }

  return {
    allowed: false,
    used,
    limit,
    isUnlimited,
    resetsAt,
    effectivePlan,
    upgradePlan: "MAX",
    message: buildQuotaExceededMessage("lần xuất báo cáo tháng này", used, limit, resetsAt, "MAX"),
  };
}

export async function recordReportExport(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { report_exports_month: { increment: 1 } },
  });
}

/** Trả về quota response chuẩn cho API 403 */
export function quotaExceededResponse(result: QuotaCheckResult) {
  return {
    error: result.message,
    quotaExceeded: true,
    used: result.used,
    limit: result.limit,
    resetsAt: result.resetsAt.toISOString(),
    upgradePlan: result.upgradePlan ?? "MAX",
    effectivePlan: result.effectivePlan,
  };
}

/** Snapshot quota cho client UI */
export async function getFeatureQuotaStatus(userId: string) {
  const [aiStudio, reportExport] = await Promise.all([
    checkAiStudioQuota(userId),
    checkReportExportQuota(userId, "week"),
  ]);

  return {
    aiStudio: {
      used: aiStudio.used,
      limit: aiStudio.limit,
      isUnlimited: aiStudio.isUnlimited,
      resetsAt: aiStudio.resetsAt.toISOString(),
    },
    reportExport: {
      used: reportExport.used,
      limit: reportExport.limit,
      isUnlimited: reportExport.isUnlimited,
      resetsAt: reportExport.resetsAt.toISOString(),
    },
  };
}
