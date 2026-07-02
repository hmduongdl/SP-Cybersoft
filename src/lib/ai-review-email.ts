import { render } from "@react-email/render";
import { createElement } from "react";
import { AiReviewEmail } from "@/emails/ai-review-email";
import { buildAppUrl } from "@/lib/app-url";
import { queueApprovedReviewEmail } from "@/lib/approval-success-email";
import { sendMail } from "@/lib/mailer";

type AiReviewStatus = "approved" | "rejected" | "needs_review" | "completed";

export interface SendAiReviewEmailParams {
  to?: string | null;
  userName?: string | null;
  itemTitle: string;
  itemType: string;
  analysis?: string | null;
  status: AiReviewStatus;
  reviewPath: string;
  extractedTitle?: string | null;
  recipientTrustScore?: number | null;
  recipientIsVerified?: boolean | null;
}

const STATUS_LABELS: Record<AiReviewStatus, string> = {
  approved: "Đã được AI duyệt hợp lệ",
  rejected: "AI đánh dấu cần điều chỉnh",
  needs_review: "AI đã phân tích, cần Admin kiểm tra thêm",
  completed: "AI đã hoàn tất phân tích",
};

function canSendReviewEmail(params: Pick<SendAiReviewEmailParams, "recipientTrustScore" | "recipientIsVerified">): boolean {
  return params.recipientIsVerified === true && (params.recipientTrustScore ?? 0) > 70;
}

export async function sendAiReviewCompletedEmail(params: SendAiReviewEmailParams): Promise<void> {
  const to = params.to?.trim();
  if (!to) return;
  if (!canSendReviewEmail(params)) return;

  if (params.status === "approved") {
    queueApprovedReviewEmail({
      to,
      userName: params.userName,
      itemTitle: params.itemTitle,
      itemType: params.itemType,
      reviewPath: params.reviewPath,
      analysis: params.analysis,
      recipientTrustScore: params.recipientTrustScore,
      recipientIsVerified: params.recipientIsVerified,
    });
    return;
  }

  const reviewUrl = buildAppUrl(params.reviewPath);
  const itemTitle = params.itemTitle || "Bài nộp";
  const analysis = params.analysis?.trim() || "AI đã hoàn tất phân tích bài nộp của bạn.";
  const statusLabel = STATUS_LABELS[params.status];
  const subject = `[SP-Cybersoft] AI đã phân tích xong: ${itemTitle}`;

  try {
    const html = await render(
      createElement(AiReviewEmail, {
        userName: params.userName,
        itemTitle,
        itemType: params.itemType,
        statusLabel,
        analysis,
        reviewUrl,
        extractedTitle: params.extractedTitle,
      })
    );

    await sendMail({ to, subject, html });
  } catch (error) {
    console.error("[ai-review-email] Failed to send AI review email:", error);
  }
}
