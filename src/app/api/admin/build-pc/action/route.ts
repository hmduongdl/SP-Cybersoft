import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deleteImage } from "@/lib/upload";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { submissionIds, action, rejectReason } = await request.json();

    if (!submissionIds?.length) {
      return NextResponse.json({ error: "Thiếu danh sách bài nộp." }, { status: 400 });
    }

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
    }

    if (action === "REJECT" && !rejectReason) {
      return NextResponse.json({ error: "Vui lòng nhập lý do từ chối." }, { status: 400 });
    }

    if (action === "APPROVE") {
      await db.pcSubmission.updateMany({
        where: { id: { in: submissionIds } },
        data: {
          status: "APPROVED",
          reject_reason: null,
          reviewed_by: session.user.id,
        },
      });
    } else {
      const subs = await db.pcSubmission.findMany({
        where: { id: { in: submissionIds } },
        select: { image_urls: true },
      });

      for (const s of subs) {
        const urls = (s.image_urls as string[]) || [];
        for (const url of urls) {
          try {
            await deleteImage(url);
          } catch {
            /* ignore */
          }
        }
      }

      await db.pcSubmission.updateMany({
        where: { id: { in: submissionIds } },
        data: {
          status: "REJECTED",
          reject_reason: rejectReason,
          reviewed_by: session.user.id,
        },
      });
    }

    revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[admin/build-pc/action]", err);
    return NextResponse.json({ error: "Lỗi server." }, { status: 500 });
  }
}
