import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const featuredStart = new Date("2026-07-02T17:00:00Z"); // 03/07/2026 VN time

  const [users, rawFeaturedBuilds] = await Promise.all([
    db.user.findMany({
      where: {
        pc_score: { gt: 0 }
      },
      select: {
        id: true,
        name: true,
        avatar_url: true,
        pc_score: true
      },
      orderBy: {
        pc_score: "desc"
      },
      take: 50
    }),
    db.pcSubmission.findMany({
      where: {
        status: { in: ["AUTO_APPROVED", "APPROVED"] },
        ai_score: { not: null },
        submitted_at: { gte: featuredStart },
      },
      select: {
        id: true,
        parts_answer: true,
        explanation: true,
        image_urls: true,
        ai_feedback: true,
        ai_score: true,
        submitted_at: true,
        exercise: {
          select: {
            id: true,
            title: true,
            description: true,
            requirements: true,
            difficulty: true,
            exercise_date: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
          },
        },
      },
      orderBy: { ai_score: "desc" },
      take: 20,
    }),
  ]);

  // Sort featured builds by difficulty weight * ai_score
  // hard > medium > easy, so hard builds with high score rank first
  const difficultyWeight: Record<string, number> = { hard: 3, medium: 2, easy: 1 };
  const featuredBuilds = rawFeaturedBuilds
    .map((build) => ({
      ...build,
      _sortScore: (build.ai_score ?? 0) * (difficultyWeight[build.exercise.difficulty] ?? 1),
    }))
    .sort((a, b) => b._sortScore - a._sortScore || new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
    .slice(0, 8)
    .map(({ _sortScore, ...rest }) => rest);

  return NextResponse.json({ leaderboard: users, featuredBuilds });
}
