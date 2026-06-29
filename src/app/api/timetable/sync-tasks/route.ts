import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ─── Constants ────────────────────────────────────────────────────────────────

/** ISO weekday (getDay()) → column name. Sunday = 0. */
const DAY_INDEX_TO_COL: Record<number, string> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

/** Columns that represent Monday – Friday */
const WEEKDAY_COLS = ["mon", "tue", "wed", "thu", "fri"];

/** Row types that are eligible for task injection */
const FOCUS_ROW_TYPES = new Set([
  "focus_peak",
  "focus_off",
  "focus_flexible",
  "custom",
]);

// ─── Helper: get the current ISO week boundaries (Mon 00:00 – Sun 23:59) ──────

function getCurrentWeekRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, …
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { weekStart: monday, weekEnd: sunday };
}

// ─── Helper: merge task title into an existing JSON content array ─────────────

function mergeIntoArray(
  existing: Prisma.JsonValue | null,
  incoming: string,
): string[] {
  const arr: string[] =
    Array.isArray(existing) ? (existing as string[]) : [];
  if (!arr.includes(incoming)) arr.push(incoming);
  return arr;
}

function mergeIds(
  existing: Prisma.JsonValue | null,
  incomingId: string,
): string[] {
  const arr: string[] =
    Array.isArray(existing) ? (existing as string[]) : [];
  if (!arr.includes(incomingId)) arr.push(incomingId);
  return arr;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // ── 0. Gate: only run when sync_task_manager is enabled ──────────────────
  const config = await prisma.userTimetableConfig.findUnique({
    where: { user_id: userId },
  });

  if (!config) {
    return NextResponse.json(
      { error: "Chưa thiết lập thời khóa biểu. Hãy hoàn thành onboarding trước." },
      { status: 400 },
    );
  }

  if (!config.sync_task_manager) {
    return NextResponse.json(
      { error: "Tính năng đồng bộ Task Manager chưa được bật trong cấu hình." },
      { status: 400 },
    );
  }

  // ── 1. Fetch ALL tasks related to this user ───────────────────────────────
  // Covers every assignment path:
  //   A) creator_id = userId           (tasks the user created themselves)
  //   B) assignee via TaskAssignee    (tasks explicitly assigned to the user)
  //   C) workspace collaborator tasks  (user is a member of the workspace that owns the task)
  //      — so tasks from shared workspaces also appear
  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        { status: { not: "DONE" } },
        { is_archived: false },
        {
          OR: [
            // Direct assignment
            { creator_id: userId },
            // Multi-assignee support
            { assignees: { some: { user_id: userId } } },
            // Workspace-level: user is a collaborator in the workspace that owns this task
            {
              workspace: {
                collaborators: {
                  some: { user_id: userId },
                },
              },
            },
            // Workspace-level: user is the workspace owner
            {
              workspace: {
                owner_id: userId,
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      title: true,
      due_date: true,
      status: true,
      creator_id: true,
    },
    orderBy: [
      // Deadline tasks first, then non-deadline
      { due_date: "asc" },
      { createdAt: "asc" },
    ],
  });

  if (tasks.length === 0) {
    return NextResponse.json({ message: "Không có task nào để đồng bộ.", synced: 0 });
  }


  // ── 2. Fetch the user's timetable rows (focus rows first) ─────────────────
  const rows = await prisma.timetableRow.findMany({
    where: { user_id: userId },
    include: { cells: true },
    orderBy: { order: "asc" },
  });

  // Find all focus rows (important or normal work)
  let targetRows = rows.filter((r: { row_type: string, title: string }) => FOCUS_ROW_TYPES.has(r.row_type) && r.title !== "Cập nhật tin tức sản phẩm");

  // Fallback to Khởi động if no focus rows exist
  if (targetRows.length === 0) {
    targetRows = rows.filter((r: { row_type: string }) => r.row_type === "anchor_start");
  }

  if (targetRows.length === 0) {
    return NextResponse.json(
      { error: "Không tìm thấy hàng công việc để chèn task vào. Hãy tạo thời khóa biểu trước." },
      { status: 400 },
    );
  }

  const { weekStart, weekEnd } = getCurrentWeekRange();

  // ── 3. Build a mutation map: { rowId_colName → { content[], task_ids[], is_deadline } }
  type CellPatch = {
    content: string[];
    task_ids: string[];
    is_deadline: boolean;
  };
  const patchMap = new Map<string, CellPatch>();

  const key = (rowId: string, col: string) => `${rowId}::${col}`;

  const getOrInit = (rowId: string, col: string, existingCell?: { content: Prisma.JsonValue | null; task_ids: Prisma.JsonValue | null; is_deadline: boolean } | null): CellPatch => {
    const k = key(rowId, col);
    if (!patchMap.has(k)) {
      patchMap.set(k, {
        content: Array.isArray(existingCell?.content) ? (existingCell!.content as string[]) : [],
        task_ids: Array.isArray(existingCell?.task_ids) ? (existingCell!.task_ids as string[]) : [],
        is_deadline: existingCell?.is_deadline ?? false,
      });
    }
    return patchMap.get(k)!;
  };

  // ── 2.5 Clean up stale (DONE) tasks from existing cells ────────────────
  // The loop below only adds tasks; without cleanup, DONE/removed tasks from
  // previous syncs remain in cells permanently.
  const activeIds = new Set(tasks.map((t) => t.id));
  const activeTitles = new Set(tasks.map((t) => t.title));

  for (const row of targetRows) {
    for (const cell of row.cells) {
      const existingIds: string[] = Array.isArray(cell.task_ids)
        ? (cell.task_ids as string[])
        : [];
      if (existingIds.length === 0) continue;

      if (existingIds.some((id) => !activeIds.has(id))) {
        // Cell has stale (DONE/removed) tasks — clean them up
        cell.task_ids = existingIds.filter((id) => activeIds.has(id));

        if (Array.isArray(cell.content)) {
          cell.content = (cell.content as string[]).filter((item) => {
            // Strip [DEADLINE] prefix before checking
            const stripped = item.startsWith("[DEADLINE] ")
              ? item.slice(11)
              : item;
            // Remove if it matches an active task (will be re-added by loop)
            // Keep manual entries (don't match any title)
            return !activeTitles.has(stripped);
          });
        }
      }
    }
  }

  for (const task of tasks) {
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    const isThisWeek =
      dueDate && dueDate >= weekStart && dueDate <= weekEnd;

    if (isThisWeek && dueDate) {
      // ── Case A: Task has deadline within this week ─────────────────────
      const dayCol = DAY_INDEX_TO_COL[dueDate.getDay()];
      for (const row of targetRows) {
        const existingCell = row.cells.find((c: { column_name: string }) => c.column_name === dayCol);
        const patch = getOrInit(row.id, dayCol, existingCell);
        
        const titleWithMarker = `[DEADLINE] ${task.title}`;
        const existingIdx = patch.content.indexOf(task.title);
        if (existingIdx >= 0) {
          patch.content[existingIdx] = titleWithMarker;
        } else if (!patch.content.includes(titleWithMarker)) {
          patch.content.push(titleWithMarker);
        }
        
        if (!patch.task_ids.includes(task.id)) patch.task_ids.push(task.id);
        patch.is_deadline = true; // mark red
      }
    } else {
      // ── Case B: No deadline or deadline outside this week ──────────────
      // Spread task across Mon–Fri (Google Calendar "all-week" style)
      for (const col of WEEKDAY_COLS) {
        for (const row of targetRows) {
          const existingCell = row.cells.find((c: { column_name: string }) => c.column_name === col);
          const patch = getOrInit(row.id, col, existingCell);
          if (!patch.content.includes(task.title)) patch.content.push(task.title);
          if (!patch.task_ids.includes(task.id)) patch.task_ids.push(task.id);
          // Don't set is_deadline — this is a floating task
        }
      }
    }
  }

  // ── 4. Persist all mutations in a transaction ─────────────────────────────
  // Build a Set of row IDs that belong to this user (sourced from DB query above).
  // Hard ownership gate: even if row_id were somehow manipulated, only rows that
  // belong to userId (fetched with where: { user_id: userId }) can be written.
  const ownedRowIds = new Set(rows.map((r: { id: string }) => r.id));

  const mutations: Prisma.PrismaPromise<unknown>[] = [];

  for (const [k, patch] of patchMap.entries()) {
    const [rowId, colName] = k.split("::");

    // Skip any row not owned by this user (explicit double-check)
    if (!ownedRowIds.has(rowId)) continue;

    mutations.push(
      prisma.timetableCell.upsert({
        where: {
          row_id_column_name: { row_id: rowId, column_name: colName },
        },
        update: {
          content: patch.content as Prisma.InputJsonValue,
          task_ids: patch.task_ids as Prisma.InputJsonValue,
          is_deadline: patch.is_deadline,
        },
        create: {
          row_id: rowId,
          column_name: colName,
          content: patch.content as Prisma.InputJsonValue,
          task_ids: patch.task_ids as Prisma.InputJsonValue,
          is_deadline: patch.is_deadline,
        },
      }),
    );
  }

  await prisma.$transaction(mutations);

  return NextResponse.json({
    message: `Đồng bộ thành công ${tasks.length} task vào thời khóa biểu.`,
    synced: tasks.length,
    cells_updated: patchMap.size,
  });
}

// ─── GET: Fetch current sync state (which cells have synced tasks) ─────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.timetableRow.findMany({
    where: { user_id: session.user.id },
    include: {
      cells: {
        where: {
          task_ids: { not: Prisma.DbNull },
        },
      },
    },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ rows });
}
