import { after, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  getStartOfDayVN,
  DAILY_PC_SUBMISSION_MAX,
} from "@/lib/pc-kho";
import { processBackgroundPcBuild } from "@/lib/pc-build-background-worker";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

export const dynamic = "force-dynamic";

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
  const { exercise_id, image_urls, explanation } = body;

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
    return NextResponse.json({ error: "Bài tập không tồn tại." }, { status: 404 });
  }

  // Create immediate submission record with status ANALYZING
  const submission = await db.pcSubmission.create({
    data: {
      user_id: session.user.id,
      exercise_id,
      parts_answer: {
        is_analyzing: true
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
    processBackgroundPcBuild(submission.id, "submission", image_urls[0], exercise_id)
      .catch((err) => console.error("[submissions/route] Error running background task:", err));
  });

  revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");

  return NextResponse.json({
    success: true,
    submission,
    status: "ANALYZING",
    message: "Đang phân tích cấu hình trong nền. Bạn có thể rời trang hoặc nộp bài mới.",
  });
}
