import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getStartOfDayVN } from "@/lib/pc-kho";

export const dynamic = "force-dynamic";

function getEndOfDayVN(start: Date): Date {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getStartOfDayVN();
  const tomorrow = getEndOfDayVN(today);

  const tasks = await db.pcBuildTask.findMany({
    where: { 
      date: { gte: today, lt: tomorrow },
      is_archived: false
    },
    include: {
      submissions: {
        where: {
          status: { in: ["AUTO_APPROVED", "APPROVED"] }
        },
        include: {
          user: {
            select: { id: true, name: true, image: true }
          }
        },
        distinct: ['user_id'] // Only one avatar per user per task
      }
    },
    orderBy: { created_at: "asc" },
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
