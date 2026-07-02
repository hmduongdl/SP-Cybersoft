import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { pc_task_id, image_url, explanation, extracted_items } = body;

  if (!pc_task_id || !image_url) {
    return NextResponse.json({ error: "Thiếu pc_task_id hoặc ảnh hóa đơn." }, { status: 400 });
  }

  const task = await db.pcBuildTask.findUnique({ where: { id: pc_task_id } });
  if (!task) {
    return NextResponse.json({ error: "Đề bài không tồn tại." }, { status: 404 });
  }

  if (task.is_archived) {
    return NextResponse.json({ error: "Bài tập này đã bị khóa và không thể nộp thêm." }, { status: 410 });
  }

  // Daily submission limit disabled per request

  // Legacy endpoint: store only. Review happens outside the submit request.
  if (extracted_items && Array.isArray(extracted_items.items) && extracted_items.items.length > 0) {
    const checkin = await db.checkin.create({
      data: {
        user_id: session.user.id,
        task_type: "BUILD_PC",
        pc_task_id,
        image_url: image_url || "excel-parsed",
        status: "PENDING",
        build_data: {
          is_analyzing: false,
          is_draft: false,
          analysis_step: "waiting_admin",
          analysis_message: "Hồ sơ đã được ghi nhận và đang chờ phản hồi.",
          explanation: explanation || "",
          extracted_raw: extracted_items,
        },
      },
    });

    return NextResponse.json({
      success: true,
      checkin_id: checkin.id,
      status: "PENDING",
      message: "Tệp Excel đã được ghi nhận. Bài đã được nộp và chờ admin duyệt.",
    });
  }

  // Image path: no background AI work on submit.
  const checkin = await db.checkin.create({
    data: {
      user_id: session.user.id,
      task_type: "BUILD_PC",
      pc_task_id,
      image_url,
      status: "PENDING",
      build_data: {
        is_analyzing: false,
        is_draft: false,
        analysis_step: "waiting_admin",
        analysis_message: "Hồ sơ đã được ghi nhận và đang chờ phản hồi.",
        explanation: explanation || "",
      },
    },
  });

  return NextResponse.json({
    success: true,
    checkin_id: checkin.id,
    status: "PENDING",
    message: "Bài đã được nộp và chờ admin duyệt.",
  });
}
