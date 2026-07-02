export function formatVND(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

export function getStartOfDayVN(date = new Date()): Date {
  // Translate the given UTC date to what time it is in VN, set to midnight, then translate back
  const d = new Date(date.getTime());
  d.setUTCHours(d.getUTCHours() + 7);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCHours(d.getUTCHours() - 7);
  return d;
}

export const DAILY_PC_SUBMISSION_MIN = 1;
export const DAILY_PC_SUBMISSION_MAX = 5;
export const DAILY_PC_EXERCISE_COUNT = 3;
