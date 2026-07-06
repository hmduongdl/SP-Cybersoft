"use client";

import React from "react";
import { Lock } from "lucide-react";
import Link from "next/link";
import type { PlanType } from "@/lib/plan-utils";

interface PlanGateProps {
  /** Các plan được phép dùng tính năng này */
  requiredPlan: PlanType | PlanType[];
  /** Plan hiệu lực hiện tại của user */
  currentPlan: PlanType;
  children: React.ReactNode;
  /** Custom message khi bị khóa */
  lockedMessage?: string;
  /** Render dạng overlay blur thay vì ẩn hoàn toàn */
  renderBlur?: boolean;
}

const PLAN_RANK: Record<PlanType, number> = { FREE: 0, PRO: 1, MAX: 2 };

export function PlanGate({
  requiredPlan,
  currentPlan,
  children,
  lockedMessage,
  renderBlur = false,
}: PlanGateProps) {
  const required = Array.isArray(requiredPlan) ? requiredPlan : [requiredPlan];

  const minRequiredRank = Math.min(...required.map((p) => PLAN_RANK[p]));
  const currentRank = PLAN_RANK[currentPlan];

  const hasAccess = currentRank >= minRequiredRank;

  if (hasAccess) return <>{children}</>;

  const minPlan = required.reduce((min, p) =>
    PLAN_RANK[p] < PLAN_RANK[min] ? p : min
  );

  const planLabel = minPlan === "PRO" ? "Pro" : "MAX";

  if (renderBlur) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-40 blur-[1.5px]">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
          <div className="flex flex-col items-center gap-2 bg-surface-container/90 dark:bg-[#1a1a2e]/90 backdrop-blur-md border border-outline-variant rounded-2xl px-6 py-5 shadow-xl max-w-xs text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-on-background">
              {lockedMessage ?? `Yêu cầu gói ${planLabel}`}
            </p>
            <p className="text-xs text-on-surface-variant">
              Nâng cấp để mở khóa tính năng này
            </p>
            <Link
              href="/pricing"
              className="mt-1 bg-primary text-on-primary text-xs font-bold px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
            >
              Xem gói {planLabel}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        <Lock className="w-7 h-7 text-primary" />
      </div>
      <div>
        <p className="text-base font-semibold text-on-background">
          {lockedMessage ?? `Tính năng này yêu cầu gói ${planLabel}`}
        </p>
        <p className="text-sm text-on-surface-variant mt-1">
          Nâng cấp tài khoản để trải nghiệm đầy đủ
        </p>
      </div>
      <Link
        href="/pricing"
        className="bg-primary text-on-primary text-sm font-semibold px-6 py-2.5 rounded-full hover:opacity-90 transition-opacity hover:-translate-y-0.5 hover:shadow-lg"
      >
        Nâng cấp lên {planLabel}
      </Link>
    </div>
  );
}

/** Badge hiển thị plan hiện tại của user */
export function PlanBadge({ plan }: { plan: PlanType }) {
  const configs: Record<PlanType, { label: string; className: string }> = {
    FREE: {
      label: "Free",
      className: "bg-slate-500/15 text-slate-500 border-slate-500/30 dark:text-slate-400",
    },
    PRO: {
      label: "Pro",
      className: "bg-purple-500/15 text-purple-600 border-purple-500/30 dark:text-purple-400",
    },
    MAX: {
      label: "MAX",
      className: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
    },
  };

  const config = configs[plan];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${config.className}`}
    >
      {config.label}
    </span>
  );
}
