"use client";

import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import { buildQuotaExceededMessage } from "@/lib/plan-utils";

interface QuotaLimitNoticeProps {
  featureLabel: string;
  used: number;
  limit: number;
  resetsAt?: string | Date;
  upgradePlan?: "PRO" | "MAX";
  /** Ghi đè thông báo mặc định */
  message?: string;
  /** Banner nhỏ phía trên */
  compact?: boolean;
  /** Chặn workspace — hiển thị full panel tại điểm chạm */
  blocked?: boolean;
}

export function QuotaLimitNotice({
  featureLabel,
  used,
  limit,
  resetsAt,
  upgradePlan = "MAX",
  message,
  compact = false,
  blocked = false,
}: QuotaLimitNoticeProps) {
  const body =
    message ??
    (resetsAt
      ? buildQuotaExceededMessage(featureLabel, used, limit, resetsAt, upgradePlan)
      : `Bạn đã dùng hết ${used}/${limit} ${featureLabel} tháng này. Nâng cấp ${upgradePlan} để dùng không giới hạn.`);

  const upgradeButton = (
    <Link
      href="/pricing"
      className={
        compact
          ? "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:brightness-105 transition-all"
          : "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg hover:brightness-105 transition-all"
      }
    >
      <Sparkles className={compact ? "h-3 w-3" : "h-4 w-4"} />
      Nâng cấp {upgradePlan}
    </Link>
  );

  if (compact) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="flex-1 min-w-[200px] leading-relaxed">{body}</p>
        {upgradeButton}
      </div>
    );
  }

  if (blocked) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-5 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/8 to-orange-500/5 px-6 py-10 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 ring-4 ring-amber-500/10">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
        </div>
        <div className="max-w-md space-y-2">
          <p className="font-manrope text-base font-bold text-on-surface">
            Đã hết lượt {featureLabel}
          </p>
          <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
        </div>
        {upgradeButton}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/8 px-6 py-8 text-center max-w-md mx-auto">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
        <AlertTriangle className="h-6 w-6 text-amber-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-on-background">Đã chạm giới hạn {featureLabel}</p>
        <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">{body}</p>
      </div>
      {upgradeButton}
    </div>
  );
}

interface QuotaUsageBarProps {
  label: string;
  used: number;
  limit: number;
  className?: string;
}

/** Thanh tiến độ quota — hiển thị trước khi chạm giới hạn */
export function QuotaUsageBar({ label, used, limit, className }: QuotaUsageBarProps) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isWarning = pct >= 80;

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-medium text-on-muted font-inter">{label}</span>
        <span
          className={`text-xs font-bold font-inter tabular-nums ${
            isWarning ? "text-amber-600 dark:text-amber-400" : "text-on-muted"
          }`}
        >
          {used}/{limit}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-container overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isWarning
              ? "bg-gradient-to-r from-amber-500 to-orange-500"
              : "bg-gradient-to-r from-primary/70 to-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
