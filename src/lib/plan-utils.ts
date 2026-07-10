import { UserRole } from "@prisma/client";

export type PlanType = "FREE" | "PRO" | "MAX";

export interface PlanPauseState {
  pausedPlan?: string | null;
  pausedPlanExpiresAt?: Date | null;
}

export interface PlanFeatures {
  // AI
  aiChatEnabled: boolean;
  aiTokenLimitMonthly: number; // tokens/month, -1 = unlimited

  // Build PC
  buildPcUnlimited: boolean;     // unlimited submits + instant result
  buildPcResultLimit: number;    // max results visible (-1 = unlimited)

  // Submission
  instantApproval: boolean;      // kết quả tức thì vs chờ admin
  allowLateSubmit: boolean;      // có cho nộp muộn không
  lateSubmitHours: number;       // số giờ muộn tối đa

  // AI Studio
  aiStudioEnabled: boolean;

  // Task Manager
  vipTaskManager: boolean;

  // Workspaces
  maxWorkspaces: number;

  // Reports
  periodicReports: boolean;

  // Company workflow
  companyWorkflow: boolean;
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  FREE: {
    aiChatEnabled: true,
    aiTokenLimitMonthly: 500000, // ~500K tokens (giới hạn)
    buildPcUnlimited: false,
    buildPcResultLimit: 3,
    instantApproval: false,
    allowLateSubmit: false,
    lateSubmitHours: 0,
    aiStudioEnabled: false,
    vipTaskManager: false,
    maxWorkspaces: 3,
    periodicReports: false,
    companyWorkflow: false,
  },
  PRO: {
    aiChatEnabled: true,
    aiTokenLimitMonthly: 15_000_000, // 15M tokens
    buildPcUnlimited: true,
    buildPcResultLimit: -1,
    instantApproval: true,
    allowLateSubmit: true,
    lateSubmitHours: 1,
    aiStudioEnabled: true,
    vipTaskManager: true,
    maxWorkspaces: 10,
    periodicReports: false,
    companyWorkflow: false,
  },
  MAX: {
    aiChatEnabled: true,
    aiTokenLimitMonthly: 50_000_000, // 50M tokens
    buildPcUnlimited: true,
    buildPcResultLimit: -1,
    instantApproval: true,
    allowLateSubmit: true,
    lateSubmitHours: 5,
    aiStudioEnabled: true,
    vipTaskManager: true,
    maxWorkspaces: 20,
    periodicReports: true,
    companyWorkflow: true,
  },
};

/**
 * Lấy plan hiệu lực của user.
 * Admin luôn nhận MAX vĩnh viễn, bất kể plan field trong DB.
 * Khi trial MAX hết hạn và có gói pause (vd. PRO Chiikawa), trả về gói đã pause.
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
