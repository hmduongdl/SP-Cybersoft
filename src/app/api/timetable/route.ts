import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ─── GET /api/timetable ───────────────────────────────────────────────────────
// Returns the full timetable structure for the authenticated user:
//   config + rows (ordered) + cells per row
// If no config exists → 204 with { onboarding_required: true }
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const config = await prisma.userTimetableConfig.findUnique({
    where: { user_id: userId },
  });

  // No config → client must run onboarding
  if (!config || !config.is_onboarded) {
    return NextResponse.json(
      { onboarding_required: true, config: null, rows: [] },
      { status: 200 },
    );
  }

  const rows = await prisma.timetableRow.findMany({
    where: { user_id: userId },
    include: { cells: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ onboarding_required: false, config, rows });
}

// ─── POST /api/timetable ──────────────────────────────────────────────────────
// Accepts the full edited structure and overwrites it atomically.
//
// Body shape:
// {
//   rows: Array<{
//     id?:        string  // if provided, treated as existing row (skipped on new)
//     title:      string
//     row_type:   string
//     start_time: string
//     end_time:   string
//     is_locked:  boolean
//     order:      number
//     cells: Array<{
//       column_name: string
//       content:     string[] | null
//       task_ids:    string[] | null
//       is_deadline: boolean
//     }>
//   }>
// }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // ── Validate config exists ────────────────────────────────────────────────
  const config = await prisma.userTimetableConfig.findUnique({
    where: { user_id: userId },
  });

  if (!config)
    return NextResponse.json(
      { error: "Chưa thiết lập thời khóa biểu. Hãy hoàn thành onboarding trước." },
      { status: 400 },
    );

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: {
    rows: Array<{
      id?: string;
      title: string;
      row_type: string;
      start_time: string;
      end_time: string;
      is_locked: boolean;
      order: number;
      cells: Array<{
        column_name: string;
        content: string[] | null;
        task_ids: string[] | null;
        is_deadline: boolean;
      }>;
    }>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0)
    return NextResponse.json({ error: "rows must be a non-empty array" }, { status: 400 });

  // ── Validate no locked row is being modified destructively ────────────────
  // We allow locked rows to be included (they must stay), but enforce
  // that the client cannot change is_locked from true to false.
  const existingLocked = await prisma.timetableRow.findMany({
    where: { user_id: userId, is_locked: true },
    select: { id: true },
  });
  const lockedIds = new Set(existingLocked.map((r: { id: string }) => r.id));

  for (const r of body.rows) {
    if (r.id && lockedIds.has(r.id) && r.is_locked === false) {
      return NextResponse.json(
        { error: `Row "${r.title}" is a locked anchor and cannot be unlocked.` },
        { status: 403 },
      );
    }
  }

  // ── Atomic transaction: delete old rows → create new rows + cells ─────────
  const result = await prisma.$transaction(async (tx) => {
    // 1. Delete all existing rows for this user (cells cascade)
    await tx.timetableRow.deleteMany({ where: { user_id: userId } });

    // 2. Re-insert rows in provided order
    const createdRows = [];
    for (const [idx, rowData] of body.rows.entries()) {
      const row = await tx.timetableRow.create({
        data: {
          user_id:    userId,
          title:      rowData.title,
          row_type:   rowData.row_type ?? "custom",
          start_time: rowData.start_time,
          end_time:   rowData.end_time,
          is_fixed:   rowData.is_locked,   // keep legacy field in sync
          is_locked:  rowData.is_locked,
          order:      idx,                  // enforce sequential order
          cells: {
            createMany: {
              data: (rowData.cells ?? []).map((cell) => ({
                column_name: cell.column_name,
                content:     (cell.content ?? null) as Prisma.InputJsonValue,
                task_ids:    (cell.task_ids ?? null) as Prisma.InputJsonValue,
                is_deadline: cell.is_deadline ?? false,
              })),
            },
          },
        },
        include: { cells: true },
      });
      createdRows.push(row);
    }

    return createdRows;
  });

  return NextResponse.json(
    {
      message: `Đã lưu ${result.length} hàng thời khóa biểu thành công.`,
      rows: result,
    },
    { status: 200 },
  );
}
