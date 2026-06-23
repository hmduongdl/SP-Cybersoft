import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RowBlueprint {
  title: string;
  row_type: string;
  start_time: string;
  end_time: string;
  is_locked: boolean;
  order: number;
  description?: string; // seeded into the "description" cell column
}

// ─── Time Helpers ─────────────────────────────────────────────────────────────

/** "08:30" → minutes from midnight */
function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** minutes from midnight → "HH:MM" */
function toTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

// ─── Algorithm Core ───────────────────────────────────────────────────────────

/**
 * Q1 → Focus phase & break lengths
 *  < 90 min  → 1 phase, 0 break
 *  = 90 min  → 2 phases of 45 min, 5-min break
 *  > 90 min (up to 120) → 2 equal phases, 10-min break
 */
function calcPhaseAndBreak(maxFocusTime: number): {
  phaseLen: number;
  breakLen: number;
  phases: number;
} {
  if (maxFocusTime < 90) {
    return { phaseLen: maxFocusTime, breakLen: 0, phases: 1 };
  }
  if (maxFocusTime === 90) {
    return { phaseLen: 45, breakLen: 5, phases: 2 };
  }
  // 91–120 min
  return {
    phaseLen: Math.floor(maxFocusTime / 2),
    breakLen: 10,
    phases: 2,
  };
}

/**
 * Build a "focus block" starting at `startMin`.
 * Returns rows and the minute the block ends.
 */
function buildFocusBlock(
  label: string,
  rowType: string,
  startMin: number,
  focusTime: number,
  orderStart: number,
): { rows: RowBlueprint[]; endMin: number; nextOrder: number } {
  const { phaseLen, breakLen, phases } = calcPhaseAndBreak(focusTime);
  const rows: RowBlueprint[] = [];
  let cursor = startMin;
  let order = orderStart;

  for (let p = 0; p < phases; p++) {
    const phaseEnd = cursor + phaseLen;
    rows.push({
      title: phases > 1 ? `${label} (Giai đoạn ${p + 1})` : label,
      row_type: rowType,
      start_time: toTime(cursor),
      end_time: toTime(phaseEnd),
      is_locked: false,
      order: order++,
      description: phases > 1 ? `Phase ${p + 1}/${phases}` : undefined,
    });
    cursor = phaseEnd;

    // Add break between phases (not after the last)
    if (p < phases - 1 && breakLen > 0) {
      rows.push({
        title: "Giải lao",
        row_type: "break",
        start_time: toTime(cursor),
        end_time: toTime(cursor + breakLen),
        is_locked: false,
        order: order++,
      });
      cursor += breakLen;
    }
  }

  return { rows, endMin: cursor, nextOrder: order };
}

/**
 * Find the correct learning slot start based on Q4 answer.
 * Constraints:
 *   morning  → after startup (08:15)
 *   noon     → before morning review (must end by 12:00)
 *   afternoon → starts at 13:30
 *   evening  → before end-of-day review (must end by 18:00)
 */
function learningSlotStart(
  bestLearningTime: string,
  maxLearningTime: number,
): number {
  switch (bestLearningTime) {
    case "morning":
      return toMinutes("08:15"); // right after startup
    case "noon":
      return toMinutes("11:30") - maxLearningTime; // Ends right before morning review (starts at 11:30)
    case "afternoon":
      return toMinutes("13:30");
    case "evening":
      return toMinutes("18:00") - maxLearningTime; // slot ends at 18:00
    default:
      return toMinutes("08:15");
  }
}

// ─── Row Builder ─────────────────────────────────────────────────────────────

function buildRows(answers: {
  max_focus_time: number;
  is_job_flexible: boolean;
  best_energy_time: string;
  best_learning_time: string;
  max_learning_time: number;
}): RowBlueprint[] {
  const {
    max_focus_time,
    is_job_flexible,
    best_energy_time,
    best_learning_time,
    max_learning_time,
  } = answers;

  // ── Q3: Determine focus time per session ─────────────────────────────────
  // Peak session: full T_focus, Off-peak session: 0.75 × T_focus
  const morningFocus =
    best_energy_time === "morning"
      ? max_focus_time
      : Math.round(max_focus_time * 0.75);
  const afternoonFocus =
    best_energy_time === "afternoon"
      ? max_focus_time
      : Math.round(max_focus_time * 0.75);

  // ── Q4: Learning slot ────────────────────────────────────────────────────
  const learnStart = learningSlotStart(best_learning_time, max_learning_time);
  const learnEnd = learnStart + max_learning_time;

  const rows: RowBlueprint[] = [];

  // ═══════════════════════════════════════════════════════
  //  ANCHOR 1 – Khởi động (08:00 → 08:15, always locked)
  // ═══════════════════════════════════════════════════════
  rows.push({
    title: "Khởi động",
    row_type: "anchor_start",
    start_time: "08:00",
    end_time: "08:15",
    is_locked: true,
    order: 0,
    description: "Kiểm tra email, lên kế hoạch ngày mới, warm-up",
  });

  let order = 1;
  let cursor = toMinutes("08:15");

  // ═══════════════════════════════════════════════════════
  //  Q4: Learning slot – if "morning" or "noon", place it now
  // ═══════════════════════════════════════════════════════
  if (best_learning_time === "morning") {
    rows.push({
      title: "Học tập / Tiếp thu kiến thức",
      row_type: "learning",
      start_time: toTime(learnStart),
      end_time: toTime(learnEnd),
      is_locked: false,
      order: order++,
    });
    cursor = learnEnd;
  }

  // ═══════════════════════════════════════════════════════
  //  Morning focus block (Q1 + Q3)
  // ═══════════════════════════════════════════════════════
  if (!is_job_flexible) {
    // Fixed schedule: full morning focus block
    const morningLabel =
      best_energy_time === "morning"
        ? "Công việc quan trọng (Buổi sáng)"
        : "Công việc thông thường (Buổi sáng)";
    const result = buildFocusBlock(
      morningLabel,
      best_energy_time === "morning" ? "focus_peak" : "focus_off",
      cursor,
      morningFocus,
      order,
    );
    rows.push(...result.rows);
    order = result.nextOrder;
    cursor = result.endMin;

  }

  // Q4 noon slot: before morning review
  if (best_learning_time === "noon") {
    rows.push({
      title: "Học tập / Tiếp thu kiến thức",
      row_type: "learning",
      start_time: toTime(learnStart),
      end_time: toTime(learnEnd),
      is_locked: false,
      order: order++,
    });
  }

  // ═══════════════════════════════════════════════════════
  //  ANCHOR 2 – Tổng kết buổi sáng (ends at 12:00, locked)
  // ═══════════════════════════════════════════════════════
  rows.push({
    title: "Tổng kết buổi sáng",
    row_type: "anchor_mid",
    start_time: "11:30",
    end_time: "12:00",
    is_locked: true,
    order: order++,
    description: "Review tiến độ buổi sáng, chuẩn bị cho buổi chiều",
  });

  // ── Lunch break ──────────────────────────────────────────────────────────
  rows.push({
    title: "Nghỉ trưa",
    row_type: "break",
    start_time: "12:00",
    end_time: "13:30",
    is_locked: false,
    order: order++,
  });

  cursor = toMinutes("13:30");

  // ═══════════════════════════════════════════════════════
  //  Q4: Learning slot – "afternoon" → 13:30
  // ═══════════════════════════════════════════════════════
  if (best_learning_time === "afternoon") {
    rows.push({
      title: "Học tập / Tiếp thu kiến thức",
      row_type: "learning",
      start_time: toTime(learnStart),
      end_time: toTime(learnEnd),
      is_locked: false,
      order: order++,
    });
    cursor = learnEnd;
  }

  // ═══════════════════════════════════════════════════════
  //  Afternoon focus block (Q1 + Q3)
  // ═══════════════════════════════════════════════════════
  if (!is_job_flexible) {
    const afternoonLabel =
      best_energy_time === "afternoon"
        ? "Công việc quan trọng (Buổi chiều)"
        : "Công việc thông thường (Buổi chiều)";

    const result = buildFocusBlock(
      afternoonLabel,
      best_energy_time === "afternoon" ? "focus_peak" : "focus_off",
      cursor < toMinutes("13:30") ? toMinutes("13:30") : cursor,
      afternoonFocus,
      order,
    );
    rows.push(...result.rows);
    order = result.nextOrder;
    cursor = result.endMin;
  }

  // ═══════════════════════════════════════════════════════
  //  Q4: Learning slot – "evening" → before 18:00
  // ═══════════════════════════════════════════════════════
  if (best_learning_time === "evening") {
    rows.push({
      title: "Học tập / Tiếp thu kiến thức",
      row_type: "learning",
      start_time: toTime(learnStart),
      end_time: toTime(learnEnd),
      is_locked: false,
      order: order++,
    });
  }

  // ═══════════════════════════════════════════════════════
  //  ANCHOR 3 – Tổng kết cuối ngày (ends at 18:30, locked)
  // ═══════════════════════════════════════════════════════
  rows.push({
    title: "Tổng kết cuối ngày",
    row_type: "anchor_end",
    start_time: "18:00",
    end_time: "18:30",
    is_locked: true,
    order: order++,
    description: "Review toàn bộ ngày, ghi nhận kết quả, lên kế hoạch ngày mai",
  });

  // Sort all rows by their start_time to ensure correct visual order
  rows.sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));

  // Re-assign order after sorting
  rows.forEach((r, i) => (r.order = i));

  return rows;
}

// ─── Columns seeded per row ───────────────────────────────────────────────────
// Each row gets cells for all 7 days + notes + tasks
const DAY_COLUMNS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const ALL_COLUMNS = [...DAY_COLUMNS, "notes", "tasks"];

function seedCells(
  description?: string,
): { column_name: string; content: Prisma.InputJsonValue; task_ids: Prisma.InputJsonValue; is_deadline: boolean }[] {
  return ALL_COLUMNS.map((col) => ({
    column_name: col,
    content: (col === "notes" && description ? [description] : []) as Prisma.InputJsonValue,
    task_ids: [] as Prisma.InputJsonValue,
    is_deadline: false,
  }));
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: {
    max_focus_time: number;
    is_job_flexible: boolean;
    best_energy_time: string;
    best_learning_time: string;
    max_learning_time: number;
    sync_task_manager: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    max_focus_time,
    is_job_flexible,
    best_energy_time,
    best_learning_time,
    max_learning_time,
    sync_task_manager,
  } = body;

  // ── Run everything in a transaction ───────────────────────────────────────
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert config and mark as onboarded
      const config = await tx.userTimetableConfig.upsert({
        where: { user_id: userId },
        update: {
          max_focus_time,
          is_job_flexible,
          best_energy_time,
          best_learning_time,
          max_learning_time,
          sync_task_manager,
          is_onboarded: true,
        },
        create: {
          user_id: userId,
          max_focus_time,
          is_job_flexible,
          best_energy_time,
          best_learning_time,
          max_learning_time,
          sync_task_manager,
          is_onboarded: true,
        },
      });

      // 2. Delete any existing rows for this user (fresh regeneration)
      await tx.timetableRow.deleteMany({ where: { user_id: userId } });

      // 3. Build row blueprints via algorithm
      const blueprints = buildRows({
        max_focus_time,
        is_job_flexible,
        best_energy_time,
        best_learning_time,
        max_learning_time,
      });

      // 4. Create rows and cells in bulk (using createMany to save DB roundtrips)
      const rowData = blueprints.map((bp) => {
        const rowId = randomUUID();
        return {
          id: rowId,
          user_id: userId,
          title: bp.title,
          row_type: bp.row_type,
          start_time: bp.start_time,
          end_time: bp.end_time,
          is_fixed: bp.is_locked,
          is_locked: bp.is_locked,
          order: bp.order,
          description: bp.description,
        };
      });

      await tx.timetableRow.createMany({
        data: rowData.map(({ description, ...rest }) => rest),
      });

      const cellData: any[] = [];
      for (const row of rowData) {
        const cells = seedCells(row.description);
        for (const c of cells) {
          cellData.push({
            id: randomUUID(),
            row_id: row.id,
            column_name: c.column_name,
            content: c.content,
            task_ids: c.task_ids,
            is_deadline: c.is_deadline,
          });
        }
      }

      await tx.timetableCell.createMany({
        data: cellData,
      });

      // 5. Query rows back with their cell relations
      const createdRows = await tx.timetableRow.findMany({
        where: { user_id: userId },
        include: { cells: true },
        orderBy: { order: "asc" },
      });

      return { config, rows: createdRows };
    }, {
      timeout: 30000, // Increase transaction timeout to 30 seconds to prevent DB connection limits/slow writes from failing onboarding
    });

    return NextResponse.json(
      {
        message: "Thời khóa biểu đã được tạo thành công",
        config: result.config,
        rows: result.rows,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[timetable/generate] Error:", err);
    return NextResponse.json(
      { error: "Internal server error while generating timetable" },
      { status: 500 },
    );
  }
}
