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

function toCacheKey(workspaceId: string | null) {
  return !workspaceId || workspaceId === "ALL" ? "ALL" : workspaceId;
}

/** Tasks của workspace đang xem — fallback cache khi state race sau fetch/switch. */
function selectWorkspaceTasks(state: {
  tasks: Task[];
  tasksWorkspaceId: string | null;
  currentWorkspaceId: string | null;
  workspaceCache: Record<string, { tasks: Task[] } | undefined>;
}): readonly Task[] {
  const wsId = state.currentWorkspaceId ?? "ALL";
  if (state.tasksWorkspaceId === wsId) {
    return state.tasks;
  }
  return state.workspaceCache[toCacheKey(wsId)]?.tasks ?? EMPTY_TASKS;
}

/** Tasks đã lọc theo workspace + filter sidebar (dùng cho List/Kanban/Calendar). */
export function useFilteredTasks() {
  const { data: session } = useSession();
  const workspaceTasks = useTaskStore(selectWorkspaceTasks);
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
  const tasks = useTaskStore(selectWorkspaceTasks);
  const currentWorkspaceId = useTaskStore((s) => s.currentWorkspaceId);

  return useMemo(
    () => filterTasksByWorkspace(tasks, currentWorkspaceId),
    [tasks, currentWorkspaceId]
  );
}

/** Mọi task được assign cho user trên mọi workspace — dùng cho thẻ Việc của tôi. */
export function useMyTasks() {
  const { data: session } = useSession();
  const allTasks = useTaskStore((s) => s.workspaceCache["ALL"]?.tasks ?? EMPTY_TASKS);
  const workspaceTasks = useTaskStore(selectWorkspaceTasks);
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
