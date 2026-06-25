import { useMemo } from "react";
import { useSession } from "next-auth/react";
import type { Task } from "@/store/useTaskStore";
import {
  filterTasks,
  filterTasksByWorkspace,
  useTaskStore,
} from "@/store/useTaskStore";

// Stable empty array ref để tránh Zustand re-render vô hạn
const EMPTY_TASKS: readonly Task[] = [];

/** Tasks đã lọc theo workspace + filter sidebar (dùng cho List/Kanban/Calendar). */
export function useFilteredTasks() {
  const { data: session } = useSession();
  const workspaceTasks = useTaskStore((s) =>
    s.tasksWorkspaceId === s.currentWorkspaceId ? s.tasks : EMPTY_TASKS
  );
  const allTasks = useTaskStore((s) => s.workspaceCache["ALL"]?.tasks ?? EMPTY_TASKS);
  const currentWorkspaceId = useTaskStore((s) => s.currentWorkspaceId);
  const activeFilter = useTaskStore((s) => s.activeFilter);
  const selectedTagId = useTaskStore((s) => s.selectedTagId);
  const tags = useTaskStore((s) => s.tags);
  const currentUserId = session?.user?.id;

  const sourceTasks =
    activeFilter === "my_tasks"
      ? allTasks.length > 0
        ? allTasks
        : workspaceTasks
      : workspaceTasks;

  return useMemo(
    () =>
      filterTasks(sourceTasks, {
        activeFilter,
        currentWorkspaceId,
        selectedTagId,
        tags,
        currentUserId,
      }),
    [sourceTasks, currentWorkspaceId, activeFilter, selectedTagId, tags, currentUserId]
  );
}

/** Tasks thuộc workspace hiện tại, chưa áp filter sidebar (dùng cho thẻ thống kê). */
export function useWorkspaceTasks() {
  const tasks = useTaskStore((s) =>
    s.tasksWorkspaceId === s.currentWorkspaceId ? s.tasks : EMPTY_TASKS
  );
  const currentWorkspaceId = useTaskStore((s) => s.currentWorkspaceId);

  return useMemo(
    () => filterTasksByWorkspace(tasks, currentWorkspaceId),
    [tasks, currentWorkspaceId]
  );
}

/** Mọi task user tham gia (assignee/creator) trên mọi workspace — dùng cho thẻ Việc của tôi. */
export function useMyTasks() {
  const { data: session } = useSession();
  const allTasks = useTaskStore((s) => s.workspaceCache["ALL"]?.tasks ?? EMPTY_TASKS);
  const workspaceTasks = useTaskStore((s) =>
    s.tasksWorkspaceId === s.currentWorkspaceId ? s.tasks : EMPTY_TASKS
  );
  const currentUserId = session?.user?.id;

  const sourceTasks = allTasks.length > 0 ? allTasks : workspaceTasks;

  return useMemo(
    () =>
      filterTasks(sourceTasks, {
        activeFilter: "my_tasks",
        currentWorkspaceId: "ALL",
        selectedTagId: null,
        tags: [],
        currentUserId,
      }),
    [sourceTasks, currentUserId]
  );
}
