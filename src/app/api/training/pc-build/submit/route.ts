import { after, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getStartOfDayVN } from "@/lib/pc-kho";
import {
  processPcBuildVision,
  getPcBuildWorkerSecret,
} from "@/lib/pc-build-background-worker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const DAILY_MAX = 5;

function getEndOfDayVN(start: Date): Date {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

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

  const today = getStartOfDayVN();
  const tomorrow = getEndOfDayVN(today);

  // Daily submission limit disabled per request

  // === EXCEL FAST PATH: extracted_items already parsed by client ===
  // Skip Vision AI step — jump straight to compatibility check
  if (extracted_items && Array.isArray(extracted_items.items) && extracted_items.items.length > 0) {
    const checkin = await db.checkin.create({
      data: {
        user_id: session.user.id,
        task_type: "BUILD_PC",
        pc_task_id,
        image_url: image_url || "excel-parsed",
        status: "PENDING",
        build_data: {
          is_analyzing: true,
          analysis_step: "deepseek",
          analysis_message: "AI đang phân loại linh kiện và kiểm tra tương thích...",
          explanation: explanation || "",
          extracted_raw: extracted_items, // already parsed by client
        },
      },
    });

    // Trigger compatibility check via HTTP (works on both local and Vercel)
    after(async () => {
      try {
        const secret = getPcBuildWorkerSecret();
        const baseUrl = getAppBaseUrl();
        await fetch(`${baseUrl}/api/training/pc-build/analyze-compatibility`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-pc-build-worker-secret": secret,
          },
          body: JSON.stringify({ id: checkin.id, type: "checkin" }),
        });
      } catch (err) {
        console.error("[submit/route] Error triggering compatibility job for Excel:", err);
      }
    });

    return NextResponse.json({
      success: true,
      checkin_id: checkin.id,
      status: "ANALYZING",
      message: "Đã đọc dữ liệu Excel. AI đang kiểm tra tương thích...",
    });
  }

  // === IMAGE PATH: normal Vision flow ===
  const checkin = await db.checkin.create({
    data: {
      user_id: session.user.id,
      task_type: "BUILD_PC",
      pc_task_id,
      image_url,
      status: "PENDING",
      build_data: {
        is_analyzing: true,
        analysis_step: "vision",
        analysis_message: "Đang đọc ảnh báo giá và bóc tách linh kiện...",
        explanation: explanation || "",
      },
    },
  });

  after(() => {
    processPcBuildVision(checkin.id, "checkin", image_url)
      .catch((err) => console.error("[submit/route] Error running vision task:", err));
  });

  return NextResponse.json({
    success: true,
    checkin_id: checkin.id,
    status: "ANALYZING",
    message: "Đang phân tích cấu hình trong nền. Bạn có thể chuyển qua tab khác hoặc nộp bài mới.",
  });
}
