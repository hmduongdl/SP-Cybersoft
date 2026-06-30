import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";
  const type = searchParams.get("type") || "checkin";

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  try {
    if (type === "checkin") {
      const checkin = await db.checkin.findUnique({ where: { id } });
      if (!checkin) {
        return NextResponse.json({ error: "Không tìm thấy bản ghi checkin" }, { status: 404 });
      }
      
      const buildData = (checkin.build_data as any) || {};
      const isAnalyzing = buildData.is_analyzing === true;
      const hasError = typeof buildData.error === "string";

      return NextResponse.json({
        status: checkin.status,
        isAnalyzing,
        hasError,
        errorMsg: buildData.error || null,
        data: checkin.build_data,
      });
    } else {
      const submission = await db.pcSubmission.findUnique({ where: { id } });
      if (!submission) {
        return NextResponse.json({ error: "Không tìm thấy bản ghi submission" }, { status: 404 });
      }

      const partsAnswer = (submission.parts_answer as any) || {};
      const isAnalyzing = partsAnswer.is_analyzing === true;
      const hasError = typeof partsAnswer.error === "string" || submission.ai_feedback?.includes("Gặp lỗi hệ thống") === true;

      return NextResponse.json({
        status: submission.status,
        isAnalyzing,
        hasError,
        errorMsg: partsAnswer.error || (hasError ? submission.ai_feedback : null),
        data: submission.parts_answer,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi server" }, { status: 500 });
  }
}
