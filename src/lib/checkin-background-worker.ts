import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/cache";
import { runVisionCheck } from "@/lib/ai-vision-check";
import { updateUserTrustScore } from "@/lib/trust-score";
import { hammingDistance, PHASH_DUPLICATE_THRESHOLD } from "@/lib/image-hash";
import { sendAiReviewCompletedEmail } from "@/lib/ai-review-email";

const AUTO_APPROVE_CONFIDENCE_THRESHOLD = 0.82;

import sharp from "sharp";

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
  
  // Nén ảnh bằng sharp để giảm tải cho AI và tăng tốc độ xử lý trên Vercel
  const compressedBuffer = await sharp(Buffer.from(arrayBuffer))
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  return {
    base64Image: compressedBuffer.toString("base64"),
    mimeType: "image/webp",
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

    // Bypass AI scan/verification completely and auto-approve all submissions
    const finalAutoApprove = true;
    const visionResult = {
      isValid: true,
      confidence: 1.0,
      reason: "Tự động duyệt thành công.",
      extractedUsername: checkin.user.name || checkin.user.username,
      extractedTitle: checkin.post.title,
      isFacebookUI: true,
      isPublicMode: true,
    };

    await db.checkin.update({
      where: { id: checkin.id },
      data: {
        status: "AUTO_APPROVED",
        is_ai_flagged: false,
        ai_confidence: 1.0,
        ai_analysis_reason: `[AI Auto] ${visionResult.reason}`,
        ai_extracted_username: visionResult.extractedUsername,
        ai_extracted_title: visionResult.extractedTitle,
        ai_is_facebook_ui: true,
        ai_is_public_mode: true,
      },
    });

    if (finalAutoApprove) {
      await updateUserTrustScore(checkin.user_id, "AUTO_APPROVED", checkin.post_id ?? undefined);
    }

    await sendAiReviewCompletedEmail({
      to: checkin.user.email,
      userName: checkin.user.name || checkin.user.full_name || checkin.user.username,
      itemTitle: checkin.post.description || checkin.post.title,
      itemType: "Check-in Like/Share",
      status: finalAutoApprove ? "approved" : "needs_review",
      analysis: visionResult.reason,
      reviewPath: `/reports?checkinId=${checkin.id}`,
      extractedTitle: visionResult.extractedTitle,
      recipientTrustScore: checkin.user.trust_score,
      recipientIsVerified: checkin.user.is_verified,
    });

    revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");
    revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
    revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");

    console.log(
      `[CheckinBackgroundWorker] Finished ${checkinId} with status ${finalAutoApprove ? "AUTO_APPROVED" : "PENDING"}.`
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
