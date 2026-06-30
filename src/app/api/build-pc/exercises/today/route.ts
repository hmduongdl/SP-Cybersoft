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

  const exercises = await db.pcExercise.findMany({
    where: { exercise_date: today },
    orderBy: { order_index: "asc" },
  });

  return NextResponse.json({ exercises, date: today.toISOString() });
}
