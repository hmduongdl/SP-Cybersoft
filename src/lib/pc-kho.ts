export function formatVND(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

export function getStartOfDayVN(date = new Date()): Date {
  const vn = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  return new Date(Date.UTC(vn.getFullYear(), vn.getMonth(), vn.getDate()));
}

export const DAILY_PC_SUBMISSION_MIN = 1;
export const DAILY_PC_SUBMISSION_MAX = 5;
export const DAILY_PC_EXERCISE_COUNT = 3;
