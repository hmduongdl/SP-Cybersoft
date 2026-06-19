import { db } from "./db";

export const CACHE_TAGS = {
  POSTS_LIST: "posts-list",
  DASHBOARD_STATS: "dashboard-stats",
  ADMIN_QUEUE: "admin-queue",
  ADMIN_ANALYTICS: "admin-analytics",
} as const;

// NOTE: Removed unstable_cache wrappers because cache invalidation was unreliable
// in Next.js 16 — stale cache caused posts to disappear when switching tabs.
// All functions now hit the database directly on every request.

// ─── Dashboard ───────────────────────────────────────────

export async function getCachedTotalPostsCount() {
  return db.post.count();
}

export async function getCachedUserCompletedCount(userId: string) {
  return db.checkin.count({
    where: { user_id: userId, status: { in: ["APPROVED", "AUTO_APPROVED"] } },
  });
}

export async function getCachedRecentCheckins() {
  return db.checkin.findMany({
    take: 5,
    orderBy: { submitted_at: "desc" },
    select: {
      id: true,
      submitted_at: true,
      status: true,
      user: { select: { name: true, avatar_url: true } },
      post: { select: { title: true } },
    },
  });
}

export async function getCachedDashboardPosts(userId: string, monthKey?: string) {
  let dateFilter: { gte?: Date; lt?: Date } = {};

  // If monthKey provided, filter by that month; otherwise filter by 30-hour window (today's tasks)
  if (monthKey) {
    const [y, m] = monthKey.split("-").map(Number);
    const startOfMonth = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(y, m, 1, 0, 0, 0, 0);
    dateFilter = { gte: startOfMonth, lt: endOfMonth };
  }

  const posts = await db.post.findMany({
    where: {
      is_archived: false,
      checkins: { none: { user_id: userId } },
      ...(monthKey && { start_at: dateFilter }),
    },
    orderBy: { start_at: "desc" },
    take: monthKey ? 50 : 4, // Get more posts if filtering by month
    select: {
      id: true,
      title: true,
      thumbnail_url: true,
      start_at: true,
      url: true,
    },
  });

  // Only apply 30-hour filter if not filtering by month
  if (!monthKey) {
    const now = Date.now();
    const THIRTY_HOURS = 30 * 60 * 60 * 1000;
    return posts
      .filter(post => now - (post.start_at as unknown as Date).getTime() <= THIRTY_HOURS)
      .map(post => ({
        id: post.id,
        title: post.title,
        thumbnail_url: post.thumbnail_url,
        start_at: (post.start_at as unknown as Date).toISOString(),
        url: post.url,
      }));
  }

  return posts.map(post => ({
    id: post.id,
    title: post.title,
    thumbnail_url: post.thumbnail_url,
    start_at: (post.start_at as unknown as Date).toISOString(),
    url: post.url,
  }));
}

export async function getCachedMonthlyStats(userId: string, monthKey?: string) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();

  // Parse month key if provided (format: "YYYY-MM")
  if (monthKey) {
    const [y, m] = monthKey.split("-").map(Number);
    year = y;
    month = m - 1; // Convert to 0-indexed
  }

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 1);

  // Get check-ins for the specified month with associated post info
  const checkinsThisMonth = await db.checkin.findMany({
    where: {
      user_id: userId,
      submitted_at: { gte: startOfMonth, lt: endOfMonth },
    },
    select: {
      post_id: true,
      status: true,
    },
  });

  // Get all posts (including those outside current month that might have checkins)
  const allPosts = await db.post.findMany({
    where: { is_archived: false },
    select: { id: true, start_at: true },
  });

  // Build a set of post IDs with this month's checkins
  const postsWithCheckinsThisMonth = new Set(checkinsThisMonth.map(c => c.post_id));

  // Count completed checkins this month
  const completedThisMonth = checkinsThisMonth.filter(c =>
    c.status === "APPROVED" || c.status === "AUTO_APPROVED"
  ).length;

  // Total posts = posts in this month OR posts that have checkins this month
  const totalPostsThisMonth = allPosts.filter(post => {
    const isInMonth = post.start_at >= startOfMonth && post.start_at < endOfMonth;
    const hasCheckinsThisMonth = postsWithCheckinsThisMonth.has(post.id);
    return isInMonth || hasCheckinsThisMonth;
  }).length;

  // Pending = max(0, total - completed) to avoid negative values
  const pendingThisMonth = Math.max(0, totalPostsThisMonth - completedThisMonth);

  return { completedThisMonth, totalPostsThisMonth, pendingThisMonth };
}

// ─── Posts page ──────────────────────────────────────────

export async function getCachedPosts(userId?: string) {
  const selectFields: Record<string, any> = {
    id: true,
    title: true,
    url: true,
    thumbnail_url: true,
    start_at: true,
    team: true,
    description: true,
    allow_late_submit: true,
    is_archived: true,
    author: true,
  };
  if (userId) {
    selectFields.checkins = {
      where: { user_id: userId },
      select: { status: true },
    };
  }
  const posts = await db.post.findMany({
    orderBy: { start_at: "desc" },
    select: selectFields,
  });

  const now = Date.now();
  const THIRTY_HOURS = 30 * 60 * 60 * 1000;

  return posts.map(post => {
    // Nếu post đã quá 30h so với thời điểm start_at VÀ chưa được mở khoá nộp bù
    if (now - (post.start_at as unknown as Date).getTime() > THIRTY_HOURS && !post.allow_late_submit) {
      return { ...post, is_archived: true };
    }
    return post;
  });
}

export async function getCachedApprovedCheckins() {
  return db.checkin.findMany({
    where: { status: { in: ["APPROVED", "AUTO_APPROVED"] } },
    select: {
      id: true,
      user_id: true,
      post_id: true,
      user: { select: { id: true, name: true, avatar_url: true } },
      post: { select: { start_at: true } },
    },
  });
}

export async function getCachedUserStarData(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { hope_stars: true, used_stars_this_month: true },
  });
}

export type PostParticipant = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  submittedAt: Date;
};

export async function getCachedPostParticipants(): Promise<Record<string, PostParticipant[]>> {
  const checkins = await db.checkin.findMany({
    where: {
      status: { in: ["APPROVED", "AUTO_APPROVED"] },
      user: { is_active: true, role: { in: ["USER", "ADMIN"] } },
    },
    orderBy: { submitted_at: "asc" },
    select: {
      post_id: true,
      submitted_at: true,
      user: { select: { id: true, name: true, avatar_url: true } },
    },
  });

  const map: Record<string, PostParticipant[]> = {};
  for (const c of checkins) {
    if (!map[c.post_id]) map[c.post_id] = [];
    map[c.post_id].push({
      userId: c.user.id,
      userName: c.user.name || "Unknown",
      userAvatar: c.user.avatar_url,
      submittedAt: c.submitted_at,
    });
  }
  return map;
}

// ─── Admin Queue ─────────────────────────────────────────

export async function getCachedAllCheckins() {
  return db.checkin.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar_url: true,
          department: true,
          facebook_profile_url: true,
          trust_score: true,
        },
      },
      post: {
        select: { id: true, title: true, thumbnail_url: true, start_at: true },
      },
    },
    orderBy: { submitted_at: "desc" },
  });
}

// ─── Admin Analytics ─────────────────────────────────────

export async function getCachedAnalyticsPostsThisMonth(monthStart: Date, monthEnd: Date) {
  return db.post.count({
    where: { start_at: { gte: monthStart, lte: monthEnd } },
  });
}

export async function getCachedAnalyticsUsers() {
  return db.user.findMany({
    where: { role: { in: ["USER", "ADMIN"] }, is_active: true },
    select: { id: true, name: true, avatar_url: true, email: true, department: true },
  });
}

export async function getCachedAnalyticsPosts() {
  return db.post.findMany({
    orderBy: { start_at: "asc" },
    select: {
      id: true,
      title: true,
      start_at: true,
      checkins: { select: { user_id: true, status: true, submitted_at: true } },
    },
  });
}

// ─── API: Posts ──────────────────────────────────────────

export async function getCachedPostsApi() {
  const posts = await db.post.findMany({
    orderBy: { start_at: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      url: true,
      thumbnail_url: true,
      start_at: true,
      is_archived: true,
      allow_late_submit: true,
      team: true,
      author: true,
      _count: { select: { checkins: true } },
    },
  });

  const now = Date.now();
  const THIRTY_HOURS = 30 * 60 * 60 * 1000;

  return posts.map(post => {
    if (now - (post.start_at as unknown as Date).getTime() > THIRTY_HOURS && !post.allow_late_submit) {
      return { ...post, is_archived: true };
    }
    return post;
  });
}

export async function getCachedTotalEmployees() {
  return db.user.count({
    where: { role: { in: ["USER", "ADMIN"] }, is_active: true },
  });
}
