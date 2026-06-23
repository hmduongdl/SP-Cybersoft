import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const ALL_COLUMNS = ["mon","tue","wed","thu","fri","sat","sun","notes","tasks"];

// Helper: add two HH:MM times
function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// POST /api/timetable/rows  – insert a new free row between two rows
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { afterOrder, startTime } = await req.json();
  // afterOrder: the `order` value of the row ABOVE the insertion point
  // startTime: inferred from the above row's end_time

  if (afterOrder === undefined || !startTime)
    return NextResponse.json({ error: "afterOrder and startTime are required" }, { status: 400 });

  // Shift all rows with order > afterOrder up by 1
  await prisma.timetableRow.updateMany({
    where: { user_id: userId, order: { gt: afterOrder }, is_locked: false },
    data: { order: { increment: 1 } },
  });

  const endTime = addMinutes(startTime, 30);

  const newRow = await prisma.timetableRow.create({
    data: {
      user_id: userId,
      title: "",
      row_type: "custom",
      start_time: startTime,
      end_time: endTime,
      order: afterOrder + 1,
      is_fixed: false,
      is_locked: false,
      cells: {
        createMany: {
          data: ALL_COLUMNS.map((col) => ({
            column_name: col,
            content: [] as Prisma.InputJsonValue,
            task_ids: [] as Prisma.InputJsonValue,
            is_deadline: false,
          })),
        },
      },
    },
    include: { cells: true },
  });

  return NextResponse.json({ row: newRow }, { status: 201 });
}

// PATCH /api/timetable/rows/[id] — update title or times
export async function PATCH(req: Request) {
  return NextResponse.json({ error: "Use /api/timetable/rows/[id]" }, { status: 405 });
}
