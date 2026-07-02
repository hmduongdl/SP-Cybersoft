import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getStartOfDayVN } from "@/lib/pc-kho";

export const dynamic = "force-dynamic";

const DIFFICULTY_RANK: Record<string, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

function getEndOfDayVN(start: Date): Date {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

function getDifficultyRank(difficulty?: string | null): number {
  return DIFFICULTY_RANK[String(difficulty || "").toLowerCase()] ?? 99;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getStartOfDayVN();
  const tomorrow = getEndOfDayVN(today);

  const tasks = (await db.pcBuildTask.findMany({
    where: { 
      date: { gte: today, lt: tomorrow }
    },
    include: {
      submissions: {
        where: {
          status: { in: ["AUTO_APPROVED", "APPROVED"] }
        },
        include: {
          user: {
            select: { id: true, name: true, avatar_url: true }
          }
        },
        distinct: ['user_id'] // Only one avatar per user per task
      }
    },
    orderBy: { created_at: "asc" },
  })).sort((a, b) => {
    const difficultyDiff = getDifficultyRank(a.difficulty) - getDifficultyRank(b.difficulty);
    if (difficultyDiff !== 0) return difficultyDiff;
    const createdDiff = a.created_at.getTime() - b.created_at.getTime();
    if (createdDiff !== 0) return createdDiff;
    return a.id.localeCompare(b.id);
  });

  const userSubmissions = await db.checkin.findMany({
    where: {
      user_id: session.user.id,
      task_type: "BUILD_PC",
      submitted_at: { gte: today, lt: tomorrow },
    },
  });

  const todaySubmissions = userSubmissions.length;

  return NextResponse.json({
    tasks,
    todaySubmissions,
    submissions: userSubmissions,
    maxPerDay: 5,
    remaining: Math.max(0, 5 - todaySubmissions),
  });
}
