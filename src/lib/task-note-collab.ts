import { db } from "@/lib/db";

export const LOCK_TTL_MS = 30_000;
export const PRESENCE_TTL_MS = 20_000;

export type BlockLockInfo = {
  blockId: string;
  userId: string;
  userName: string | null;
  expiresAt: string;
};

export type ViewerInfo = {
  userId: string;
  userName: string | null;
  expiresAt: string;
};

function expiresAtFromNow(ttlMs: number) {
  return new Date(Date.now() + ttlMs);
}

export async function cleanupExpiredCollabState(taskId: string) {
  const now = new Date();
  await Promise.all([
    db.taskNoteBlockLock.deleteMany({
      where: { task_id: taskId, expires_at: { lt: now } },
    }),
    db.taskNotePresence.deleteMany({
      where: { task_id: taskId, expires_at: { lt: now } },
    }),
  ]);
}

export async function getActiveLocks(taskId: string): Promise<BlockLockInfo[]> {
  const now = new Date();
  const locks = await db.taskNoteBlockLock.findMany({
    where: { task_id: taskId, expires_at: { gt: now } },
  });
  return locks.map((l) => ({
    blockId: l.block_id,
    userId: l.user_id,
    userName: l.user_name,
    expiresAt: l.expires_at.toISOString(),
  }));
}

export async function getActiveViewers(taskId: string): Promise<ViewerInfo[]> {
  const now = new Date();
  const viewers = await db.taskNotePresence.findMany({
    where: { task_id: taskId, expires_at: { gt: now } },
  });
  return viewers.map((v) => ({
    userId: v.user_id,
    userName: v.user_name,
    expiresAt: v.expires_at.toISOString(),
  }));
}

export async function claimBlockLock(
  taskId: string,
  blockId: string,
  userId: string,
  userName: string | null
): Promise<{ ok: true } | { ok: false; lockedBy: string | null }> {
  const now = new Date();
  const existing = await db.taskNoteBlockLock.findUnique({
    where: { task_id_block_id: { task_id: taskId, block_id: blockId } },
  });

  if (
    existing &&
    existing.expires_at > now &&
    existing.user_id !== userId
  ) {
    return { ok: false, lockedBy: existing.user_name || "Ai đó" };
  }

  await db.taskNoteBlockLock.upsert({
    where: { task_id_block_id: { task_id: taskId, block_id: blockId } },
    update: {
      user_id: userId,
      user_name: userName,
      expires_at: expiresAtFromNow(LOCK_TTL_MS),
    },
    create: {
      task_id: taskId,
      block_id: blockId,
      user_id: userId,
      user_name: userName,
      expires_at: expiresAtFromNow(LOCK_TTL_MS),
    },
  });

  return { ok: true };
}

export async function releaseUserLocks(taskId: string, userId: string, blockId?: string) {
  await db.taskNoteBlockLock.deleteMany({
    where: {
      task_id: taskId,
      user_id: userId,
      ...(blockId ? { block_id: blockId } : {}),
    },
  });
}

export async function touchPresence(
  taskId: string,
  userId: string,
  userName: string | null
) {
  await db.taskNotePresence.upsert({
    where: { task_id_user_id: { task_id: taskId, user_id: userId } },
    update: {
      user_name: userName,
      expires_at: expiresAtFromNow(PRESENCE_TTL_MS),
    },
    create: {
      task_id: taskId,
      user_id: userId,
      user_name: userName,
      expires_at: expiresAtFromNow(PRESENCE_TTL_MS),
    },
  });
}

export async function leavePresence(taskId: string, userId: string) {
  await db.taskNotePresence.deleteMany({
    where: { task_id: taskId, user_id: userId },
  });
}
