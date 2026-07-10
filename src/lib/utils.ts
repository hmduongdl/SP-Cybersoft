import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** parseISO an toàn — tránh crash render khi due_date không hợp lệ. */
export function safeParseISO(value?: string | null): Date | null {
  if (!value) return null;
  try {
    const d = parseISO(value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Lấy deadline của bài viết theo giờ Việt Nam (UTC+7).
 *
 * Rule:
 * - Mặc định: deadline = 12:00 trưa của ngày hôm sau.
 * - Nếu `start_at` sau 18:00 (VN time) => deadline = 15:00 chiều của ngày hôm sau.
 *
 * Lưu ý: "sau 18h" hiểu là `hour > 18` (18:00 đúng sẽ vẫn dùng 12:00 trưa).
 */
export function getPostDeadline(startAt: Date | string | number): Date {
  const d = new Date(startAt);
  // Shift sang VN để đọc giờ/phút "đúng local VN"
  const vnMs = d.getTime() + 7 * 60 * 60 * 1000;
  const vnTime = new Date(vnMs);

  const year = vnTime.getUTCFullYear();
  const month = vnTime.getUTCMonth();
  const date = vnTime.getUTCDate();

  const hour = vnTime.getUTCHours();
  // Nếu start_at từ 18:00 trở đi (18:xx) => deadline 15:00 ngày hôm sau
  const isAfter18 = hour >= 18;

  const deadlineHour = isAfter18 ? 15 : 12;

  // Dựng "deadline VN" dưới dạng fake-UTC, rồi trừ lại offset để ra Date đúng thực tế.
  const deadlineVnFakeUtc = new Date(Date.UTC(year, month, date + 1, deadlineHour, 0, 0, 0));
  return new Date(deadlineVnFakeUtc.getTime() - 7 * 60 * 60 * 1000);
}

export interface LateSubmitPlanFeatures {
  allowLateSubmit: boolean;
  lateSubmitHours: number;
}

/** Deadline + giờ nộp muộn theo gói (PRO +1h, MAX +5h). */
export function getSubmitWindowEnd(
  startAt: Date | string | number,
  features: LateSubmitPlanFeatures
): Date {
  const deadline = getPostDeadline(startAt);
  if (!features.allowLateSubmit || features.lateSubmitHours <= 0) {
    return deadline;
  }
  return new Date(deadline.getTime() + features.lateSubmitHours * 60 * 60 * 1000);
}

export function canSubmitWithinPlanWindow(
  startAt: Date | string | number,
  features: LateSubmitPlanFeatures,
  adminAllowLateSubmit: boolean
): boolean {
  if (adminAllowLateSubmit) return true;
  return Date.now() <= getSubmitWindowEnd(startAt, features).getTime();
}
