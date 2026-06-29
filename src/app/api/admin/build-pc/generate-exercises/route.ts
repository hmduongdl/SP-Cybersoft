import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getStartOfDayVN, DAILY_PC_EXERCISE_COUNT } from "@/lib/pc-kho";
import { generateDailyExercises } from "@/lib/pc-exercise-ai";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = getStartOfDayVN();

    // Delete existing exercises for today before regenerating
    await db.pcExercise.deleteMany({
      where: { exercise_date: today },
    });

    const generated = await generateDailyExercises(DAILY_PC_EXERCISE_COUNT);

    if (generated.length === 0) {
      return NextResponse.json({ error: "AI không sinh được bài tập nào." }, { status: 500 });
    }

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

    return NextResponse.json({ success: true, count: generated.length });
  } catch (err: unknown) {
    console.error("[admin/build-pc/generate-exercises]", err);
    const message = err instanceof Error ? err.message : "Lỗi server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
