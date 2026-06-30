import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deleteImage } from "@/lib/upload";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import { optimizeApprovedPcSubmissionImages } from "@/lib/pc-submission-images";

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
      const subs = await db.pcSubmission.findMany({
        where: { id: { in: submissionIds } },
        select: { id: true, image_urls: true, parts_answer: true, exercise_id: true, user_id: true },
      });

      await Promise.all(
        subs.map(async (submission) => {
          const originalImageUrls = Array.isArray(submission.image_urls)
            ? submission.image_urls.filter((url): url is string => typeof url === "string")
            : [];
          const optimizedImageUrls = await optimizeApprovedPcSubmissionImages(
            submission.id,
            submission.image_urls
          );
          const partsAnswer =
            submission.parts_answer &&
            typeof submission.parts_answer === "object" &&
            !Array.isArray(submission.parts_answer)
              ? submission.parts_answer
              : { parts: submission.parts_answer };

          await db.pcSubmission.update({
            where: { id: submission.id },
            data: {
              status: "APPROVED",
              reject_reason: null,
              reviewed_by: session.user.id,
              image_urls: optimizedImageUrls,
              parts_answer: {
                ...partsAnswer,
                is_draft: false,
                approved_image_count: optimizedImageUrls.length,
                approved_image_format: "webp",
                storage_optimized_at: new Date().toISOString(),
                exercise_id: submission.exercise_id,
                submitter_id: submission.user_id,
              },
            },
          });

          await Promise.all(
            originalImageUrls
              .filter((url) => !optimizedImageUrls.includes(url))
              .map((url) => deleteImage(url))
          );
        })
      );
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
