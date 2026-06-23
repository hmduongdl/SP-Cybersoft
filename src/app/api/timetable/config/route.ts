import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/timetable/config
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await prisma.userTimetableConfig.findUnique({
    where: { user_id: session.user.id },
  });
  return NextResponse.json({ config });
}

// POST /api/timetable/config - full upsert from onboarding
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    max_focus_time, is_job_flexible, best_energy_time,
    best_learning_time, max_learning_time, sync_task_manager,
  } = body;

  const config = await prisma.userTimetableConfig.upsert({
    where: { user_id: session.user.id },
    update: { max_focus_time, is_job_flexible, best_energy_time, best_learning_time, max_learning_time, sync_task_manager },
    create: { user_id: session.user.id, max_focus_time, is_job_flexible, best_energy_time, best_learning_time, max_learning_time, sync_task_manager },
  });
  return NextResponse.json({ config });
}

// PATCH /api/timetable/config - partial update (settings panel)
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // Accept only the fields we allow to be patched from the settings panel
  const allowed = ["visible_columns", "sync_task_manager"] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if (key === "visible_columns") {
        data[key] = body[key] as Prisma.InputJsonValue;
      } else {
        data[key] = body[key];
      }
    }
  }

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });

  const config = await prisma.userTimetableConfig.update({
    where: { user_id: session.user.id },
    data,
  });
  return NextResponse.json({ config });
}
