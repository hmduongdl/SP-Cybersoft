import { unstable_cache } from "next/cache";
import { db } from "./db";

export const CACHE_TAGS = {
  POSTS_LIST: "posts-list",
  DASHBOARD_STATS: "dashboard-stats",
  ADMIN_QUEUE: "admin-queue",
  ADMIN_ANALYTICS: "admin-analytics",
} as const;

const ONE_MINUTE = 60;
const ONE_HOUR = 3600;

// ─── Dashboard ───────────────────────────────────────────

export const getCachedTotalPostsCount = unstable_cache(
  async () => db.post.count(),
  ["total-posts-count"],
  { tags: [CACHE_TAGS.DASHBOARD_STATS], revalidate: ONE_MINUTE }
);

export const getCachedUserCompletedCount = unstable_cache(
  async (userId: string) =>
    db.checkin.count({
      where: { user_id: userId, status: { in: ["APPROVED", "AUTO_APPROVED"] } },
    }),
  ["user-completed-count"],
  { tags: [CACHE_TAGS.DASHBOARD_STATS], revalidate: ONE_MINUTE }
);

export const getCachedRecentCheckins = unstable_cache(
  async () =>
    db.checkin.findMany({
      take: 5,
      orderBy: { submitted_at: "desc" },
      select: {
        id: true,
        submitted_at: true,
        user: { select: { name: true, avatar_url: true } },
        post: { select: { title: true } },
      },
    }),
  ["recent-checkins"],
  { tags: [CACHE_TAGS.DASHBOARD_STATS], revalidate: ONE_MINUTE }
);

// ─── Posts page ──────────────────────────────────────────

export const getCachedPosts = unstable_cache(
  async (userId?: string) => {
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
  },
  ["posts-page"],
  { tags: [CACHE_TAGS.POSTS_LIST], revalidate: ONE_MINUTE }
);

export const getCachedApprovedCheckins = unstable_cache(
  async () =>
    db.checkin.findMany({
      where: { status: { in: ["APPROVED", "AUTO_APPROVED"] } },
      select: {
        id: true,
        user_id: true,
        post_id: true,
        user: { select: { id: true, name: true, avatar_url: true } },
        post: { select: { start_at: true } },
      },
    }),
  ["approved-checkins"],
  { tags: [CACHE_TAGS.POSTS_LIST], revalidate: ONE_MINUTE }
);

export const getCachedUserStarData = unstable_cache(
  async (userId: string) =>
    db.user.findUnique({
      where: { id: userId },
      select: { hope_stars: true, used_stars_this_month: true },
    }),
  ["user-star-data"],
  { tags: [CACHE_TAGS.POSTS_LIST, CACHE_TAGS.DASHBOARD_STATS], revalidate: ONE_MINUTE }
);

// ─── Admin Queue ─────────────────────────────────────────

export const getCachedAllCheckins = unstable_cache(
  async () =>
    db.checkin.findMany({
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
    }),
  ["admin-queue-all-checkins"],
  { tags: [CACHE_TAGS.ADMIN_QUEUE], revalidate: ONE_MINUTE }
);

// ─── Admin Analytics ─────────────────────────────────────

export const getCachedAnalyticsPostsThisMonth = unstable_cache(
  async (monthStart: Date, monthEnd: Date) =>
    db.post.count({
      where: { start_at: { gte: monthStart, lte: monthEnd } },
    }),
  ["analytics-posts-this-month"],
  { tags: [CACHE_TAGS.ADMIN_ANALYTICS], revalidate: ONE_MINUTE }
);

export const getCachedAnalyticsUsers = unstable_cache(
  async () =>
    db.user.findMany({
      where: { role: "USER" },
      select: { id: true, name: true, avatar_url: true, email: true, department: true },
    }),
  ["analytics-users"],
  { tags: [CACHE_TAGS.ADMIN_ANALYTICS], revalidate: ONE_MINUTE }
);

export const getCachedAnalyticsPosts = unstable_cache(
  async () =>
    db.post.findMany({
      orderBy: { start_at: "asc" },
      select: {
        id: true,
        title: true,
        start_at: true,
        checkins: { select: { user_id: true, status: true, submitted_at: true } },
      },
    }),
  ["analytics-posts"],
  { tags: [CACHE_TAGS.ADMIN_ANALYTICS, CACHE_TAGS.POSTS_LIST], revalidate: ONE_MINUTE }
);

// ─── API: Posts ──────────────────────────────────────────

export const getCachedPostsApi = unstable_cache(
  async () =>
    db.post.findMany({
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
    }),
  ["posts-api"],
  { tags: [CACHE_TAGS.POSTS_LIST], revalidate: ONE_MINUTE }
);

export const getCachedTotalEmployees = unstable_cache(
  async () =>
    db.user.count({
      where: { role: "USER" },
    }),
  ["total-employees"],
  { tags: [CACHE_TAGS.POSTS_LIST, CACHE_TAGS.ADMIN_ANALYTICS], revalidate: ONE_MINUTE }
);
