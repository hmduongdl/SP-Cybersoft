import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// PATCH /api/timetable/cells/[id]
// Body: { content?: string[], notes?: string }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cellId } = await params;
  const body = await req.json();

  // Verify ownership via row → user_id
  const cell = await prisma.timetableCell.findUnique({
    where: { id: cellId },
    include: { row: { select: { user_id: true } } },
  });

  if (!cell || cell.row.user_id !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.timetableCell.update({
    where: { id: cellId },
    data: {
      ...(body.content !== undefined && {
        content: body.content as Prisma.InputJsonValue,
      }),
      ...(body.notes !== undefined && {
        content: [body.notes] as Prisma.InputJsonValue,
      }),
    },
  });

  return NextResponse.json({ cell: updated });
}
