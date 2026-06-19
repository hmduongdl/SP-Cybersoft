"use server";

import { auth } from "@/auth";
import { getCachedMonthlyStats, getCachedDashboardPosts } from "@/lib/cache";

export async function fetchMonthlyStats(monthKey: string) {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return { completedThisMonth: 0, totalPostsThisMonth: 0, pendingThisMonth: 0, dashboardPosts: [] };
    }

    try {
        const [stats, dashboardPosts] = await Promise.all([
            getCachedMonthlyStats(userId, monthKey),
            getCachedDashboardPosts(userId, monthKey),
        ]);
        return {
            completedThisMonth: stats.completedThisMonth,
            totalPostsThisMonth: stats.totalPostsThisMonth,
            pendingThisMonth: stats.pendingThisMonth,
            dashboardPosts,
        };
    } catch (error) {
        console.error("Failed to fetch monthly stats:", error);
        return { completedThisMonth: 0, totalPostsThisMonth: 0, pendingThisMonth: 0, dashboardPosts: [] };
    }
}
