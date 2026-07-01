import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getStartOfDayVN } from "@/lib/pc-kho";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getStartOfDayVN();

  // 1. Fetch all PcBuildTask records created by the admin (ordered by date)
  const adminTasks = await db.pcBuildTask.findMany({
    orderBy: { date: "desc" },
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
            difficulty: "medium",
            order_index: countForDate,
          },
        });
      }
    }
  }

  // 3. Return all exercises corresponding to the admin tasks
  const exercises = await db.pcExercise.findMany({
    where: { id: { in: adminTasks.map((t) => t.id) } },
    orderBy: { exercise_date: "desc" },
  });

  return NextResponse.json({ exercises, date: today.toISOString() });
}
