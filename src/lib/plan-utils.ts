import { UserRole } from "@prisma/client";

export type PlanType = "FREE" | "PRO" | "MAX";

export interface PlanPauseState {
  pausedPlan?: string | null;
  pausedPlanExpiresAt?: Date | null;
}

export type ReportPeriod = "day" | "week" | "month";

export interface PlanFeatures {
  // AI
  aiChatEnabled: boolean;
  aiTokenLimitMonthly: number; // tokens/month, -1 = unlimited

  // Build PC
  buildPcResultLimit: number; // max results visible/day (-1 = unlimited)
  buildPcUnlimitedSubmit: boolean;

  // Submission
  instantApproval: boolean;
  allowLateSubmit: boolean;
  lateSubmitHours: number;

  // AI Studio
  aiStudioEnabled: boolean;
  aiStudioMonthlyLimit: number; // -1 = unlimited

  // Task Manager
  vipTaskManager: boolean;

  // Workspaces
  maxWorkspaces: number;

  // Reports
  periodicReports: boolean;
  reportExportMonthlyLimit: number; // -1 = unlimited
  reportAllowedPeriods: ReportPeriod[];

  // Company Workflow (chưa triển khai UI — config sẵn cho giai đoạn sau)
  companyWorkflow: boolean;
  companyWorkflowEditLimit: number; // -1 = unlimited edits
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  FREE: {
    aiChatEnabled: true,
    aiTokenLimitMonthly: 500_000,
    buildPcResultLimit: 3,
    buildPcUnlimitedSubmit: false,
    instantApproval: false,
    allowLateSubmit: false,
    lateSubmitHours: 0,
    aiStudioEnabled: false,
    aiStudioMonthlyLimit: 0,
    vipTaskManager: false,
    maxWorkspaces: 3,
    periodicReports: false,
    reportExportMonthlyLimit: 0,
    reportAllowedPeriods: [],
    companyWorkflow: false,
    companyWorkflowEditLimit: 0,
  },
  PRO: {
    aiChatEnabled: true,
    aiTokenLimitMonthly: 15_000_000,
    buildPcResultLimit: -1,
    buildPcUnlimitedSubmit: true,
    instantApproval: true,
    allowLateSubmit: true,
    lateSubmitHours: 1,
    aiStudioEnabled: true,
    aiStudioMonthlyLimit: 20,
    vipTaskManager: true,
    maxWorkspaces: 10,
    periodicReports: true,
    reportExportMonthlyLimit: 4,
    reportAllowedPeriods: ["week"],
    companyWorkflow: true,
    companyWorkflowEditLimit: 2,
  },
  MAX: {
    aiChatEnabled: true,
    aiTokenLimitMonthly: 50_000_000,
    buildPcResultLimit: -1,
    buildPcUnlimitedSubmit: true,
    instantApproval: true,
    allowLateSubmit: true,
    lateSubmitHours: 5,
    aiStudioEnabled: true,
    aiStudioMonthlyLimit: -1,
    vipTaskManager: true,
    maxWorkspaces: 20,
    periodicReports: true,
    reportExportMonthlyLimit: -1,
    reportAllowedPeriods: ["day", "week", "month"],
    companyWorkflow: true,
    companyWorkflowEditLimit: -1,
  },
};

/** Kiểm tra limit có phải unlimited không */
export function isUnlimitedLimit(limit: number): boolean {
  return limit < 0;
}

/** Ngày reset quota hàng ngày (00:00 ngày mai, giờ VN) */
export function getNextDailyResetDate(from: Date = new Date()): Date {
  const vnMs = from.getTime() + 7 * 60 * 60 * 1000;
  const vn = new Date(vnMs);
  const tomorrowFakeUtc = new Date(
    Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() + 1, 0, 0, 0, 0)
  );
  return new Date(tomorrowFakeUtc.getTime() - 7 * 60 * 60 * 1000);
}

/** Ngày reset quota hàng tháng (00:00 ngày 1 tháng sau, giờ VN) */
export function getNextMonthlyResetDate(from: Date = new Date()): Date {
  const vnMs = from.getTime() + 7 * 60 * 60 * 1000;
  const vn = new Date(vnMs);
  const year = vn.getUTCFullYear();
  const month = vn.getUTCMonth();
  const nextMonthFakeUtc = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  return new Date(nextMonthFakeUtc.getTime() - 7 * 60 * 60 * 1000);
}

/** Format ngày reset cho thông báo UX */
export function formatQuotaResetDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

/** Thông báo chuẩn khi user chạm giới hạn quota (dùng chung client + server) */
export function buildQuotaExceededMessage(
  featureLabel: string,
  used: number,
  limit: number,
  resetsAt: Date | string,
  upgradePlan: "PRO" | "MAX" = "MAX"
): string {
  const resetLabel = formatQuotaResetDate(resetsAt);
  return `Bạn đã dùng hết ${used}/${limit} ${featureLabel}. Nâng cấp ${upgradePlan} để dùng không giới hạn, hoặc đợi reset vào ${resetLabel}.`;
}

/**
 * Lấy plan hiệu lực của user.
 * Admin luôn nhận MAX vĩnh viễn, bất kể plan field trong DB.
 * Khi trial MAX hết hạn và có gói pause, trả về gói đã pause.
 */
export function getEffectivePlan(
  role: string | UserRole,
  plan: string | PlanType,
  planExpiresAt?: Date | null,
  pauseState?: PlanPauseState
): PlanType {
  // Admin luôn là MAX
  if (role === "ADMIN") return "MAX";

  const now = new Date();
  const maxTrialExpired =
    plan === "MAX" && planExpiresAt && now > planExpiresAt;

  if (maxTrialExpired && pauseState?.pausedPlan) {
    const pausedExpires = pauseState.pausedPlanExpiresAt;
    if (pausedExpires && now > pausedExpires) {
      return "FREE";
    }
    const paused = pauseState.pausedPlan.toUpperCase();
    if (paused === "PRO" || paused === "MAX" || paused === "FREE") {
      return paused as PlanType;
    }
    return "FREE";
  }

  // Kiểm tra plan đã hết hạn chưa
  if (planExpiresAt && now > planExpiresAt) {
    return "FREE";
  }

  const p = (plan as string).toUpperCase();
  if (p === "PRO" || p === "MAX" || p === "FREE") return p as PlanType;
  return "FREE";
}

/**
 * Lấy features dựa trên plan hiệu lực.
 */
export function getPlanFeatures(
  role: string,
  plan: string,
  planExpiresAt?: Date | null,
  pauseState?: PlanPauseState
): PlanFeatures {
  const effectivePlan = getEffectivePlan(role, plan, planExpiresAt, pauseState);
  return PLAN_FEATURES[effectivePlan];
}

export const PLAN_LABELS: Record<PlanType, string> = {
  FREE: "Miễn phí",
  PRO: "Pro",
  MAX: "MAX",
};

export const PLAN_COLORS: Record<PlanType, string> = {
  FREE: "text-slate-400",
  PRO: "text-purple-400",
  MAX: "text-amber-400",
};

export const PLAN_BADGE_CLASSES: Record<PlanType, string> = {
  FREE: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  PRO: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  MAX: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};
