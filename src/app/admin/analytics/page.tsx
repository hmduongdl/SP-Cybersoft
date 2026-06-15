import { db } from "@/lib/db";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, startOfWeek, endOfWeek, subDays } from "date-fns";
import AnalyticsClient from "./analytics-client";

export default async function AnalyticsPage() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // 1. Total posts this month
  const totalPostsThisMonth = await db.post.count({
    where: {
      scheduledAt: { gte: monthStart, lte: monthEnd }
    }
  });

  // 2. Fetch all active users
  const users = await db.user.findMany({
    where: { role: "USER", active: true },
    select: { id: true, name: true, image: true, email: true }
  });

  // 3. Fetch all posts that have passed their deadline (24h after scheduledAt)
  const posts = await db.post.findMany({
    orderBy: { scheduledAt: 'asc' },
    include: {
      submissions: {
        select: { userId: true, status: true, submittedAt: true }
      }
    }
  });

  // Post analytics
  let totalCompanyExpectedShares = 0;
  let totalCompanyActualShares = 0;

  const postPerformance: any[] = [];
  const userPerformanceMap: Record<string, { total: number, completed: number, missed: number, name: string, image: string, department: string }> = {};

  // Mock departments
  const departments = ["Marketing", "Tech", "HR", "Sales"];

  users.forEach((u, i) => {
    userPerformanceMap[u.id] = {
      total: 0,
      completed: 0,
      missed: 0,
      name: u.name || "Unknown",
      image: u.image || `https://ui-avatars.com/api/?name=${u.name || "U"}`,
      department: departments[i % departments.length]
    };
  });

  const trendByDay: Record<string, { expected: number, actual: number }> = {};
  
  // Initialize trend for current week
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  eachDayOfInterval({ start: weekStart, end: weekEnd }).forEach(day => {
    trendByDay[format(day, "yyyy-MM-dd")] = { expected: 0, actual: 0 };
  });

  posts.forEach(post => {
    const postTime = new Date(post.scheduledAt);
    const deadline = new Date(postTime.getTime() + 24 * 60 * 60 * 1000);
    const isExpired = now > deadline;
    const dateKey = format(postTime, "yyyy-MM-dd");

    const validSubmissions = post.submissions.filter(s => s.status === "APPROVED" || s.status === "AUTO_VERIFIED");
    
    // Trend logic
    if (trendByDay[dateKey]) {
      trendByDay[dateKey].expected += users.length;
      trendByDay[dateKey].actual += validSubmissions.length;
    }

    if (isExpired) {
      totalCompanyExpectedShares += users.length;
      totalCompanyActualShares += validSubmissions.length;

      postPerformance.push({
        id: post.id,
        title: post.title,
        completionRate: (validSubmissions.length / users.length) * 100,
        expected: users.length,
        actual: validSubmissions.length
      });

      users.forEach(u => {
        userPerformanceMap[u.id].total++;
        const didCheckIn = validSubmissions.some(s => s.userId === u.id);
        if (didCheckIn) {
          userPerformanceMap[u.id].completed++;
        } else {
          userPerformanceMap[u.id].missed++;
        }
      });
    }
  });

  // Calculate Company Avg
  const companyAvg = totalCompanyExpectedShares === 0 ? 0 : (totalCompanyActualShares / totalCompanyExpectedShares) * 100;

  // Worst performing posts
  const worstPosts = postPerformance.sort((a, b) => a.completionRate - b.completionRate).slice(0, 5);

  // User Performance List
  const userPerformanceList = Object.values(userPerformanceMap).map(u => ({
    ...u,
    rate: u.total === 0 ? 0 : (u.completed / u.total) * 100
  }));

  // Department Aggregation for Bar Chart
  const deptDataMap: Record<string, { expected: number, actual: number }> = {};
  userPerformanceList.forEach(u => {
    if (!deptDataMap[u.department]) deptDataMap[u.department] = { expected: 0, actual: 0 };
    deptDataMap[u.department].expected += u.total;
    deptDataMap[u.department].actual += u.completed;
  });

  const departmentChartData = Object.keys(deptDataMap).map(dept => ({
    name: dept,
    rate: deptDataMap[dept].expected === 0 ? 0 : Math.round((deptDataMap[dept].actual / deptDataMap[dept].expected) * 100)
  }));

  const trendChartData = Object.keys(trendByDay).map(day => ({
    day: format(new Date(day), "EEE"), // e.g., Mon, Tue
    rate: trendByDay[day].expected === 0 ? 0 : Math.round((trendByDay[day].actual / trendByDay[day].expected) * 100)
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
