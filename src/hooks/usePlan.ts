"use client";

import { useMemo } from "react";
import {
  getEffectivePlan,
  getPlanFeatures,
  PLAN_LABELS,
  PLAN_BADGE_CLASSES,
  type PlanType,
  type PlanFeatures,
} from "@/lib/plan-utils";

interface UsePlanOptions {
  role?: string;
  plan?: string;
  planExpiresAt?: Date | string | null;
}

export function usePlan(options: UsePlanOptions) {
  const { role = "USER", plan = "FREE", planExpiresAt = null } = options;

  const expiresAt = useMemo(() => {
    if (!planExpiresAt) return null;
    return planExpiresAt instanceof Date
      ? planExpiresAt
      : new Date(planExpiresAt);
  }, [planExpiresAt]);

  const effectivePlan = useMemo(
    () => getEffectivePlan(role, plan, expiresAt),
    [role, plan, expiresAt]
  ) as PlanType;

  const features = useMemo(
    () => getPlanFeatures(role, plan, expiresAt),
    [role, plan, expiresAt]
  ) as PlanFeatures;

  const label = PLAN_LABELS[effectivePlan];
  const badgeClass = PLAN_BADGE_CLASSES[effectivePlan];

  const isAdmin = role === "ADMIN";
  const isFree = effectivePlan === "FREE";
  const isPro = effectivePlan === "PRO";
  const isMax = effectivePlan === "MAX";
  const isPaid = isPro || isMax;

  return {
    plan: effectivePlan,
    features,
    label,
    badgeClass,
    isAdmin,
    isFree,
    isPro,
    isMax,
    isPaid,
  };
}
