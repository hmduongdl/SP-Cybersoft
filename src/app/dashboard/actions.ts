"use server";

import { auth } from "@/auth";
import { getCachedMonthlyStats } from "@/lib/cache";

export async function fetchMonthlyStats(monthKey: string) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { completedThisMonth: 0, totalPostsThisMonth: 0, pendingThisMonth: 0 };
  }

  try {
    const stats = await getCachedMonthlyStats(userId, monthKey);
    return stats;
  } catch (error) {
    console.error("Failed to fetch monthly stats:", error);
    return { completedThisMonth: 0, totalPostsThisMonth: 0, pendingThisMonth: 0 };
  }
}
