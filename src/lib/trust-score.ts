import { db } from "@/lib/db";

export type TrustScoreAction = 'AUTO_APPROVED' | 'APPROVED' | 'REJECTED' | 'MISSED' | 'AI_FRAUD';

export async function updateUserTrustScore(userId: string, action: TrustScoreAction) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { trust_score: true, total_auto_approved: true, total_rejected: true }
  });

  if (!user) return null;

  let change = 0;
  let autoApprovedIncrement = 0;
  let rejectedIncrement = 0;

  switch (action) {
    case 'AUTO_APPROVED':
      change = 2;
      autoApprovedIncrement = 1;
      break;
    case 'APPROVED':
      change = 1;
      break;
    case 'MISSED':
      change = -5;
      break;
    case 'REJECTED':
      change = -15;
      rejectedIncrement = 1;
      break;
    case 'AI_FRAUD':
      change = -25;
      break;
  }

  const newScore = Math.max(0, Math.min(100, user.trust_score + change));

  return await db.user.update({
    where: { id: userId },
    data: {
      trust_score: newScore,
      total_auto_approved: user.total_auto_approved + autoApprovedIncrement,
      total_rejected: user.total_rejected + rejectedIncrement,
    }
  });
}
