import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/timetable/rows/[id] — update title, start_time, end_time
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rowId } = await params;
  const row = await prisma.timetableRow.findUnique({ where: { id: rowId } });
  if (!row || row.user_id !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();

  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.timetableRow.update({
      where: { id: rowId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.start_time !== undefined && { start_time: body.start_time }),
        ...(body.end_time !== undefined && { end_time: body.end_time }),
      },
    });

    if (body.notes !== undefined) {
      await tx.timetableCell.upsert({
        where: { row_id_column_name: { row_id: rowId, column_name: "notes" } },
        update: { content: body.notes },
        create: { row_id: rowId, column_name: "notes", content: body.notes, is_deadline: false, task_ids: [] },
      });
    }

    if (body.cells) {
      for (const [col, content] of Object.entries(body.cells)) {
        const taskIds = body.taskIds?.[col] || [];
        await tx.timetableCell.upsert({
          where: { row_id_column_name: { row_id: rowId, column_name: col } },
          update: { content: content as any, task_ids: taskIds },
          create: { row_id: rowId, column_name: col, content: content as any, task_ids: taskIds, is_deadline: false },
        });
      }
    }

    return await tx.timetableRow.findUnique({
      where: { id: rowId },
      include: { cells: true },
    });
  });

  return NextResponse.json({ row: updated });
}

// DELETE /api/timetable/rows/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rowId } = await params;
  const row = await prisma.timetableRow.findUnique({ where: { id: rowId } });
  if (!row || row.user_id !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (row.is_locked)
    return NextResponse.json({ error: "Cannot delete locked rows" }, { status: 400 });

  await prisma.timetableRow.delete({ where: { id: rowId } });

  // Re-compact order
  const remaining = await prisma.timetableRow.findMany({
    where: { user_id: session.user.id },
    orderBy: { order: "asc" },
  });
  await prisma.$transaction(
    remaining.map((r: { id: string }, i: number) =>
      prisma.timetableRow.update({ where: { id: r.id }, data: { order: i } }),
    ),
  );

  return NextResponse.json({ ok: true });
}
