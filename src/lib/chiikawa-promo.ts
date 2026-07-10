/** Chiikawa MAX trial promo — sự kiện tới hết 13/07/2026 GMT+7 */

export const CHIIKAWA_PROMO_START = new Date("2026-07-10T00:00:00+07:00");
export const CHIIKAWA_PROMO_END = new Date("2026-07-13T23:59:59.999+07:00");
export const CHIIKAWA_TRIAL_DAYS = 7;

export const CHIIKAWA_PROMO_DISMISS_KEY = "sp_chiikawa_promo_dismissed_until";

export function isChiikawaPromoEligiblePlan(plan: string): boolean {
  return plan === "FREE" || plan === "PRO";
}

/** Admin luôn được xem modal để preview (không phụ thuộc gói / đã nhận). */
export function canSeeChiikawaPromo(
  role: string,
  effectivePlan: string,
  claimed: boolean
): boolean {
  if (role === "ADMIN") return true;
  return !claimed && isChiikawaPromoEligiblePlan(effectivePlan);
}

export function isChiikawaPromoEventActive(now = new Date()): boolean {
  return now >= CHIIKAWA_PROMO_START && now <= CHIIKAWA_PROMO_END;
}

export function getChiikawaTrialExpiresAt(from = new Date()): Date {
  const expiresAt = new Date(from);
  expiresAt.setDate(expiresAt.getDate() + CHIIKAWA_TRIAL_DAYS);
  return expiresAt;
}

/** Cuối ngày hiện tại theo múi giờ GMT+7 (Asia/Bangkok) */
export function getEndOfTodayGMT7(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  return new Date(`${year}-${month}-${day}T23:59:59.999+07:00`);
}

export function isChiikawaPromoDismissedForToday(): boolean {
  if (typeof window === "undefined") return false;
  const until = localStorage.getItem(CHIIKAWA_PROMO_DISMISS_KEY);
  if (!until) return false;
  return new Date() < new Date(until);
}

export function dismissChiikawaPromoForToday(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    CHIIKAWA_PROMO_DISMISS_KEY,
    getEndOfTodayGMT7().toISOString()
  );
}
