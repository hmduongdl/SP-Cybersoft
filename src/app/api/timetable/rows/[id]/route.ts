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
  if (row.is_locked)
    return NextResponse.json({ error: "Cannot modify locked rows" }, { status: 400 });

  const body = await req.json();
  const updated = await prisma.timetableRow.update({
    where: { id: rowId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.start_time !== undefined && { start_time: body.start_time }),
      ...(body.end_time !== undefined && { end_time: body.end_time }),
    },
    include: { cells: true },
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
