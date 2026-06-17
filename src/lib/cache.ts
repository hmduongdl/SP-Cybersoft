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
      user: { select: { name: true, avatar_url: true } },
      post: { select: { title: true } },
    },
  });
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
  };
  if (userId) {
    selectFields.checkins = {
      where: { user_id: userId },
      select: { status: true },
    };
  }
  return db.post.findMany({
    where: { is_archived: false },
    orderBy: { start_at: "asc" },
    select: selectFields,
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
    where: { role: "USER" },
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
  return db.post.findMany({
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
      _count: { select: { checkins: true } },
    },
  });
}

export async function getCachedTotalEmployees() {
  return db.user.count({
    where: { role: "USER" },
  });
}
