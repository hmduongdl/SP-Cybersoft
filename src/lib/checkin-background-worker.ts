import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/cache";
import { runVisionCheck } from "@/lib/ai-vision-check";
import { updateUserTrustScore } from "@/lib/trust-score";
import { hammingDistance, PHASH_DUPLICATE_THRESHOLD } from "@/lib/image-hash";

const AUTO_APPROVE_TRUST_THRESHOLD = 70;
const AUTO_APPROVE_CONFIDENCE_THRESHOLD = 0.82;

async function loadImageAsBase64(imageUrl: string): Promise<{ base64Image: string; mimeType: string } | null> {
  if (imageUrl.startsWith("data:image/")) {
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return { mimeType: match[1], base64Image: match[2] };
  }

  if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
    return null;
  }

  const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
  if (!imageRes.ok) {
    throw new Error(`Image fetch failed with status ${imageRes.status}`);
  }

  const arrayBuffer = await imageRes.arrayBuffer();
  return {
    base64Image: Buffer.from(arrayBuffer).toString("base64"),
    mimeType: imageRes.headers.get("content-type") || "image/jpeg",
  };
}

export async function processBackgroundCheckinReview(checkinId: string) {
  console.log(`[CheckinBackgroundWorker] Starting AI review for checkin ${checkinId}...`);

  try {
    const checkin = await db.checkin.findUnique({
      where: { id: checkinId },
      include: {
        post: true,
        user: true,
      },
    });

    if (!checkin || !checkin.post) {
      console.warn(`[CheckinBackgroundWorker] Missing checkin/post for ${checkinId}.`);
      return;
    }

    if (checkin.status !== "PENDING") {
      console.log(`[CheckinBackgroundWorker] Skip ${checkinId}; status is ${checkin.status}.`);
      return;
    }

    const loadedImage = await loadImageAsBase64(checkin.image_url);
    if (!loadedImage) {
      await db.checkin.update({
        where: { id: checkin.id },
        data: {
          is_ai_flagged: true,
          ai_analysis_reason: "AI không tải được ảnh minh chứng để phân tích. Cần Admin duyệt thủ công.",
        },
      });
      return;
    }

    const visionResult = await runVisionCheck({
      base64Image: loadedImage.base64Image,
      mimeType: loadedImage.mimeType,
      expectedName: checkin.user.name || checkin.user.username,
      expectedTitle: checkin.post.title,
      expectedUrl: checkin.post.url,
    });

    const trustScore = checkin.user.trust_score ?? 0;
    let isDuplicateImage = false;

    if (checkin.image_phash && checkin.post_id) {
      const approvedCheckins = await db.checkin.findMany({
        where: {
          id: { not: checkin.id },
          post_id: checkin.post_id,
          status: { in: ["AUTO_APPROVED", "APPROVED"] },
          image_phash: { not: null },
        },
        select: { image_phash: true },
        take: 200,
      });

      isDuplicateImage = approvedCheckins.some(
        (item) =>
          item.image_phash &&
          hammingDistance(checkin.image_phash!, item.image_phash) <= PHASH_DUPLICATE_THRESHOLD
      );
    }

    const canAutoApprove =
      !isDuplicateImage &&
      trustScore > AUTO_APPROVE_TRUST_THRESHOLD &&
      visionResult.isValid &&
      visionResult.confidence >= AUTO_APPROVE_CONFIDENCE_THRESHOLD &&
      visionResult.isFacebookUI &&
      visionResult.isPublicMode;

    await db.checkin.update({
      where: { id: checkin.id },
      data: {
        status: canAutoApprove ? "AUTO_APPROVED" : "PENDING",
        is_ai_flagged: !visionResult.isValid || !visionResult.isFacebookUI,
        ai_confidence: visionResult.confidence,
        ai_analysis_reason: canAutoApprove
          ? `[AI Auto] ${visionResult.reason}`
          : `[AI Pending] ${visionResult.reason}${
              isDuplicateImage
                ? " Ảnh có dấu hiệu trùng với minh chứng đã được duyệt trước đó."
                : trustScore > AUTO_APPROVE_TRUST_THRESHOLD
                ? ""
                : ` Trust Score ${trustScore}/100 chưa vượt ngưỡng ${AUTO_APPROVE_TRUST_THRESHOLD}.`
            }`,
        ai_extracted_username: visionResult.extractedUsername,
        ai_extracted_title: visionResult.extractedTitle,
        ai_is_facebook_ui: visionResult.isFacebookUI,
        ai_is_public_mode: visionResult.isPublicMode,
      },
    });

    if (canAutoApprove) {
      await updateUserTrustScore(checkin.user_id, "AUTO_APPROVED", checkin.post_id ?? undefined);
    }

    revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");
    revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
    revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");

    console.log(
      `[CheckinBackgroundWorker] Finished ${checkinId} with status ${canAutoApprove ? "AUTO_APPROVED" : "PENDING"}.`
    );
  } catch (error) {
    console.error(`[CheckinBackgroundWorker] Failed to process ${checkinId}:`, error);

    await db.checkin.update({
      where: { id: checkinId },
      data: {
        status: "PENDING",
        is_ai_flagged: true,
        ai_analysis_reason: "Gặp lỗi hệ thống trong quá trình AI duyệt nền. Cần Admin duyệt thủ công.",
      },
    });
  }
}
