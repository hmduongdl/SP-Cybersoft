import { after, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  getStartOfDayVN,
  DAILY_PC_SUBMISSION_MAX,
} from "@/lib/pc-kho";
import { processPcBuildVision, getPcBuildWorkerSecret } from "@/lib/pc-build-background-worker";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function getEndOfDayVN(start: Date): Date {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getStartOfDayVN();
  const tomorrow = getEndOfDayVN(today);

  const [todayCount, submissions] = await Promise.all([
    db.pcSubmission.count({
      where: {
        user_id: session.user.id,
        submitted_at: { gte: today, lt: tomorrow },
      },
    }),
    db.pcSubmission.findMany({
      where: { user_id: session.user.id },
      orderBy: { submitted_at: "desc" },
      take: 30,
      include: {
        exercise: {
          select: { id: true, title: true, difficulty: true, exercise_date: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    todayCount,
    remaining: Math.max(0, DAILY_PC_SUBMISSION_MAX - todayCount),
    maxPerDay: DAILY_PC_SUBMISSION_MAX,
    submissions,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { exercise_id, image_urls, explanation, extracted_items } = body;

  if (!exercise_id || !Array.isArray(image_urls) || image_urls.length === 0) {
    return NextResponse.json(
      { error: "Thiếu bài tập hoặc hình ảnh báo giá." },
      { status: 400 }
    );
  }

  if (!explanation || typeof explanation !== "string" || explanation.trim().length < 20) {
    return NextResponse.json(
      { error: "Giải thích phải có ít nhất 20 ký tự." },
      { status: 400 }
    );
  }

  const today = getStartOfDayVN();
  const tomorrow = getEndOfDayVN(today);

  // Daily submission limit disabled per request

  const exercise = await db.pcExercise.findUnique({ where: { id: exercise_id } });
  if (!exercise) {
    return NextResponse.json({ error: "Bài tập không tồn tại." }, { status: 404 } );
  }

  // === EXCEL FAST PATH: extracted_items already parsed by client ===
  if (extracted_items && Array.isArray(extracted_items.items) && extracted_items.items.length > 0) {
    const submission = await db.pcSubmission.create({
      data: {
        user_id: session.user.id,
        exercise_id,
        parts_answer: {
          is_analyzing: true,
          analysis_step: "deepseek",
          analysis_message: "AI đang phân loại linh kiện và kiểm tra tương thích...",
          extracted_raw: extracted_items,
        },
        explanation: explanation.trim(),
        image_urls: ["excel-parsed"],
        status: "PENDING",
        ai_score: null,
        ai_feedback: null,
      },
      include: { exercise: { select: { title: true } } },
    });

    after(async () => {
      try {
        const secret = getPcBuildWorkerSecret();
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
          || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
        await fetch(`${baseUrl}/api/training/pc-build/analyze-compatibility`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-pc-build-worker-secret": secret,
          },
          body: JSON.stringify({ id: submission.id, type: "submission" }),
        });
      } catch (err) {
        console.error("[submissions/route] Error triggering compat job for Excel:", err);
      }
    });

    try { revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default"); } catch (_) {}

    return NextResponse.json({
      success: true,
      submission,
      status: "ANALYZING",
      message: "Đã đọc dữ liệu Excel. AI đang kiểm tra tương thích...",
    });
  }

  // === IMAGE PATH: normal Vision flow ===
  const submission = await db.pcSubmission.create({
    data: {
      user_id: session.user.id,
      exercise_id,
      parts_answer: {
        is_analyzing: true,
        analysis_step: "vision",
        analysis_message: "Đang đọc ảnh báo giá và bóc tách linh kiện..."
      },
      explanation: explanation.trim(),
      image_urls: image_urls.slice(0, 3),
      status: "PENDING",
      ai_score: null,
      ai_feedback: null,
    },
    include: {
      exercise: { select: { title: true } },
    },
  });

  after(() => {
    processPcBuildVision(submission.id, "submission", image_urls[0])
      .catch((err) => console.error("[submissions/route] Error running vision task:", err));
  });

  revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");

  return NextResponse.json({
    success: true,
    submission,
    status: "ANALYZING",
    message: "Đang phân tích cấu hình trong nền. Bạn có thể rời trang hoặc nộp bài mới.",
  });
}
