import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function getAiReviewState(status: string, reason?: string | null) {
  if (status !== "PENDING") return "COMPLETED";
  if (!reason || reason.startsWith("AI đang duyệt")) return "PROCESSING";
  return "COMPLETED";
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Bạn cần đăng nhập." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "Thiếu id check-in." }, { status: 400 });
  }

  const checkin = await db.checkin.findFirst({
    where: {
      id,
      user_id: session.user.id,
    },
    select: {
      id: true,
      status: true,
      reject_reason: true,
      ai_confidence: true,
      ai_analysis_reason: true,
      ai_extracted_username: true,
      ai_extracted_title: true,
      ai_is_facebook_ui: true,
      ai_is_public_mode: true,
      submitted_at: true,
    },
  });

  if (!checkin) {
    return NextResponse.json({ success: false, error: "Không tìm thấy check-in." }, { status: 404 });
  }

  const aiReviewState = getAiReviewState(checkin.status, checkin.ai_analysis_reason);

  return NextResponse.json({
    success: true,
    checkin: {
      ...checkin,
      ai_review_state: aiReviewState,
    },
  });
}
