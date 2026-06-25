import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Lấy deadline của bài viết: 12h trưa của ngày hôm sau (theo giờ Việt Nam UTC+7)
 */
export function getPostDeadline(startAt: Date | string | number): Date {
  const d = new Date(startAt);
  const utcMs = d.getTime();
  const vnTime = new Date(utcMs + 7 * 60 * 60 * 1000);
  
  const year = vnTime.getUTCFullYear();
  const month = vnTime.getUTCMonth();
  const date = vnTime.getUTCDate();
  
  const deadlineVnFakeUtc = new Date(Date.UTC(year, month, date + 1, 12, 0, 0, 0));
  return new Date(deadlineVnFakeUtc.getTime() - 7 * 60 * 60 * 1000);
}
