import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, type, explanation } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    if (type === "checkin") {
      const checkin = await db.checkin.findFirst({
        where: { id, user_id: session.user.id }
      });
      if (!checkin) {
        return NextResponse.json({ error: "Không tìm thấy checkin" }, { status: 404 });
      }

      const buildData = (checkin.build_data as any) || {};
      if (buildData.is_analyzing) {
        return NextResponse.json({ error: "AI vẫn đang phân tích cấu hình." }, { status: 400 });
      }

      const isApproved = buildData.is_approved === true;
      const finalStatus = isApproved ? "AUTO_APPROVED" : "PENDING";

      await db.checkin.update({
        where: { id },
        data: {
          status: finalStatus,
          build_data: {
            ...buildData,
            is_draft: false,
            explanation: explanation || "",
          }
        }
      });
    } else {
      const submission = await db.pcSubmission.findFirst({
        where: { id, user_id: session.user.id }
      });
      if (!submission) {
        return NextResponse.json({ error: "Không tìm thấy submission" }, { status: 404 });
      }

      const parts = (submission.parts_answer as any) || {};
      if (parts.is_analyzing) {
        return NextResponse.json({ error: "AI vẫn đang phân tích cấu hình." }, { status: 400 });
      }

      const isApproved = parts.is_approved === true;
      const finalStatus = isApproved ? "AUTO_APPROVED" : "PENDING";

      await db.pcSubmission.update({
        where: { id },
        data: {
          status: finalStatus,
          explanation: explanation || "",
          parts_answer: {
            ...parts,
            is_draft: false
          },
          ai_score: parts.temp_ai_score !== undefined ? parts.temp_ai_score : (isApproved ? 100 : 70),
          ai_feedback: parts.temp_ai_feedback || "",
        }
      });
    }

    revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");
    revalidateTag(CACHE_TAGS.POSTS_LIST, "default");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi server" }, { status: 500 });
  }
}
