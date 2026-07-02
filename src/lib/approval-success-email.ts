import { render } from "@react-email/render";
import { createElement } from "react";
import { ApprovalSuccessEmail, type ApprovalSuccessEmailItem } from "@/emails/approval-success-email";
import { buildAppUrl } from "@/lib/app-url";
import { sendMail } from "@/lib/mailer";

const DEFAULT_BATCH_WINDOW_MS = 5 * 60 * 1000;

interface QueueApprovedReviewEmailParams {
  to?: string | null;
  userName?: string | null;
  itemTitle: string;
  itemType: string;
  reviewPath: string;
  analysis?: string | null;
  recipientTrustScore?: number | null;
  recipientIsVerified?: boolean | null;
}

interface ApprovalEmailQueue {
  to: string;
  userName?: string | null;
  items: ApprovalSuccessEmailItem[];
  timer: ReturnType<typeof setTimeout>;
}

const globalForApprovalEmail = globalThis as typeof globalThis & {
  __approvalSuccessEmailQueues?: Map<string, ApprovalEmailQueue>;
};

function getQueues(): Map<string, ApprovalEmailQueue> {
  if (!globalForApprovalEmail.__approvalSuccessEmailQueues) {
    globalForApprovalEmail.__approvalSuccessEmailQueues = new Map();
  }

  return globalForApprovalEmail.__approvalSuccessEmailQueues;
}

function getBatchWindowMs(): number {
  const configured = Number(process.env.APPROVAL_EMAIL_BATCH_WINDOW_MS);
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_BATCH_WINDOW_MS;
}

function getQueueKey(to: string): string {
  return to.trim().toLowerCase();
}

function mergeItem(items: ApprovalSuccessEmailItem[], nextItem: ApprovalSuccessEmailItem): ApprovalSuccessEmailItem[] {
  const existingIndex = items.findIndex((item) => item.reviewUrl === nextItem.reviewUrl);
  if (existingIndex === -1) return [...items, nextItem];

  const merged = [...items];
  merged[existingIndex] = nextItem;
  return merged;
}

function canSendApprovalEmail(params: Pick<QueueApprovedReviewEmailParams, "recipientTrustScore" | "recipientIsVerified">): boolean {
  return params.recipientIsVerified === true && (params.recipientTrustScore ?? 0) > 70;
}

async function flushApprovedReviewEmail(key: string): Promise<void> {
  const queues = getQueues();
  const queue = queues.get(key);
  if (!queue) return;

  queues.delete(key);

  const itemCount = queue.items.length;
  const subject =
    itemCount === 1
      ? `[SP-Cybersoft] Bài "${queue.items[0].title}" đã được duyệt thành công`
      : `[SP-Cybersoft] ${itemCount} bài của bạn đã được duyệt thành công`;

  try {
    const html = await render(
      createElement(ApprovalSuccessEmail, {
        userName: queue.userName,
        items: queue.items,
      })
    );

    await sendMail({ to: queue.to, subject, html });
  } catch (error) {
    console.error("[approval-success-email] Failed to send approval email:", error);
  }
}

export function queueApprovedReviewEmail(params: QueueApprovedReviewEmailParams): void {
  const to = params.to?.trim();
  if (!to) return;
  if (!canSendApprovalEmail(params)) return;

  const key = getQueueKey(to);
  const queues = getQueues();
  const reviewUrl = buildAppUrl(params.reviewPath);
  const nextItem: ApprovalSuccessEmailItem = {
    title: params.itemTitle || "Bài nộp",
    itemType: params.itemType || "Bài duyệt",
    reviewUrl,
    analysis: params.analysis?.trim() || null,
  };
  const existingQueue = queues.get(key);

  if (existingQueue) {
    existingQueue.items = mergeItem(existingQueue.items, nextItem);
    existingQueue.userName = existingQueue.userName || params.userName;
    return;
  }

  const timer = setTimeout(() => {
    void flushApprovedReviewEmail(key);
  }, getBatchWindowMs());

  queues.set(key, {
    to,
    userName: params.userName,
    items: [nextItem],
    timer,
  });
}
