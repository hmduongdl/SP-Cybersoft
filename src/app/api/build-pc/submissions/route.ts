import { after, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getStartOfDayVN } from "@/lib/pc-kho";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import { cleanupExpiredBuildPcSubmissions } from "@/lib/pc-build-cleanup";
import { getEffectivePlan } from "@/lib/plan-utils";

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

  await cleanupExpiredBuildPcSubmissions();

  const today = getStartOfDayVN();
  const tomorrow = getEndOfDayVN(today);

  // Fetch the user's effective plan
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, plan: true, plan_expires_at: true },
  });
  const effectivePlan = getEffectivePlan(
    user?.role ?? "USER",
    user?.plan ?? "FREE",
    user?.plan_expires_at ?? null
  );

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

  let processedSubmissions = submissions.map((sub) => ({
    ...sub,
    is_locked: false,
  }));

  if (effectivePlan === "FREE") {
    const todayMs = today.getTime();
    const tomorrowMs = tomorrow.getTime();

    const todaySubs = processedSubmissions.filter((sub) => {
      const subTime = new Date(sub.submitted_at).getTime();
      const parts = sub.parts_answer as { is_draft?: unknown } | null;
      return subTime >= todayMs && subTime < tomorrowMs && parts?.is_draft !== true;
    });

    if (todaySubs.length > 3) {
      const sortedToKeep = [...todaySubs].sort((a, b) => {
        const aFail = a.status === "REJECTED" ? 1 : 0;
        const bFail = b.status === "REJECTED" ? 1 : 0;
        if (aFail !== bFail) return aFail - bFail;

        const aScore = a.ai_score ?? 0;
        const bScore = b.ai_score ?? 0;
        return bScore - aScore;
      });

      const keepIds = new Set(sortedToKeep.slice(0, 3).map((s) => s.id));

      processedSubmissions = processedSubmissions.map((sub) => {
        const subTime = new Date(sub.submitted_at).getTime();
        const parts = sub.parts_answer as { is_draft?: unknown } | null;
        const isTodaySub = subTime >= todayMs && subTime < tomorrowMs && parts?.is_draft !== true;
        
        if (isTodaySub && !keepIds.has(sub.id)) {
          return {
            ...sub,
            is_locked: true,
            ai_score: null,
            ai_feedback: "Bài nộp bị khóa vì gói FREE giới hạn xem tối đa 3 bài phân tích mỗi ngày. Nâng cấp gói để mở khóa.",
            parts_answer: {
              ...(sub.parts_answer as Record<string, any>),
              checks: {},
              reason: "Nâng cấp lên PRO hoặc MAX để xem chi tiết phân tích của bài này.",
            },
          };
        }
        return sub;
      });
    }
  }

  return NextResponse.json({
    todayCount,
    submissions: processedSubmissions,
    userPlan: effectivePlan,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await cleanupExpiredBuildPcSubmissions();

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

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, plan: true, plan_expires_at: true },
  });
  const effectivePlan = getEffectivePlan(
    user?.role ?? "USER",
    user?.plan ?? "FREE",
    user?.plan_expires_at ?? null
  );

  let todayCount = 0;
  if (effectivePlan === "FREE" || effectivePlan === "PRO") {
    const tomorrow = getEndOfDayVN(today);
    const todaySubmissions = await db.pcSubmission.findMany({
      where: {
        user_id: session.user.id,
        submitted_at: { gte: today, lt: tomorrow },
      },
      select: { parts_answer: true },
    });
    todayCount = todaySubmissions.filter((submission) => {
      const parts = submission.parts_answer as { is_draft?: unknown } | null;
      return parts?.is_draft !== true;
    }).length;

    if (todayCount >= 5) {
      return NextResponse.json(
        { error: `Tài khoản gói ${effectivePlan} bị giới hạn nộp tối đa 5 cấu hình PC mỗi ngày.` },
        { status: 403 }
      );
    }
  }

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

  const isMax = effectivePlan === "MAX";
  const isPro = effectivePlan === "PRO";
  const runAi = isMax; // Chỉ gói MAX mới chạy AI tự động khi nộp bài

  // Image path: store evidence and trigger AI validation based on plan.
  const submission = await db.pcSubmission.create({
    data: {
      user_id: session.user.id,
      exercise_id,
      parts_answer: {
        is_draft: false,
        is_analyzing: runAi,
        analysis_step: runAi ? "vision" : "waiting_admin",
        analysis_message: runAi ? "Đang chuẩn bị đọc ảnh báo giá..." : "Bài nộp đã được ghi nhận và đang chờ phản hồi."
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

  if (isMax) {
    try {
      const { processPcBuildVision } = await import("@/lib/pc-build-background-worker");
      const base64Image = image_urls[0];
      // Gọi inline (blocking) để bóc tách linh kiện từ ảnh bằng gemini-3.5-flash
      await processPcBuildVision(submission.id, "submission", base64Image);
      
      const updatedSubmission = await db.pcSubmission.findUnique({
        where: { id: submission.id },
      });
      
      return NextResponse.json({
        success: true,
        submission: updatedSubmission || submission,
        status: "PENDING",
        message: "Đã trích xuất linh kiện xong. Đang phân tích tương thích trong nền...",
      });
    } catch (err: any) {
      console.error("[Submissions/POST] Lỗi phân tích tức thì cho gói MAX:", err);
    }
  } else if (isPro) {
    // Chỉ gửi mail cho admin vào bài nộp thứ 3 trong ngày của tài khoản PRO
    const totalCountToday = todayCount + 1;
    if (totalCountToday === 3) {
      after(() => {
        import("@/lib/mailer").then(async ({ sendMail }) => {
          const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
          const userName = session.user.name || session.user.email || "Thành viên PRO";
          const subject = `[PRO Plan] Thông báo bài nộp thứ 3 của ${userName}`;
          const html = `
            <h3>Thông báo nộp bài tập Build PC (Gói PRO)</h3>
            <p>Thành viên gói PRO <b>${userName}</b> (Email: ${session.user.email}) đã nộp bài tập thứ 3 trong ngày hôm nay.</p>
            <p>Vui lòng đăng nhập vào trang quản trị để xem và duyệt bài khi có thời gian rảnh.</p>
            <p><i>Hệ thống tự động thông báo bài thứ 3 và không gửi thêm email trùng lặp khác trong ngày cho tài khoản này.</i></p>
          `;
          try {
            await sendMail({ to: adminEmail, subject, html });
            console.log(`[PRO email] Notification email sent to admin: ${adminEmail}`);
          } catch (mailErr) {
            console.error("[PRO email] Failed to send notification email to admin:", mailErr);
          }
        });
      });
    }

    return NextResponse.json({
      success: true,
      submission,
      status: "PENDING",
      message: "Đã nhận bài. Bài đã được nộp và chờ admin duyệt.",
    });
  }

  return NextResponse.json({
    success: true,
    submission,
    status: "PENDING",
    message: "Đã nhận bài. Bài đã được nộp và chờ admin duyệt.",
  });
}
