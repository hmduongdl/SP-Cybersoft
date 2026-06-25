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

function roundTo5(num: number): number {
  return Math.round(num / 5) * 5;
}

/**
 * Q1 → Focus phase & break lengths
 *  < 60 min  → 1 phase, 0 break
 *  60 - 89 min → 2 phases of equal length, 5-min break
 *  = 90 min  → 2 phases of 45 min, 5-min break
 *  > 90 min (up to 120) → 2 equal phases, 10-min break
 */
function calcPhaseAndBreak(maxFocusTime: number): {
  phaseLen: number;
  breakLen: number;
  phases: number;
} {
  if (maxFocusTime < 60) {
    return { phaseLen: roundTo5(maxFocusTime), breakLen: 0, phases: 1 };
  }
  if (maxFocusTime >= 60 && maxFocusTime < 90) {
    const halfWork = Math.floor((maxFocusTime - 5) / 2);
    return {
      phaseLen: roundTo5(halfWork),
      breakLen: 5,
      phases: 2,
    };
  }
  if (maxFocusTime === 90) {
    return { phaseLen: 45, breakLen: 5, phases: 2 };
  }
  // 91–120 min
  const half = Math.floor(maxFocusTime / 2);
  return {
    phaseLen: roundTo5(half),
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
      description: phases > 1 ? `Phase ${p + 1}/${phases}` : "Phase 1/1",
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
 * Build a flexible work block.
 * Keeps Phase 1/2 / Phase 2/2 description markers intact so group
 * drag-and-drop detection continues to work. Only the row title is
 * changed to "Deep work / Công việc tự chọn".
 */
function buildFlexBlock(
  startMin: number,
  focusTime: number,
  orderStart: number,
): { rows: RowBlueprint[]; endMin: number; nextOrder: number } {
  const result = buildFocusBlock(
    "Deep work / Công việc tự chọn",
    "focus_flexible",
    startMin,
    focusTime,
    orderStart,
  );
  // Do NOT override description — Phase 1/2 / Phase 2/2 markers must stay
  // so getFocusGroup() can detect the split-phase trio for group dragging.
  return result;
}

/**
 * Calculates focus duration and energy classification.
 */
function calcFocusDuration(
  session: string,
  bestEnergyTime: string,
  maxFocusTime: number,
): { duration: number; label: string } {
  if (session === bestEnergyTime) {
    return { duration: roundTo5(maxFocusTime), label: "focus_peak" };
  } else {
    return { duration: roundTo5(Math.floor(maxFocusTime * 0.75)), label: "focus_off" };
  }
}

/**
 * Calculates total block duration including breaks.
 */
function getBlockTotalDuration(focusTime: number): number {
  const { phaseLen, breakLen, phases } = calcPhaseAndBreak(focusTime);
  return phases * phaseLen + (phases - 1) * breakLen;
}

/**
 * Inserts a buffer row if the current cursor is before the minimum required time.
 */
function insertBufferIfNeeded(
  cursor: number,
  minTimeStr: string,
  description: string,
  orderStart: number,
): { rows: RowBlueprint[]; nextCursor: number; nextOrder: number } {
  const minTime = toMinutes(minTimeStr);
  const rows: RowBlueprint[] = [];
  let order = orderStart;
  let currentCursor = cursor;

  if (currentCursor < minTime) {
    rows.push({
      title: description,
      row_type: "buffer",
      start_time: toTime(currentCursor),
      end_time: toTime(minTime),
      is_locked: false,
      order: order++,
      description: description,
    });
    currentCursor = minTime;
  }

  return { rows, nextCursor: currentCursor, nextOrder: order };
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

  const rows: RowBlueprint[] = [];
  let order = 0;
  let cursor = toMinutes("08:00");

  // ── BUỔI SÁNG ──────────────────────────────────

  // 1. Khởi động (Warmup)
  rows.push({
    title: "Khởi động",
    row_type: "anchor_start",
    start_time: toTime(cursor),
    end_time: toTime(cursor + 15),
    is_locked: true,
    order: order++,
    description: "Check email, warm-up, lên kế hoạch",
  });
  cursor += 15; // cursor is now 08:15

  // 2. Morning Learning
  if (best_learning_time === "morning") {
    rows.push({
      title: "Học tập / Tiếp thu kiến thức",
      row_type: "learning",
      start_time: toTime(cursor),
      end_time: toTime(cursor + roundTo5(max_learning_time)),
      is_locked: false,
      order: order++,
    });
    cursor += roundTo5(max_learning_time);
  }

  // 2.5. Cập nhật tin tức sản phẩm (45 phút) - Chỉ cho buổi không quan trọng của user
  if (best_energy_time !== "morning") {
    rows.push({
      title: "Cập nhật tin tức sản phẩm",
      row_type: "learning",
      start_time: toTime(cursor),
      end_time: toTime(cursor + 45),
      is_locked: false,
      order: order++,
      description: "Cập nhật tin tức sản phẩm",
    });
    cursor += 45;
  }

  // 3. Morning Focus/Flex Block (at least one, repeat if space permits)
  const morningDurLbl = calcFocusDuration("morning", best_energy_time, max_focus_time);
  const morningBlockDur = getBlockTotalDuration(morningDurLbl.duration);
  let isFirstMorningBlock = true;

  if (morningBlockDur > 0) {
    while (isFirstMorningBlock || cursor + morningBlockDur <= toMinutes("11:00")) {
      isFirstMorningBlock = false;
      if (!is_job_flexible) {
        const morningLabel =
          best_energy_time === "morning"
            ? "Công việc quan trọng (Buổi sáng)"
            : "Công việc thông thường (Buổi sáng)";
        const result = buildFocusBlock(
          morningLabel,
          morningDurLbl.label,
          cursor,
          morningDurLbl.duration,
          order,
        );
        rows.push(...result.rows);
        order = result.nextOrder;
        cursor = result.endMin + 5;
      } else {
        const result = buildFlexBlock(
          cursor,
          morningDurLbl.duration,
          order,
        );
        rows.push(...result.rows);
        order = result.nextOrder;
        cursor = result.endMin + 5;
      }
    }
  }

  // 4. Noon Learning
  if (best_learning_time === "noon") {
    rows.push({
      title: "Học tập / Tiếp thu kiến thức",
      row_type: "learning",
      start_time: toTime(cursor),
      end_time: toTime(cursor + roundTo5(max_learning_time)),
      is_locked: false,
      order: order++,
    });
    cursor += roundTo5(max_learning_time);
  }

  // 5. Morning Buffer check (goes all the way to Anchor Mid start time)
  const morningBuffer = insertBufferIfNeeded(
    cursor,
    "11:50",
    "Xử lý email / Tác vụ nhỏ",
    order,
  );
  rows.push(...morningBuffer.rows);
  order = morningBuffer.nextOrder;
  cursor = morningBuffer.nextCursor;

  // 6. Anchor Mid (Tổng kết buổi sáng - 10 phút cố định)
  const anchorMidStart = Math.max(cursor, toMinutes("11:50"));
  rows.push({
    title: "Tổng kết buổi sáng",
    row_type: "anchor_mid",
    start_time: toTime(anchorMidStart),
    end_time: toTime(anchorMidStart + 10),
    is_locked: true,
    order: order++,
    description: "Tổng kết buổi sáng",
  });
  cursor = anchorMidStart + 10;

  // ── BUỔI CHIỀU ─────────────────────────────────

  // 7. Bắt đầu chiều
  cursor = Math.max(cursor, toMinutes("13:30"));

  // 7.5. Recheck & Nhận công việc đầu buổi (20 phút cố định)
  rows.push({
    title: "Recheck & Nhận công việc",
    row_type: "anchor_start",
    start_time: toTime(cursor),
    end_time: toTime(cursor + 20),
    is_locked: true,
    order: order++,
    description: "Recheck & Nhận công việc đầu buổi",
  });
  cursor += 20; // cursor is now 13:50

  // 8. Afternoon Learning
  if (best_learning_time === "afternoon") {
    rows.push({
      title: "Học tập / Tiếp thu kiến thức",
      row_type: "learning",
      start_time: toTime(cursor),
      end_time: toTime(cursor + roundTo5(max_learning_time)),
      is_locked: false,
      order: order++,
    });
    cursor += roundTo5(max_learning_time);
  }

  // 8.5. Cập nhật tin tức sản phẩm (45 phút) - Chỉ cho buổi không quan trọng của user
  if (best_energy_time !== "afternoon") {
    rows.push({
      title: "Cập nhật tin tức sản phẩm",
      row_type: "learning",
      start_time: toTime(cursor),
      end_time: toTime(cursor + 45),
      is_locked: false,
      order: order++,
      description: "Cập nhật tin tức sản phẩm",
    });
    cursor += 45;
  }

  // 9. Afternoon Focus/Flex Block (at least one, repeat if space permits)
  const afternoonDurLbl = calcFocusDuration("afternoon", best_energy_time, max_focus_time);
  const afternoonBlockDur = getBlockTotalDuration(afternoonDurLbl.duration);
  let isFirstAfternoonBlock = true;

  if (afternoonBlockDur > 0) {
    while (isFirstAfternoonBlock || cursor + afternoonBlockDur <= toMinutes("17:00")) {
      isFirstAfternoonBlock = false;
      if (!is_job_flexible) {
        const afternoonLabel =
          best_energy_time === "afternoon"
            ? "Công việc quan trọng (Buổi chiều)"
            : "Công việc thông thường (Buổi chiều)";
        const result = buildFocusBlock(
          afternoonLabel,
          afternoonDurLbl.label,
          cursor,
          afternoonDurLbl.duration,
          order,
        );
        rows.push(...result.rows);
        order = result.nextOrder;
        cursor = result.endMin + 5;
      } else {
        const result = buildFlexBlock(
          cursor,
          afternoonDurLbl.duration,
          order,
        );
        rows.push(...result.rows);
        order = result.nextOrder;
        cursor = result.endMin + 5;
      }
    }
  }

  // 10. Evening Learning
  if (best_learning_time === "evening") {
    rows.push({
      title: "Học tập / Tiếp thu kiến thức",
      row_type: "learning",
      start_time: toTime(cursor),
      end_time: toTime(cursor + roundTo5(max_learning_time)),
      is_locked: false,
      order: order++,
    });
    cursor += roundTo5(max_learning_time);
  }

  // 11. Afternoon Buffer check (goes all the way to Anchor End start time)
  const afternoonBuffer = insertBufferIfNeeded(
    cursor,
    "18:00",
    "Công việc tuỳ chọn",
    order,
  );
  rows.push(...afternoonBuffer.rows);
  order = afternoonBuffer.nextOrder;
  cursor = afternoonBuffer.nextCursor;

  // 12. Anchor End (Tổng kết cuối ngày)
  const anchorEndStart = Math.max(cursor, toMinutes("18:00"));
  rows.push({
    title: "Tổng kết cuối ngày",
    row_type: "anchor_end",
    start_time: toTime(anchorEndStart),
    end_time: toTime(anchorEndStart + 30),
    is_locked: true,
    order: order++,
    description: "Tổng kết cuối ngày",
  });
  cursor = anchorEndStart + 30;

  // Final Sort & order normalization
  rows.sort((a, b) => {
    const diff = toMinutes(a.start_time) - toMinutes(b.start_time);
    if (diff !== 0) return diff;
    return toMinutes(a.end_time) - toMinutes(b.end_time);
  });

  rows.forEach((r, i) => (r.order = i));

  return rows;
}

// ─── Columns seeded per row ───────────────────────────────────────────────────
// Each row gets cells for all 7 days + notes + tasks
const DAY_COLUMNS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const ALL_COLUMNS = [...DAY_COLUMNS, "notes", "tasks"];

function seedCells(
  description?: string,
  rowType?: string,
): { column_name: string; content: Prisma.InputJsonValue; task_ids: Prisma.InputJsonValue; is_deadline: boolean }[] {
  return ALL_COLUMNS.map((col) => {
    let content: string[] = [];
    if (col === "notes" && description) content = [description];
    if (DAY_COLUMNS.includes(col) && rowType === "anchor_mid") {
      content = ["Note lại các công việc đã làm buổi sáng."];
    }
    return {
      column_name: col,
      content: content as Prisma.InputJsonValue,
      task_ids: [] as Prisma.InputJsonValue,
      is_deadline: false,
    };
  });
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
        const cells = seedCells(row.description, row.row_type);
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
