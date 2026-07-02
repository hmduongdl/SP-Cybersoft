import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const [users, featuredBuilds] = await Promise.all([
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
        submitted_at: { gte: weekStart },
      },
      select: {
        id: true,
        ai_score: true,
        submitted_at: true,
        exercise: {
          select: {
            id: true,
            title: true,
            description: true,
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
      orderBy: [
        { ai_score: "desc" },
        { submitted_at: "desc" },
      ],
      take: 8,
    }),
  ]);

  return NextResponse.json({ leaderboard: users, featuredBuilds });
}
