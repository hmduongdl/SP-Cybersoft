import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deleteImage } from "@/lib/upload";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import { optimizeApprovedPcSubmissionImages } from "@/lib/pc-submission-images";
import {
  processPcBuildCompatibilityFromStored,
  processPcBuildVision,
} from "@/lib/pc-build-background-worker";

export const dynamic = "force-dynamic";

const CHECKIN_ID_PREFIX = "checkin:";

function splitBuildPcIds(ids: unknown) {
  const rawIds = Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  return {
    pcSubmissionIds: rawIds.filter((id) => !id.startsWith(CHECKIN_ID_PREFIX)),
    pcCheckinIds: rawIds
      .filter((id) => id.startsWith(CHECKIN_ID_PREFIX))
      .map((id) => id.slice(CHECKIN_ID_PREFIX.length))
      .filter(Boolean),
  };
}

function getJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getSubmissionAnswerObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : { parts: value };
}

function getEvidenceUrl(urls: unknown): string | null {
  if (!Array.isArray(urls)) return null;
  return urls
    .filter((url): url is string => typeof url === "string")
    .find((url) => url.startsWith("data:image/") || /^https?:\/\//.test(url)) || null;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { submissionIds, action, rejectReason, aiScore, aiFeedback } = await request.json();
    const { pcSubmissionIds, pcCheckinIds } = splitBuildPcIds(submissionIds);

    if (!pcSubmissionIds.length && !pcCheckinIds.length) {
      return NextResponse.json({ error: "Thiếu danh sách bài nộp." }, { status: 400 });
    }

    if (!["APPROVE", "REJECT", "PROCESS", "SAVE_REVIEW"].includes(action)) {
      return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
    }

    if (action === "REJECT" && !rejectReason) {
      return NextResponse.json({ error: "Vui lòng nhập lý do từ chối." }, { status: 400 });
    }

    if (action === "PROCESS") {
      const subs = pcSubmissionIds.length
        ? await db.pcSubmission.findMany({
            where: { id: { in: pcSubmissionIds } },
            select: { id: true, image_urls: true, parts_answer: true },
          })
        : [];

      for (const submission of subs) {
        const partsAnswer = getSubmissionAnswerObject(submission.parts_answer);

        await db.pcSubmission.update({
          where: { id: submission.id },
          data: {
            status: "ANALYZING",
            parts_answer: {
              ...partsAnswer,
              is_draft: false,
              is_analyzing: true,
              analysis_step: partsAnswer.extracted_raw ? "deepseek" : "vision",
              analysis_message: "Đang tự động phân tích cấu hình.",
            },
          },
        });

        if (partsAnswer.extracted_raw) {
          await processPcBuildCompatibilityFromStored(submission.id, "submission");
        } else {
          const evidenceUrl = getEvidenceUrl(submission.image_urls);
          if (!evidenceUrl) {
            await db.pcSubmission.update({
              where: { id: submission.id },
              data: {
                status: "REJECTED",
                reject_reason: "Không tìm thấy ảnh hợp lệ.",
                parts_answer: {
                  ...partsAnswer,
                  is_draft: false,
                  is_analyzing: false,
                  analysis_step: "error",
                  analysis_message: "Không tìm thấy ảnh hợp lệ để đọc.",
                },
              },
            });
            continue;
          }
          await processPcBuildVision(submission.id, "submission", evidenceUrl);
        }

        // Auto-decision: evaluate AI results
        const processed = await db.pcSubmission.findUnique({
          where: { id: submission.id },
          select: { parts_answer: true },
        });
        const processedParts = getJsonObject(processed?.parts_answer);
        const checks = processedParts.checks as Record<string, { status: string }> | undefined;
        const score = typeof processedParts.temp_ai_score === "number" ? processedParts.temp_ai_score : null;
        const aiFeedback = typeof processedParts.temp_ai_feedback === "string" ? processedParts.temp_ai_feedback : "";

        // Auto decision: PASS all checks → APPROVED, any FAIL → REJECTED
        const hasFail = checks && Object.values(checks).some(c => c.status === "FAIL");
        const hasWarn = checks && Object.values(checks).some(c => c.status === "WARN");

        let autoStatus: string;
        let autoReason: string;

        if (hasFail) {
          autoStatus = "REJECTED";
          const failChecks = Object.entries(checks || {})
            .filter(([, c]) => c.status === "FAIL")
            .map(([k]) => k);
          autoReason = `Linh kiện không tương thích: ${failChecks.join(", ")}. ${aiFeedback ? `AI: ${aiFeedback}` : ""}`;
        } else if (score != null && score < 50) {
          autoStatus = "REJECTED";
          autoReason = `Điểm đánh giá thấp (${score}/100). ${aiFeedback ? `AI: ${aiFeedback}` : ""}`;
        } else if (hasWarn) {
          // WARN only + score ok → approved with note
          autoStatus = "AUTO_APPROVED";
          autoReason = aiFeedback || "Đã duyệt (có cảnh báo nhỏ).";
        } else {
          autoStatus = "AUTO_APPROVED";
          autoReason = aiFeedback || "Đã duyệt.";
        }

        await db.pcSubmission.update({
          where: { id: submission.id },
          data: {
            status: autoStatus,
            reject_reason: autoStatus === "REJECTED" ? autoReason : null,
            ai_score: score,
            ai_feedback: aiFeedback || null,
            reviewed_by: session.user.id,
            parts_answer: {
              ...processedParts,
              is_analyzing: false,
              analysis_step: "done",
              analysis_message: autoReason,
              is_approved: autoStatus !== "REJECTED",
              reason: autoReason,
              reviewed_locally_at: new Date().toISOString(),
            },
          },
        });
      }

      const checkins = pcCheckinIds.length
        ? await db.checkin.findMany({
            where: { id: { in: pcCheckinIds }, task_type: "BUILD_PC" },
            select: { id: true, image_url: true, build_data: true },
          })
        : [];

      for (const checkin of checkins) {
        const buildData = getJsonObject(checkin.build_data);

        await db.checkin.update({
          where: { id: checkin.id },
          data: {
            status: "ANALYZING",
            build_data: {
              ...buildData,
              is_draft: false,
              is_analyzing: true,
              analysis_step: buildData.extracted_raw ? "deepseek" : "vision",
              analysis_message: "Đang tự động phân tích cấu hình.",
            },
          },
        });

        if (buildData.extracted_raw) {
          await processPcBuildCompatibilityFromStored(checkin.id, "checkin");
        } else {
          const evidenceUrl = getEvidenceUrl([checkin.image_url]);
          if (!evidenceUrl) {
            await db.checkin.update({
              where: { id: checkin.id },
              data: {
                status: "REJECTED",
                reject_reason: "Không tìm thấy ảnh hợp lệ.",
                build_data: {
                  ...buildData,
                  is_draft: false,
                  is_analyzing: false,
                  analysis_step: "error",
                  analysis_message: "Không tìm thấy ảnh hợp lệ.",
                },
              },
            });
            continue;
          }
          await processPcBuildVision(checkin.id, "checkin", evidenceUrl);
        }

        const processed = await db.checkin.findUnique({
          where: { id: checkin.id },
          select: { build_data: true },
        });
        const processedData = getJsonObject(processed?.build_data);
        const checks = processedData.checks as Record<string, { status: string }> | undefined;
        const score = typeof processedData.temp_ai_score === "number" ? processedData.temp_ai_score : null;
        const aiFeedback = typeof processedData.temp_ai_feedback === "string" ? processedData.temp_ai_feedback : "";

        const hasFail = checks && Object.values(checks).some(c => c.status === "FAIL");
        const hasWarn = checks && Object.values(checks).some(c => c.status === "WARN");

        let autoStatus: string;
        let autoReason: string;

        if (hasFail) {
          autoStatus = "REJECTED";
          const failChecks = Object.entries(checks || {})
            .filter(([, c]) => c.status === "FAIL")
            .map(([k]) => k);
          autoReason = `Linh kiện không tương thích: ${failChecks.join(", ")}. ${aiFeedback ? `AI: ${aiFeedback}` : ""}`;
        } else if (score != null && score < 50) {
          autoStatus = "REJECTED";
          autoReason = `Điểm đánh giá thấp (${score}/100). ${aiFeedback ? `AI: ${aiFeedback}` : ""}`;
        } else if (hasWarn) {
          autoStatus = "AUTO_APPROVED";
          autoReason = aiFeedback || "Đã duyệt (có cảnh báo nhỏ).";
        } else {
          autoStatus = "AUTO_APPROVED";
          autoReason = aiFeedback || "Đã duyệt.";
        }

        await db.checkin.update({
          where: { id: checkin.id },
          data: {
            status: autoStatus,
            reject_reason: autoStatus === "REJECTED" ? autoReason : null,
            build_data: {
              ...processedData,
              is_analyzing: false,
              analysis_step: "done",
              analysis_message: autoReason,
              is_approved: autoStatus !== "REJECTED",
              reason: autoReason,
              reviewed_locally_at: new Date().toISOString(),
            },
          },
        });
      }
    } else if (action === "SAVE_REVIEW") {
      const score = Number(aiScore);
      if (!Number.isFinite(score) || score < 0 || score > 100) {
        return NextResponse.json({ error: "Điểm phải nằm trong khoảng 0-100." }, { status: 400 });
      }

      const feedback = typeof aiFeedback === "string" ? aiFeedback.trim() : "";
      if (feedback.length < 3) {
        return NextResponse.json({ error: "Nhận xét quá ngắn." }, { status: 400 });
      }

      if (pcCheckinIds.length > 0) {
        const existing = await db.checkin.findFirst({
          where: { id: pcCheckinIds[0], task_type: "BUILD_PC" },
          select: { build_data: true },
        });
        const buildData = getJsonObject(existing?.build_data);

        await db.checkin.update({
          where: { id: pcCheckinIds[0] },
          data: {
            build_data: {
              ...buildData,
              temp_ai_score: score,
              temp_ai_feedback: feedback,
              manual_review_saved_at: new Date().toISOString(),
            },
          },
        });
      } else {
        const existing = await db.pcSubmission.findUnique({
          where: { id: pcSubmissionIds[0] },
          select: { parts_answer: true },
        });
        const partsAnswer =
          existing?.parts_answer &&
          typeof existing.parts_answer === "object" &&
          !Array.isArray(existing.parts_answer)
            ? existing.parts_answer as Record<string, unknown>
            : { parts: existing?.parts_answer };

        await db.pcSubmission.update({
          where: { id: pcSubmissionIds[0] },
          data: {
            ai_score: score,
            ai_feedback: feedback,
            parts_answer: {
              ...partsAnswer,
              temp_ai_score: score,
              temp_ai_feedback: feedback,
              manual_review_saved_at: new Date().toISOString(),
            },
          },
        });
      }
    } else if (action === "APPROVE") {
      const subs = pcSubmissionIds.length
        ? await db.pcSubmission.findMany({
            where: { id: { in: pcSubmissionIds } },
            select: { id: true, image_urls: true, parts_answer: true, exercise_id: true, user_id: true },
          })
        : [];

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

      if (pcCheckinIds.length > 0) {
        const checkins = await db.checkin.findMany({
          where: { id: { in: pcCheckinIds }, task_type: "BUILD_PC" },
          select: { id: true, build_data: true },
        });

        await Promise.all(
          checkins.map((checkin) => {
            const buildData = getJsonObject(checkin.build_data);
            return db.checkin.update({
              where: { id: checkin.id },
              data: {
                status: "APPROVED",
                reject_reason: null,
                reviewed_by: session.user.id,
                build_data: {
                  ...buildData,
                  is_draft: false,
                  is_analyzing: false,
                  approved_at: new Date().toISOString(),
                },
              },
            });
          })
        );
      }
    } else {
      const subs = pcSubmissionIds.length
        ? await db.pcSubmission.findMany({
            where: { id: { in: pcSubmissionIds } },
            select: { image_urls: true },
          })
        : [];

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

      if (pcSubmissionIds.length > 0) {
        await db.pcSubmission.updateMany({
          where: { id: { in: pcSubmissionIds } },
          data: {
            status: "REJECTED",
            reject_reason: rejectReason,
            reviewed_by: session.user.id,
          },
        });
      }

      if (pcCheckinIds.length > 0) {
        const checkins = await db.checkin.findMany({
          where: { id: { in: pcCheckinIds }, task_type: "BUILD_PC" },
          select: { id: true, image_url: true },
        });

        for (const checkin of checkins) {
          if (checkin.image_url && checkin.image_url !== "excel-parsed") {
            try {
              await deleteImage(checkin.image_url);
            } catch {
              /* ignore */
            }
          }
        }

        await db.checkin.updateMany({
          where: { id: { in: pcCheckinIds }, task_type: "BUILD_PC" },
          data: {
            status: "REJECTED",
            reject_reason: rejectReason,
            reviewed_by: session.user.id,
          },
        });
      }
    }

    revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[admin/build-pc/action]", err);
    return NextResponse.json({ error: "Lỗi server." }, { status: 500 });
  }
}
