import { db } from "@/lib/db";

export type TrustScoreAction = 'AUTO_APPROVED' | 'APPROVED' | 'REJECTED' | 'MISSED' | 'AI_FRAUD';

export async function updateUserTrustScore(userId: string, action: TrustScoreAction, postId?: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { trust_score: true, total_auto_approved: true, total_rejected: true, department: true }
  });

  if (!user) return null;

  let change = 0;
  let autoApprovedIncrement = 0;
  let rejectedIncrement = 0;

  if (action === 'AUTO_APPROVED' || action === 'APPROVED') {
    const totalUsers = await db.user.count({ where: { is_active: true } });
    let rank = 1;
    let streakBonus = 0;
    
    if (postId) {
      rank = await db.checkin.count({
        where: {
          post_id: postId,
          status: { in: ['AUTO_APPROVED', 'APPROVED'] },
        }
      });
      rank = Math.max(1, rank);
      
      const currentPost = await db.post.findUnique({ where: { id: postId }, select: { start_at: true } });
      if (currentPost) {
        // Tìm bài viết gần nhất trước đó
        const previousPost = await db.post.findFirst({
          where: {
            start_at: { lt: currentPost.start_at },
            OR: [
              { team: 'ALL' },
              { team: user.department as any }
            ]
          },
          orderBy: { start_at: 'desc' }
        });
        
        if (previousPost) {
          const completedPrev = await db.checkin.findFirst({
            where: {
              user_id: userId,
              post_id: previousPost.id,
              status: { in: ['AUTO_APPROVED', 'APPROVED'] }
            }
          });
          if (completedPrev) {
            streakBonus = 1;
          }
        }
      }
    }

    // Tính tỉ lệ hoàn thành (Completion Rate)
    const totalAssigned = await db.post.count({
      where: {
        start_at: { lte: new Date() },
        OR: [
          { team: 'ALL' },
          { team: user.department as any }
        ]
      }
    });
    const totalCompleted = await db.checkin.count({
      where: { user_id: userId, status: { in: ['AUTO_APPROVED', 'APPROVED'] } }
    });
    const completionRate = totalAssigned > 0 ? totalCompleted / totalAssigned : 1;

    let baseChange = Math.max(1, totalUsers - rank);
    
    // Nhân với tỉ lệ hoàn thành
    baseChange = Math.max(1, Math.round(baseChange * completionRate));
    
    // Tổng điểm cộng = Điểm rank (đã x tỉ lệ) + Thưởng chuỗi
    change = baseChange + streakBonus;

    if (action === 'AUTO_APPROVED') {
      autoApprovedIncrement = 1;
    }
  } else if (action === 'MISSED') {
    change = -15;
  } else if (action === 'REJECTED') {
    change = -5;
    rejectedIncrement = 1;
  } else if (action === 'AI_FRAUD') {
    change = -25;
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
