import { after, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getStartOfDayVN } from "@/lib/pc-kho";
import { processBackgroundPcBuild } from "@/lib/pc-build-background-worker";

export const dynamic = "force-dynamic";

const DAILY_MAX = 5;

function getEndOfDayVN(start: Date): Date {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { pc_task_id, image_url, explanation } = body;

  if (!pc_task_id || !image_url) {
    return NextResponse.json({ error: "Thiếu pc_task_id hoặc ảnh hóa đơn." }, { status: 400 });
  }

  const task = await db.pcBuildTask.findUnique({ where: { id: pc_task_id } });
  if (!task) {
    return NextResponse.json({ error: "Đề bài không tồn tại." }, { status: 404 });
  }

  const today = getStartOfDayVN();
  const tomorrow = getEndOfDayVN(today);

  // Daily submission limit disabled per request

  // Create immediate Checkin record with is_analyzing flag
  const checkin = await db.checkin.create({
    data: {
      user_id: session.user.id,
      task_type: "BUILD_PC",
      pc_task_id,
      image_url,
      status: "PENDING",
      build_data: {
        is_analyzing: true,
        explanation: explanation || "",
      },
    },
  });

  after(() => {
    processBackgroundPcBuild(checkin.id, "checkin", image_url, pc_task_id)
      .catch((err) => console.error("[submit/route] Error running background task:", err));
  });

  return NextResponse.json({
    success: true,
    checkin_id: checkin.id,
    status: "ANALYZING",
    message: "Đang phân tích cấu hình trong nền. Bạn có thể chuyển qua tab khác hoặc nộp bài mới.",
  });
}
