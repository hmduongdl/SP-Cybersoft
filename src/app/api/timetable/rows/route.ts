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

// POST /api/timetable/rows  – insert a new free row
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body = await req.json();
  const { title = "", startTime, endTime, afterOrder } = body;

  if (!startTime)
    return NextResponse.json({ error: "startTime is required" }, { status: 400 });

  let actualAfterOrder = afterOrder;

  // If afterOrder is not provided, find the last row before anchor_end
  if (actualAfterOrder === undefined) {
    const rows = await prisma.timetableRow.findMany({
      where: { user_id: userId },
      orderBy: { order: "asc" }
    });
    const anchorEndIndex = rows.findIndex(r => r.row_type === "anchor_end");
    if (anchorEndIndex > 0) {
      actualAfterOrder = rows[anchorEndIndex - 1].order;
    } else {
      actualAfterOrder = rows.length > 0 ? rows[rows.length - 1].order : 0;
    }
  }

  // Shift all rows with order > actualAfterOrder up by 1
  await prisma.timetableRow.updateMany({
    where: { user_id: userId, order: { gt: actualAfterOrder }, is_locked: false },
    data: { order: { increment: 1 } },
  });

  const finalEndTime = endTime || addMinutes(startTime, 30);

  const newRow = await prisma.timetableRow.create({
    data: {
      user_id: userId,
      title: title,
      row_type: "custom",
      start_time: startTime,
      end_time: finalEndTime,
      order: actualAfterOrder + 1,
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
