import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, type } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    if (type === "checkin") {
      const checkin = await db.checkin.findFirst({
        where: { id, user_id: session.user.id }
      });
      if (checkin) {
        const isDraft = (checkin.build_data as any)?.is_draft === true;
        if (isDraft) {
          await db.checkin.delete({ where: { id } });
        }
      }
    } else {
      const submission = await db.pcSubmission.findFirst({
        where: { id, user_id: session.user.id }
      });
      if (submission) {
        const isDraft = (submission.parts_answer as any)?.is_draft === true;
        if (isDraft) {
          await db.pcSubmission.delete({ where: { id } });
        }
      }
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi server" }, { status: 500 });
  }
}
