import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  getStartOfDayVN,
  DAILY_PC_EXERCISE_COUNT,
} from "@/lib/pc-kho";
import { generateDailyExercises } from "@/lib/pc-exercise-ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getStartOfDayVN();

  let exercises = await db.pcExercise.findMany({
    where: { exercise_date: today },
    orderBy: { order_index: "asc" },
  });

  if (exercises.length === 0) {
    const generated = await generateDailyExercises(DAILY_PC_EXERCISE_COUNT);
    await db.pcExercise.createMany({
      data: generated.map((ex, i) => ({
        exercise_date: today,
        title: ex.title,
        description: ex.description,
        requirements: ex.requirements,
        difficulty: ex.difficulty,
        order_index: i,
      })),
    });
    exercises = await db.pcExercise.findMany({
      where: { exercise_date: today },
      orderBy: { order_index: "asc" },
    });
  }

  return NextResponse.json({ exercises, date: today.toISOString() });
}
