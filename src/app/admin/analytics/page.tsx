import { db } from "@/lib/db";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, startOfWeek, endOfWeek } from "date-fns";
import AnalyticsClient from "./analytics-client";

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // 1. Total posts this month (dùng start_at thay scheduledAt)
  const totalPostsThisMonth = await db.post.count({
    where: {
      start_at: { gte: monthStart, lte: monthEnd }
    }
  });

  // 2. Fetch all active users (bỏ trường `active` không còn trong schema)
  const users = await db.user.findMany({
    where: { role: "USER" },
    select: { id: true, name: true, avatar_url: true, email: true, department: true }
  });

  // 3. Fetch all posts (dùng start_at thay scheduledAt)
  const posts = await db.post.findMany({
    orderBy: { start_at: 'asc' },
    include: {
      checkins: {
        select: { user_id: true, status: true, submitted_at: true }
      }
    }
  });

  // Post analytics
  let totalCompanyExpectedShares = 0;
  let totalCompanyActualShares = 0;

  const postPerformance: any[] = [];
  const userPerformanceMap: Record<string, {
    total: number;
    completed: number;
    missed: number;
    name: string;
    image: string;
    department: string;
  }> = {};

  users.forEach((u) => {
    userPerformanceMap[u.id] = {
      total: 0,
      completed: 0,
      missed: 0,
      name: u.name || "Unknown",
      image: u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || "U")}`,
      department: u.department || "Other",
    };
  });

  const trendByDay: Record<string, { expected: number; actual: number }> = {};

  // Khởi tạo trend cho tuần hiện tại
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd   = endOfWeek(now,   { weekStartsOn: 1 });
  eachDayOfInterval({ start: weekStart, end: weekEnd }).forEach(day => {
    trendByDay[format(day, "yyyy-MM-dd")] = { expected: 0, actual: 0 };
  });

  posts.forEach(post => {
    const postTime = new Date(post.start_at);
    const deadline = new Date(postTime.getTime() + 24 * 60 * 60 * 1000);
    const isExpired = now > deadline;
    const dateKey   = format(postTime, "yyyy-MM-dd");

    const validCheckins = post.checkins.filter(
      s => s.status === "APPROVED" || s.status === "AUTO_APPROVED"
    );

    if (trendByDay[dateKey]) {
      trendByDay[dateKey].expected += users.length;
      trendByDay[dateKey].actual   += validCheckins.length;
    }

    if (isExpired) {
      totalCompanyExpectedShares += users.length;
      totalCompanyActualShares   += validCheckins.length;

      postPerformance.push({
        id:             post.id,
        title:          post.title,
        completionRate: users.length === 0 ? 0 : (validCheckins.length / users.length) * 100,
        expected:       users.length,
        actual:         validCheckins.length,
      });

      users.forEach(u => {
        userPerformanceMap[u.id].total++;
        // Dùng user_id thay userId
        const didCheckIn = validCheckins.some(s => s.user_id === u.id);
        if (didCheckIn) {
          userPerformanceMap[u.id].completed++;
        } else {
          userPerformanceMap[u.id].missed++;
        }
      });
    }
  });

  const companyAvg =
    totalCompanyExpectedShares === 0
      ? 0
      : (totalCompanyActualShares / totalCompanyExpectedShares) * 100;

  const worstPosts = postPerformance
    .sort((a, b) => a.completionRate - b.completionRate)
    .slice(0, 5);

  const userPerformanceList = Object.values(userPerformanceMap).map(u => ({
    ...u,
    rate: u.total === 0 ? 0 : (u.completed / u.total) * 100,
  }));

  // Department Aggregation
  const deptDataMap: Record<string, { expected: number; actual: number }> = {};
  userPerformanceList.forEach(u => {
    if (!deptDataMap[u.department]) deptDataMap[u.department] = { expected: 0, actual: 0 };
    deptDataMap[u.department].expected += u.total;
    deptDataMap[u.department].actual   += u.completed;
  });

  const departmentChartData = Object.keys(deptDataMap).map(dept => ({
    name: dept,
    rate: deptDataMap[dept].expected === 0
      ? 0
      : Math.round((deptDataMap[dept].actual / deptDataMap[dept].expected) * 100),
  }));

  const trendChartData = Object.keys(trendByDay).map(day => ({
    day:  format(new Date(day), "EEE"),
    rate: trendByDay[day].expected === 0
      ? 0
      : Math.round((trendByDay[day].actual / trendByDay[day].expected) * 100),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AnalyticsClient
        totalPostsThisMonth={totalPostsThisMonth}
        companyAvg={companyAvg}
        worstPosts={worstPosts}
        departmentChartData={departmentChartData}
        trendChartData={trendChartData}
        userPerformanceList={userPerformanceList}
      />
    </div>
  );
}
