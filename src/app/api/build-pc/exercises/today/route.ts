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

function getDifficultyRank(difficulty?: string | null): number {
  return DIFFICULTY_RANK[String(difficulty || "").toLowerCase()] ?? 99;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  function getEndOfDayVN(start: Date): Date {
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return end;
  }
  
  const today = getStartOfDayVN();
  const tomorrow = getEndOfDayVN(today);

  // 1. Fetch PcBuildTask records created by the admin for today (and not archived)
  const adminTasks = (await db.pcBuildTask.findMany({
    where: { 
      date: { gte: today, lt: tomorrow }
    },
    orderBy: { created_at: "asc" },
  })).sort((a, b) => {
    const difficultyDiff = getDifficultyRank(a.difficulty) - getDifficultyRank(b.difficulty);
    if (difficultyDiff !== 0) return difficultyDiff;
    const createdDiff = a.created_at.getTime() - b.created_at.getTime();
    if (createdDiff !== 0) return createdDiff;
    return a.id.localeCompare(b.id);
  });

  // 2. Sync them to PcExercise table so they exist for submissions
  if (adminTasks.length > 0) {
    for (const task of adminTasks) {
      const existing = await db.pcExercise.findUnique({ where: { id: task.id } });
      if (!existing) {
        // Count existing exercises for the same date to avoid unique constraint violation
        const countForDate = await db.pcExercise.count({
          where: { exercise_date: task.date || today },
        });
        await db.pcExercise.create({
          data: {
            id: task.id,
            exercise_date: task.date || today,
            title: "Yêu cầu cấu hình",
            description: task.customer_need,
            requirements: {
              budget: task.max_budget,
              constraints: task.requirements ? task.requirements.split("\n").filter(Boolean) : [],
              hints: [],
            },
            difficulty: task.difficulty || "medium",
            order_index: countForDate,
          },
        });
      } else {
        // Sync updates from admin task (difficulty, description, requirements)
        await db.pcExercise.update({
          where: { id: task.id },
          data: {
            difficulty: task.difficulty || "medium",
            description: task.customer_need,
            requirements: {
              budget: task.max_budget,
              constraints: task.requirements ? task.requirements.split("\n").filter(Boolean) : [],
              hints: [],
            },
          },
        });
      }
    }
  }

  // 3. Return all exercises corresponding to the admin tasks
  const exercises = await db.pcExercise.findMany({
    where: { id: { in: adminTasks.map((t) => t.id) } },
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
        distinct: ['user_id']
      }
    },
    orderBy: { exercise_date: "desc" },
  });

  // Attach is_archived to exercises
  const adminTaskOrder = new Map(adminTasks.map((task, index) => [task.id, index]));
  const exercisesWithArchiveStatus = exercises.map(ex => {
    const adminTask = adminTasks.find(t => t.id === ex.id);
    return {
      ...ex,
      is_archived: adminTask?.is_archived || false
    };
  }).sort((a, b) => {
    const orderDiff = (adminTaskOrder.get(a.id) ?? 99) - (adminTaskOrder.get(b.id) ?? 99);
    if (orderDiff !== 0) return orderDiff;
    return a.id.localeCompare(b.id);
  });

  return NextResponse.json({ exercises: exercisesWithArchiveStatus, date: today.toISOString() });
}
