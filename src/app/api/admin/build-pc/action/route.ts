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
import { createNotification } from "@/lib/notifications";

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
            select: { id: true, user_id: true, exercise_id: true, image_urls: true, parts_answer: true },
          })
        : [];

      for (const submission of subs) {
        const partsAnswer = getSubmissionAnswerObject(submission.parts_answer);

        await db.pcSubmission.update({
          where: { id: submission.id },
          data: {
            status: "PENDING",
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

        // Read the AI's final result — the compatibility function already evaluated everything
        const processed = await db.pcSubmission.findUnique({
          where: { id: submission.id },
          select: { status: true, parts_answer: true },
        });
        const processedParts = getJsonObject(processed?.parts_answer);
        const aiApproved = processedParts.is_approved === true;
        const score = typeof processedParts.temp_ai_score === "number" ? processedParts.temp_ai_score : null;
        const aiFeedback = typeof processedParts.temp_ai_feedback === "string" ? processedParts.temp_ai_feedback : "";

        // Follow AI's decision
        const finalStatus = aiApproved ? "AUTO_APPROVED" : "REJECTED";
        const rejectReason = aiApproved ? null : (processedParts.reason as string) || "Không đạt yêu cầu.";

        await db.pcSubmission.update({
          where: { id: submission.id },
          data: {
            status: finalStatus,
            reject_reason: rejectReason,
            ai_score: score,
            ai_feedback: aiFeedback || null,
            reviewed_by: session.user.id,
            parts_answer: {
              ...processedParts,
              is_analyzing: false,
              analysis_step: "done",
              analysis_message: processedParts.reason || "Hoàn tất phân tích tự động.",
              reviewed_locally_at: new Date().toISOString(),
            },
          },
        });
      }

      // Gửi thông báo cho các bài nộp đã được AI xử lý
      const processedSubs = subs.length > 0 ? await db.pcSubmission.findMany({
        where: { id: { in: pcSubmissionIds } },
        select: { id: true, user_id: true, status: true },
      }) : [];
      const exerciseTitles = subs.length > 0 ? await db.pcExercise.findMany({
        where: { id: { in: subs.map(s => s.exercise_id) } },
        select: { id: true, title: true },
      }) : [];
      const titleMap = new Map(exerciseTitles.map(e => [e.id, e.title]));
      for (const ps of processedSubs) {
        const isApproved = ps.status === "AUTO_APPROVED";
        const exTitle = titleMap.get(subs.find(s => s.id === ps.id)?.exercise_id || "") || "Build PC";
        await createNotification({
          userId: ps.user_id,
          type: isApproved ? "PC_BUILD_AUTO_APPROVED" : "PC_BUILD_REJECTED",
          title: isApproved ? "✅ Bài tập Build PC đã được duyệt" : "❌ Bài tập Build PC cần điều chỉnh",
          message: isApproved
            ? `Bài tập "${exTitle}" của bạn đã được AI duyệt tự động.`
            : `Bài tập "${exTitle}" của bạn cần điều chỉnh: Vui lòng xem lại và nộp lại.`,
          referenceId: ps.id,
          referenceType: "pc_submission",
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
            status: "PENDING",
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
          select: { status: true, build_data: true },
        });
        const processedData = getJsonObject(processed?.build_data);
        const aiApproved = processedData.is_approved === true;
        const finalStatus = aiApproved ? "AUTO_APPROVED" : "REJECTED";
        const rejectReason = aiApproved ? null : (processedData.reason as string) || "Không đạt yêu cầu.";

        await db.checkin.update({
          where: { id: checkin.id },
          data: {
            status: finalStatus,
            reject_reason: rejectReason,
            reviewed_by: session.user.id,
            build_data: {
              ...processedData,
              is_analyzing: false,
              analysis_step: "done",
              analysis_message: processedData.reason || "Hoàn tất phân tích tự động.",
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

      // Gửi thông báo duyệt thủ công cho submissions
      if (subs.length > 0) {
        const exIds = [...new Set(subs.map(s => s.exercise_id))];
        const exercises = exIds.length > 0 ? await db.pcExercise.findMany({
          where: { id: { in: exIds } },
          select: { id: true, title: true },
        }) : [];
        const titleMap = new Map(exercises.map(e => [e.id, e.title]));
        await Promise.all(
          subs.map(sub =>
            createNotification({
              userId: sub.user_id,
              type: "PC_BUILD_APPROVED",
              title: "✅ Bài tập Build PC đã được duyệt",
              message: `Bài tập "${titleMap.get(sub.exercise_id) || 'Build PC'}" của bạn đã được quản trị viên duyệt.`,
              referenceId: sub.id,
              referenceType: "pc_submission",
            })
          )
        );
      }

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
            select: { id: true, user_id: true, exercise_id: true, image_urls: true },
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

        // Gửi thông báo từ chối cho submissions
        const exIds = [...new Set(subs.map(s => s.exercise_id))];
        const exercises = exIds.length > 0 ? await db.pcExercise.findMany({
          where: { id: { in: exIds } },
          select: { id: true, title: true },
        }) : [];
        const titleMap = new Map(exercises.map(e => [e.id, e.title]));
        await Promise.all(
          subs.map(sub =>
            createNotification({
              userId: sub.user_id,
              type: "PC_BUILD_REJECTED",
              title: "❌ Bài tập Build PC cần điều chỉnh",
              message: `Bài tập "${titleMap.get(sub.exercise_id) || 'Build PC'}" của bạn đã bị từ chối. Lý do: ${rejectReason || "Không đạt yêu cầu."}`,
              referenceId: sub.id,
              referenceType: "pc_submission",
            })
          )
        );
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

    // Collect results for client-side update
    const results = action === "PROCESS"
      ? await db.pcSubmission.findMany({
          where: { id: { in: pcSubmissionIds } },
          select: { id: true, status: true, ai_score: true, ai_feedback: true, reject_reason: true },
        })
      : [];

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    console.error("[admin/build-pc/action]", err);
    return NextResponse.json({ error: "Lỗi server." }, { status: 500 });
  }
}
