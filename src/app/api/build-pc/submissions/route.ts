import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getStartOfDayVN } from "@/lib/pc-kho";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import { cleanupExpiredBuildPcImages } from "@/lib/pc-build-cleanup";

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

  await cleanupExpiredBuildPcImages();

  const today = getStartOfDayVN();
  const tomorrow = getEndOfDayVN(today);

  const [todaySubmissions, submissions] = await Promise.all([
    db.pcSubmission.findMany({
      where: {
        user_id: session.user.id,
        submitted_at: { gte: today, lt: tomorrow },
      },
      select: { parts_answer: true },
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

  const todayCount = todaySubmissions.filter((submission) => {
    const parts = submission.parts_answer as { is_draft?: unknown } | null;
    return parts?.is_draft !== true;
  }).length;

  return NextResponse.json({
    todayCount,
    submissions,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await cleanupExpiredBuildPcImages();

  const body = await request.json();
  const { exercise_id, image_urls, explanation, extracted_items } = body;

  if (!exercise_id || !Array.isArray(image_urls) || image_urls.length === 0) {
    return NextResponse.json(
      { error: "Thiếu bài tập hoặc hình ảnh báo giá." },
      { status: 400 }
    );
  }

  // Allow empty explanation or short ones
  const explanationStr = typeof explanation === "string" ? explanation.trim() : "";

  const today = getStartOfDayVN();

  const exercise = await db.pcExercise.findUnique({ where: { id: exercise_id } });
  if (!exercise) {
    return NextResponse.json({ error: "Bài tập không tồn tại." }, { status: 404 } );
  }

  const buildTask = await db.pcBuildTask.findUnique({ where: { id: exercise_id } });
  if (buildTask?.is_archived) {
    return NextResponse.json({ error: "Bài tập này đã bị khóa và không thể nộp thêm." }, { status: 410 });
  }

  // Draft-only path: Vercel only receives the submission data. Reading/checking happens later in admin queue on localhost.
  if (extracted_items && Array.isArray(extracted_items.items) && extracted_items.items.length > 0) {
    const submission = await db.pcSubmission.create({
      data: {
        user_id: session.user.id,
        exercise_id,
        parts_answer: {
          is_draft: false,
          is_analyzing: false,
          analysis_step: "waiting_admin",
          analysis_message: "Bài nộp đã được ghi nhận và đang chờ phản hồi.",
          extracted_raw: extracted_items,
        },
        explanation: explanationStr,
        image_urls: ["excel-parsed"],
        status: "PENDING",
        ai_score: null,
        ai_feedback: null,
      },
      include: { exercise: { select: { title: true } } },
    });

    try { revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default"); } catch (_) {}

    return NextResponse.json({
      success: true,
      submission,
      status: "PENDING",
      message: "Đã nhận file Excel. Bài đã được nộp và chờ admin duyệt.",
    });
  }

  // Image path: store evidence only, no AI work on submit.
  const submission = await db.pcSubmission.create({
    data: {
      user_id: session.user.id,
      exercise_id,
      parts_answer: {
        is_draft: false,
        is_analyzing: false,
        analysis_step: "waiting_admin",
        analysis_message: "Bài nộp đã được ghi nhận và đang chờ phản hồi."
      },
      explanation: explanationStr,
      image_urls: image_urls.slice(0, 3),
      status: "PENDING",
      ai_score: null,
      ai_feedback: null,
    },
    include: {
      exercise: { select: { title: true } },
    },
  });

  revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");

  return NextResponse.json({
    success: true,
    submission,
    status: "PENDING",
    message: "Đã nhận bài. Bài đã được nộp và chờ admin duyệt.",
  });
}
