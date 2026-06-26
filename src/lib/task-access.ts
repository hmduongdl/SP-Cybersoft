import { db } from "@/lib/db";

export async function canAccessTask(userId: string, taskId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      workspace: { select: { is_public: true, owner_id: true } },
      assignees: { select: { user_id: true } },
    },
  });

  if (!task) return false;
  if (task.creator_id === userId) return true;
  if (task.assignees.some((a) => a.user_id === userId)) return true;
  if (task.workspace.is_public) return true;
  if (task.workspace.owner_id === userId) return true;

  return false;
}
