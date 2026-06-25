import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/timetable-reset
 * Admin only: clear all users' timetable data and reset onboarding flag.
 * - Deletes all TimetableRow (cascades to TimetableCell)
 * - Sets is_onboarded = false for all UserTimetableConfig
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete all timetable rows (cells cascade via FK)
  const deletedRows = await prisma.timetableRow.deleteMany({});

  // Reset all onboarding flags and clear config
  const resetConfigs = await prisma.userTimetableConfig.updateMany({
    data: { is_onboarded: false },
  });

  return NextResponse.json({
    success: true,
    message: `Đã xóa ${deletedRows.count} hàng thời khóa biểu và reset ${resetConfigs.count} cấu hình người dùng.`,
    deleted_rows: deletedRows.count,
    reset_configs: resetConfigs.count,
  });
}
