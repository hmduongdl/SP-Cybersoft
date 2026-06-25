import { create } from 'zustand';

// --- Types ---
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  owner_id: string;
  is_default?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  workspace_id: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  due_date?: string | null;
  priority?: 'high' | 'mid' | 'low';
  assignees: { id: string; name: string; avatar_url: string | null }[];
  workspace_id: string;
  creator_id: string;
  creator?: { name: string; avatar_url: string | null };
  is_archived: boolean;
  createdAt: string;
  tags?: Tag[];
  customProperties?: {
    id: string;
    task_id: string;
    definition_id: string;
    value_text?: string | null;
    value_number?: number | null;
    value_boolean?: boolean | null;
    value_date?: string | null;
    definition: {
      id: string;
      name: string;
      type: string;
      options?: string[] | null;
    };
  }[];
  note?: {
    id: string;
    content: any;
  };
}

/** Một filter duy nhất — không tách timeFilter / filterStatus. */
export type TaskFilter = 'all' | 'my_tasks' | 'today' | 'upcoming';

/** @deprecated Dùng TaskFilter */
export type FilterStatus = TaskFilter;

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

// --- Constants ---
const PAGE_SIZE = 100;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function toCacheKey(workspaceId: string) {
  return workspaceId === 'ALL' ? 'ALL' : workspaceId;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// --- Pure filtering helpers ---
export interface TaskFilterParams {
  activeFilter: TaskFilter;
  currentWorkspaceId: string | null;
  selectedTagId: string | null;
  tags: Tag[];
  currentUserId?: string;
}

/** Lọc theo workspace — luôn chạy trước các filter khác. */
export function filterTasksByWorkspace(tasks: readonly Task[], workspaceId: string | null): Task[] {
  if (!workspaceId || workspaceId === 'ALL') return tasks as Task[];
  return tasks.filter((t) => t.workspace_id === workspaceId);
}

/** Task thuộc về user (được assign hoặc là người tạo). */
export function isMyTask(task: Task, currentUserId?: string): boolean {
  if (!currentUserId) return false;
  const isAssigned = task.assignees?.some((a) => a.id === currentUserId) ?? false;
  const isCreator = task.creator_id === currentUserId;
  return isAssigned || isCreator;
}

export function filterTasks(tasks: readonly Task[], params: TaskFilterParams): Task[] {
  const { activeFilter, currentWorkspaceId, selectedTagId, tags, currentUserId } = params;
  const today = startOfDay(new Date());

  let result: Task[];

  if (activeFilter === 'my_tasks') {
    // Việc của tôi: hiện mọi task user được assign / tạo — bỏ qua workspace đang chọn
    result = tasks.filter((t) => isMyTask(t, currentUserId));
  } else {
    result = filterTasksByWorkspace(tasks, currentWorkspaceId);

    switch (activeFilter) {
      case 'today':
        result = result.filter((t) => {
          if (!t.due_date) return t.status !== 'DONE';
          return startOfDay(new Date(t.due_date)).getTime() === today.getTime();
        });
        break;
      case 'upcoming':
        result = result.filter((t) => {
          if (!t.due_date) return t.status !== 'DONE';
          return startOfDay(new Date(t.due_date)).getTime() >= today.getTime();
        });
        break;
      case 'all':
      default:
        break;
    }
  }

  if (selectedTagId) {
    const selectedTag = tags.find((tag) => tag.id === selectedTagId);
    if (selectedTag) {
      const matchName = selectedTag.name.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.tags?.some((tag) => tag.name?.toLowerCase().trim() === matchName) ||
          (t as any).tag?.name?.toLowerCase().trim() === matchName
      );
    }
  }

  return result;
}

interface WorkspaceCache {
  tasks: Task[];
  tags: Tag[];
  total: number;
  fetchedAt: number;
}

interface TaskStoreState {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  currentWorkspace: Workspace | null;
  /** Workspace mà mảng `tasks` hiện tại thuộc về — chặn hiển thị nhầm khi race fetch. */
  tasksWorkspaceId: string | null;
  tasks: Task[];
  tags: Tag[];
  taskTotal: number;
  users: User[];
  currentView: 'list' | 'kanban' | 'calendar';
  isAIChatOpen: boolean;
  selectedTaskId: string | null;
  isAddTaskModalOpen: boolean;
  activeFilter: TaskFilter;
  selectedTagId: string | null;
  isTasksLoading: boolean;
  isLoadingMore: boolean;
  workspaceCache: Record<string, WorkspaceCache>;

  setCurrentWorkspaceId: (id: string | null) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setCurrentView: (view: 'list' | 'kanban' | 'calendar') => void;
  toggleAIChat: () => void;
  setAIChatOpen: (isOpen: boolean) => void;
  setSelectedTaskId: (id: string | null) => void;
  setAddTaskModalOpen: (isOpen: boolean) => void;
  setActiveFilter: (filter: TaskFilter) => void;
  /** @deprecated Dùng setActiveFilter */
  setFilter: (filter: TaskFilter) => void;
  setSelectedTagId: (tagId: string | null) => void;
  getFilteredTasks: (currentUserId?: string) => Task[];

  fetchWorkspaces: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  fetchTasks: (workspaceId: string, page?: number) => Promise<void>;
  fetchTags: (workspaceId: string) => Promise<void>;
  loadMoreTasks: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  /** Tải cache ALL (assignee/creator cross-workspace) — dùng cho filter Việc của tôi. */
  ensureAllTasksLoaded: () => Promise<void>;

  addTask: (taskData: Partial<Task>) => Promise<void>;
  updateTask: (taskId: string, taskData: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTaskNote: (taskId: string, noteContent: any) => Promise<void>;
}

function resolveWorkspace(workspaces: Workspace[], workspaceId: string | null) {
  if (!workspaceId || workspaceId === 'ALL') return null;
  return workspaces.find((w) => w.id === workspaceId) || null;
}

function taskBelongsToView(task: Task, workspaceId: string | null) {
  if (!workspaceId || workspaceId === 'ALL') return true;
  return task.workspace_id === workspaceId;
}

function invalidateWorkspaceCaches(cache: Record<string, WorkspaceCache>, ...keys: (string | undefined)[]) {
  const next = { ...cache };
  for (const key of keys) {
    if (key && next[key]) delete next[key];
  }
  if (next.ALL) delete next.ALL;
  return next;
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  workspaces: [],
  currentWorkspaceId: 'ALL',
  currentWorkspace: null,
  tasksWorkspaceId: null,
  tasks: [],
  tags: [],
  users: [],
  currentView: 'list',
  isAIChatOpen: false,
  selectedTaskId: null,
  isAddTaskModalOpen: false,
  isTasksLoading: false,
  isLoadingMore: false,
  taskTotal: 0,
  workspaceCache: {},
  activeFilter: 'all',
  selectedTagId: null,

  setCurrentWorkspaceId: (id) =>
    set((state) => ({
      currentWorkspaceId: id,
      currentWorkspace: resolveWorkspace(state.workspaces, id),
      activeFilter: 'all',
      selectedTagId: null,
    })),

  setCurrentWorkspace: (workspace) =>
    set({
      currentWorkspace: workspace,
      currentWorkspaceId: workspace ? workspace.id : null,
      activeFilter: 'all',
      selectedTagId: null,
    }),

  setCurrentView: (view) => set({ currentView: view }),
  toggleAIChat: () => set((state) => ({ isAIChatOpen: !state.isAIChatOpen })),
  setAIChatOpen: (isOpen) => set({ isAIChatOpen: isOpen }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setAddTaskModalOpen: (isOpen) => set({ isAddTaskModalOpen: isOpen }),
  setActiveFilter: (filter) => {
    set({ activeFilter: filter });
    if (filter === 'my_tasks') {
      void get().ensureAllTasksLoaded();
    }
  },
  setFilter: (filter) => {
    set({ activeFilter: filter });
    if (filter === 'my_tasks') {
      void get().ensureAllTasksLoaded();
    }
  },
  setSelectedTagId: (tagId) => set({ selectedTagId: tagId }),

  getFilteredTasks: (currentUserId?: string) => {
    const { tasks, tasksWorkspaceId, currentWorkspaceId, activeFilter, selectedTagId, tags, workspaceCache } = get();
    const workspaceTasks = tasksWorkspaceId === currentWorkspaceId ? tasks : [];
    const allTasks = workspaceCache['ALL']?.tasks ?? [];
    const sourceTasks =
      activeFilter === 'my_tasks'
        ? allTasks.length > 0
          ? allTasks
          : workspaceTasks
        : workspaceTasks;
    return filterTasks(sourceTasks, {
      activeFilter,
      currentWorkspaceId,
      selectedTagId,
      tags,
      currentUserId,
    });
  },

  fetchWorkspaces: async () => {
    try {
      const res = await fetch('/api/tasks/workspaces');
      if (!res.ok) return;
      const data = await res.json();
      const workspaces: Workspace[] = data.workspaces || [];
      set((state) => ({
        workspaces,
        currentWorkspace: resolveWorkspace(workspaces, state.currentWorkspaceId),
      }));
    } catch (error) {
      console.error('Failed to fetch workspaces', error);
    }
  },

  switchWorkspace: async (workspaceId: string) => {
    const state = get();
    const cacheKey = toCacheKey(workspaceId);
    const cached = state.workspaceCache[cacheKey];
    const now = Date.now();
    const isSameWorkspace = state.currentWorkspaceId === workspaceId;
    const hasFreshCache = cached && now - cached.fetchedAt < CACHE_TTL;

    if (isSameWorkspace && hasFreshCache && state.tasksWorkspaceId === workspaceId) {
      return;
    }

    const basePatch = {
      currentWorkspaceId: workspaceId,
      currentWorkspace: resolveWorkspace(state.workspaces, workspaceId),
      activeFilter: 'all' as TaskFilter,
      selectedTagId: null,
    };

    if (cached) {
      set({
        ...basePatch,
        tasks: cached.tasks,
        tags: cached.tags,
        taskTotal: cached.total,
        tasksWorkspaceId: workspaceId,
        isTasksLoading: !hasFreshCache,
      });

      if (hasFreshCache) return;

      await Promise.all([get().fetchTasks(workspaceId), get().fetchTags(workspaceId)]);
      set({ isTasksLoading: false });
      return;
    }

    set({
      ...basePatch,
      tasks: [],
      tags: [],
      taskTotal: 0,
      tasksWorkspaceId: workspaceId,
      isTasksLoading: true,
    });

    await Promise.all([get().fetchTasks(workspaceId), get().fetchTags(workspaceId)]);
    set({ isTasksLoading: false });
  },

  fetchTasks: async (workspaceId: string, page: number = 1) => {
    const cacheKey = toCacheKey(workspaceId);
    try {
      const res = await fetch(
        `/api/tasks?workspaceId=${workspaceId}&page=${page}&limit=${PAGE_SIZE}`
      );
      if (!res.ok) return;

      const data = await res.json();
      const fetchedTasks: Task[] = data.tasks || [];
      const total = data.total || 0;

      set((state) => {
        const newCache = { ...state.workspaceCache };
        const cachedTags = newCache[cacheKey]?.tags ?? state.tags;

        if (page === 1) {
          newCache[cacheKey] = {
            tasks: fetchedTasks,
            tags: cachedTags,
            total,
            fetchedAt: Date.now(),
          };
        } else {
          const existing = newCache[cacheKey];
          if (existing) {
            const merged = [...existing.tasks];
            for (const t of fetchedTasks) {
              if (!merged.some((item) => item.id === t.id)) merged.push(t);
            }
            newCache[cacheKey] = { ...existing, tasks: merged, total, fetchedAt: Date.now() };
          }
        }

        // Race guard: chỉ cập nhật UI khi vẫn đang xem đúng workspace
        if (state.currentWorkspaceId !== workspaceId) {
          return { workspaceCache: newCache };
        }

        if (page === 1) {
          return {
            tasks: fetchedTasks,
            taskTotal: total,
            tasksWorkspaceId: workspaceId,
            workspaceCache: newCache,
          };
        }

        const merged = [...state.tasks];
        for (const t of fetchedTasks) {
          if (!merged.some((item) => item.id === t.id)) merged.push(t);
        }
        return {
          tasks: merged,
          taskTotal: total,
          tasksWorkspaceId: workspaceId,
          workspaceCache: newCache,
        };
      });
    } catch (error) {
      console.error('Failed to fetch tasks', error);
    }
  },

  loadMoreTasks: async () => {
    const state = get();
    const workspaceId = state.currentWorkspaceId;
    if (!workspaceId || state.isLoadingMore || state.tasks.length >= state.taskTotal) return;
    if (state.tasksWorkspaceId !== workspaceId) return;

    set({ isLoadingMore: true });
    const currentPage = Math.ceil(state.tasks.length / PAGE_SIZE) + 1;
    await get().fetchTasks(workspaceId, currentPage);
    set({ isLoadingMore: false });
  },

  fetchTags: async (workspaceId: string) => {
    const cacheKey = toCacheKey(workspaceId);
    try {
      const res = await fetch(`/api/tasks/tags?workspaceId=${workspaceId}`);
      if (!res.ok) return;

      const data = await res.json();
      const fetchedTags: Tag[] = data.tags || [];

      set((state) => {
        const newCache = { ...state.workspaceCache };
        const existing = newCache[cacheKey];
        if (existing) {
          newCache[cacheKey] = { ...existing, tags: fetchedTags, fetchedAt: Date.now() };
        } else {
          newCache[cacheKey] = {
            tasks: [],
            tags: fetchedTags,
            total: 0,
            fetchedAt: Date.now(),
          };
        }

        if (state.currentWorkspaceId !== workspaceId) {
          return { workspaceCache: newCache };
        }

        return { tags: fetchedTags, workspaceCache: newCache };
      });
    } catch (error) {
      console.error('Failed to fetch tags', error);
    }
  },

  fetchUsers: async () => {
    try {
      const res = await fetch('/api/user/list');
      if (res.ok) {
        const data = await res.json();
        set({ users: data.users });
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  },

  ensureAllTasksLoaded: async () => {
    const state = get();
    const cached = state.workspaceCache['ALL'];
    const now = Date.now();
    if (cached && now - cached.fetchedAt < CACHE_TTL) return;

    const wasLoading = state.isTasksLoading;
    if (!wasLoading) set({ isTasksLoading: true });
    await get().fetchTasks('ALL', 1);
    if (!wasLoading) set({ isTasksLoading: false });
  },

  addTask: async (taskData) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('Failed to add task on server:', err);
        throw new Error(err);
      }

      const newTask: Task = await res.json();
      set((state) => {
        const wsKey = toCacheKey(newTask.workspace_id);
        const newCache = invalidateWorkspaceCaches(state.workspaceCache, wsKey);

        const inCurrentView =
          state.tasksWorkspaceId === state.currentWorkspaceId &&
          taskBelongsToView(newTask, state.currentWorkspaceId);

        return {
          tasks: inCurrentView ? [newTask, ...state.tasks] : state.tasks,
          taskTotal: inCurrentView ? state.taskTotal + 1 : state.taskTotal,
          workspaceCache: newCache,
        };
      });
    } catch (error) {
      console.error('Failed to add task', error);
      throw error;
    }
  },

  updateTask: async (taskId, taskData) => {
    try {
      const prevTask = get().tasks.find((t) => t.id === taskId);

      set((state) => ({
        tasks: state.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const updated = { ...t, ...taskData };
          if ((taskData as any).assignee_ids) {
            const ids = (taskData as any).assignee_ids as string[];
            updated.assignees = ids.map((id) => {
              const existing = t.assignees.find((a) => a.id === id);
              return existing || { id, name: '', avatar_url: null };
            });
          }
          return updated;
        }),
      }));

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (!res.ok) {
        console.error('Failed to update task on server');
        return;
      }

      const updatedServerTask: Task = await res.json();
      set((state) => {
        const oldWsKey = prevTask ? toCacheKey(prevTask.workspace_id) : undefined;
        const newWsKey = toCacheKey(updatedServerTask.workspace_id);
        const newCache = invalidateWorkspaceCaches(state.workspaceCache, oldWsKey, newWsKey);

        const inCurrentView =
          state.tasksWorkspaceId === state.currentWorkspaceId &&
          taskBelongsToView(updatedServerTask, state.currentWorkspaceId);

        let nextTasks = state.tasks.map((t) => (t.id === taskId ? updatedServerTask : t));
        if (!inCurrentView) {
          nextTasks = nextTasks.filter((t) => t.id !== taskId);
        }

        return { tasks: nextTasks, workspaceCache: newCache };
      });
    } catch (error) {
      console.error('Failed to update task', error);
    }
  },

  deleteTask: async (taskId) => {
    let prevTask: Task | null = null;
    try {
      set((state) => {
        prevTask = state.tasks.find((t) => t.id === taskId) || null;
        return {
          tasks: state.tasks.filter((t) => t.id !== taskId),
          taskTotal: Math.max(0, state.taskTotal - 1),
        };
      });

      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (prevTask) {
          set((state) => ({
            tasks: [...state.tasks, prevTask!],
            taskTotal: state.taskTotal + 1,
          }));
        }
        throw new Error(errorData.error || 'Failed to delete task on server');
      }

      set((state) => ({
        workspaceCache: invalidateWorkspaceCaches(
          state.workspaceCache,
          prevTask ? toCacheKey(prevTask.workspace_id) : undefined
        ),
      }));
    } catch (error: any) {
      if (prevTask) {
        set((state) => {
          if (!state.tasks.some((t) => t.id === taskId)) {
            return { tasks: [...state.tasks, prevTask!], taskTotal: state.taskTotal + 1 };
          }
          return state;
        });
      }
      console.error('Failed to delete task', error);
      throw error;
    }
  },

  updateTaskNote: async (taskId, noteContent) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent }),
      });
      if (res.ok) {
        const data = await res.json();
        const savedNote = data.note ?? data;
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, note: savedNote } : t)),
        }));
      }
    } catch (error) {
      console.error('Failed to update task note', error);
    }
  },
}));
