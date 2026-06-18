import { db } from "./db";

const BASE_SCORE = 50;
const MAX_SCORE = 100;
const MIN_SCORE = 0;

const APPROVED_POINTS = 8;
const REJECTED_POINTS = 12;
const RECENT_BONUS_MULTIPLIER = 1.5;

function isRecent(date: Date): boolean {
  const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince <= 30;
}

export async function calculateTrustScore(userId: string): Promise<number> {
  const checkins = await db.checkin.findMany({
    where: { user_id: userId, status: { in: ["APPROVED", "AUTO_APPROVED", "REJECTED"] } },
    select: { status: true, ai_confidence: true, submitted_at: true },
    orderBy: { submitted_at: "desc" },
  });

  if (checkins.length === 0) return BASE_SCORE;

  let score = BASE_SCORE;

  for (const c of checkins) {
    const recent = isRecent(c.submitted_at);
    const multiplier = recent ? RECENT_BONUS_MULTIPLIER : 1;

    if (c.status === "APPROVED" || c.status === "AUTO_APPROVED") {
      const confidenceWeight = c.ai_confidence != null ? (0.5 + c.ai_confidence * 0.5) : 1;
      score += APPROVED_POINTS * multiplier * confidenceWeight;
    } else if (c.status === "REJECTED") {
      score -= REJECTED_POINTS * multiplier;
    }
  }

  return Math.round(Math.max(MIN_SCORE, Math.min(MAX_SCORE, score)));
}

export async function updateUserTrustScore(userId: string): Promise<number> {
  const score = await calculateTrustScore(userId);

  await db.user.update({
    where: { id: userId },
    data: { trust_score: score },
  });

  return score;
}

export async function recalculateTrustScoresForUsers(userIds: string[]): Promise<void> {
  for (const userId of userIds) {
    await updateUserTrustScore(userId);
  }
}
