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
  assignee_id?: string | null;
  assignee?: { id: string; name: string; avatar_url: string | null } | null;
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

export type FilterStatus = 'all' | 'todo' | 'in_progress' | 'done' | 'today' | 'upcoming' | 'my_tasks';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

// --- Constants ---
const PAGE_SIZE = 100;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface WorkspaceCache {
  tasks: Task[];
  tags: Tag[];
  total: number;
  fetchedAt: number; // timestamp
}

interface TaskStoreState {
  // State
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  currentWorkspace: Workspace | null;
  tasks: Task[];
  tags: Tag[];
  taskTotal: number; // total count from server (for pagination)
  users: User[];
  currentView: 'list' | 'kanban' | 'calendar';
  isAIChatOpen: boolean;
  selectedTaskId: string | null;
  isAddTaskModalOpen: boolean;
  filterStatus: FilterStatus;
  selectedTagId: string | null;
  isTasksLoading: boolean;
  isLoadingMore: boolean; // loading state for "load more"
  timeFilter: 'all' | 'today' | 'upcoming';
  // Cache
  workspaceCache: Record<string, WorkspaceCache>;

  // UI Actions
  setCurrentWorkspaceId: (id: string | null) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setCurrentView: (view: 'list' | 'kanban' | 'calendar') => void;
  toggleAIChat: () => void;
  setAIChatOpen: (isOpen: boolean) => void;
  setSelectedTaskId: (id: string | null) => void;
  setAddTaskModalOpen: (isOpen: boolean) => void;
  setFilter: (filter: FilterStatus) => void;
  setSelectedTagId: (tagId: string | null) => void;
  setTimeFilter: (filter: 'all' | 'today' | 'upcoming') => void;
  getFilteredTasks: () => Task[];

  // Data Fetching Actions
  fetchWorkspaces: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  fetchTasks: (workspaceId: string, page?: number) => Promise<void>;
  fetchTags: (workspaceId: string) => Promise<void>;
  loadMoreTasks: () => Promise<void>;
  fetchUsers: () => Promise<void>;

  // CRUD Actions
  addTask: (taskData: Partial<Task>) => Promise<void>;
  updateTask: (taskId: string, taskData: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTaskNote: (taskId: string, noteContent: any) => Promise<void>;
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  workspaces: [],
  currentWorkspaceId: "ALL",
  currentWorkspace: null,
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
  filterStatus: 'all',
  selectedTagId: null,
  timeFilter: 'all',

  setCurrentWorkspaceId: (id) => set((state) => ({ 
    currentWorkspaceId: id,
    currentWorkspace: state.workspaces.find(w => w.id === id) || null,
    filterStatus: 'all',
    selectedTagId: null
  })),
  setCurrentWorkspace: (workspace) => set({ 
    currentWorkspace: workspace,
    currentWorkspaceId: workspace ? workspace.id : null,
    filterStatus: 'all',
    selectedTagId: null
  }),
  setCurrentView: (view) => set({ currentView: view }),
  toggleAIChat: () => set((state) => ({ isAIChatOpen: !state.isAIChatOpen })),
  setAIChatOpen: (isOpen) => set({ isAIChatOpen: isOpen }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setAddTaskModalOpen: (isOpen) => set({ isAddTaskModalOpen: isOpen }),
  setFilter: (filter) => set({ filterStatus: filter }),
  setSelectedTagId: (tagId) => set({ selectedTagId: tagId }),
  setTimeFilter: (filter) => set({ timeFilter: filter }),
  getFilteredTasks: () => {
    const { tasks, timeFilter } = get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tasks.filter(task => {
      if (timeFilter === "all") return true;
      
      if (!task.due_date) return false;
      
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);

      if (timeFilter === "today") {
        return dueDate.getTime() === today.getTime();
      }
      if (timeFilter === "upcoming") {
        return dueDate.getTime() >= tomorrow.getTime();
      }
      
      return true;
    });
  },

  fetchWorkspaces: async () => {
    try {
      const res = await fetch('/api/tasks/workspaces');
      if (res.ok) {
        const data = await res.json();
        set({ workspaces: data.workspaces || [] });
        if (data.workspaces?.length > 0 && !get().currentWorkspaceId) {
          set({ currentWorkspaceId: data.workspaces[0].id });
        }
      }
    } catch (error) {
      console.error('Failed to fetch workspaces', error);
    }
  },

  switchWorkspace: async (workspaceId: string) => {
    const state = get();
    const cacheKey = workspaceId === "ALL" ? "ALL" : workspaceId;
    const cached = state.workspaceCache[cacheKey];
    
    // Prevent redundant switches only if we already have the data cached for this exact workspace
    if (state.currentWorkspaceId === workspaceId && cached) return;

    const now = Date.now();

    if (cached && (now - cached.fetchedAt) < CACHE_TTL) {
      // Fresh cache — use immediately, no loading state
      set({
        currentWorkspaceId: workspaceId,
        currentWorkspace: state.workspaces.find(w => w.id === workspaceId) || null,
        tasks: cached.tasks,
        tags: cached.tags,
        taskTotal: cached.total,
        filterStatus: 'all',
        selectedTagId: null,
      });
      return;
    }

    if (cached) {
      // Stale cache — show cached data, refetch in background
      set({
        currentWorkspaceId: workspaceId,
        currentWorkspace: state.workspaces.find(w => w.id === workspaceId) || null,
        tasks: cached.tasks,
        tags: cached.tags,
        taskTotal: cached.total,
        isTasksLoading: true,
        filterStatus: 'all',
        selectedTagId: null,
      });
      await Promise.all([
        state.fetchTasks(workspaceId),
        state.fetchTags(workspaceId),
      ]);
      set({ isTasksLoading: false });
    } else {
      // No cache — show loading
      set({
        currentWorkspaceId: workspaceId,
        currentWorkspace: state.workspaces.find(w => w.id === workspaceId) || null,
        isTasksLoading: true,
        filterStatus: 'all',
        selectedTagId: null,
        tasks: [],
        tags: [],
        taskTotal: 0,
      });
      await Promise.all([
        state.fetchTasks(workspaceId),
        state.fetchTags(workspaceId),
      ]);
      set({ isTasksLoading: false });
    }
  },

  fetchTasks: async (workspaceId: string, page: number = 1) => {
    try {
      const cacheKey = workspaceId === "ALL" ? "ALL" : workspaceId;
      const res = await fetch(`/api/tasks?workspaceId=${workspaceId}&page=${page}&limit=${PAGE_SIZE}`);
      if (res.ok) {
        const data = await res.json();
        const tasks = data.tasks || [];
        const total = data.total || 0;

        if (page === 1) {
          // First page — replace tasks
          set((state) => {
            const newCache = { ...state.workspaceCache };
            newCache[cacheKey] = { tasks, tags: state.tags, total, fetchedAt: Date.now() };
            return { tasks, taskTotal: total, workspaceCache: newCache };
          });
        } else {
          // Subsequent pages — append
          set((state) => {
            const merged = [...state.tasks];
            for (const t of tasks) {
              if (!merged.some(existing => existing.id === t.id)) {
                merged.push(t);
              }
            }
            const newCache = { ...state.workspaceCache };
            const existing = newCache[cacheKey];
            if (existing) {
              newCache[cacheKey] = { ...existing, tasks: merged, total };
            }
            return { tasks: merged, taskTotal: total, workspaceCache: newCache };
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch tasks', error);
    }
  },

  loadMoreTasks: async () => {
    const state = get();
    if (state.isLoadingMore || state.tasks.length >= state.taskTotal) return;
    set({ isLoadingMore: true });
    const currentPage = Math.ceil(state.tasks.length / PAGE_SIZE) + 1;
    await state.fetchTasks(state.currentWorkspaceId!, currentPage);
    set({ isLoadingMore: false });
  },

  fetchTags: async (workspaceId: string) => {
    try {
      const cacheKey = workspaceId === "ALL" ? "ALL" : workspaceId;
      const res = await fetch(`/api/tasks/tags?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        const tags = data.tags || [];
        set((state) => {
          const newCache = { ...state.workspaceCache };
          const existing = newCache[cacheKey];
          if (existing) {
            newCache[cacheKey] = { ...existing, tags, fetchedAt: Date.now() };
          }
          return { tags, workspaceCache: newCache };
        });
      }
    } catch (error) {
      console.error('Failed to fetch tags', error);
    }
  },

  fetchUsers: async () => {
    try {
      const res = await fetch(`/api/user/list`);
      if (res.ok) {
        const data = await res.json();
        set({ users: data.users });
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  },

  addTask: async (taskData) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (res.ok) {
        const newTask = await res.json();
        set((state) => {
          // Invalidate cache for the affected workspace
          const newCache = { ...state.workspaceCache };
          const wsId = newTask.workspace_id;
          if (newCache[wsId]) delete newCache[wsId];
          if (newCache["ALL"]) delete newCache["ALL"];
          return { tasks: [newTask, ...state.tasks], taskTotal: state.taskTotal + 1, workspaceCache: newCache };
        });
      } else {
        const err = await res.text();
        console.error('Failed to add task on server:', err);
        throw new Error(err);
      }
    } catch (error) {
      console.error('Failed to add task', error);
      throw error;
    }
  },

  updateTask: async (taskId, taskData) => {
    try {
      const prevTask = get().tasks.find(t => t.id === taskId);

      // Optimistic update
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...taskData } : t)),
      }));

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (res.ok) {
        const updatedServerTask = await res.json();
        set((state) => {
          // Invalidate cache
          const newCache = { ...state.workspaceCache };
          const oldWsId = prevTask?.workspace_id;
          const newWsId = updatedServerTask.workspace_id;
          if (newCache[oldWsId!]) delete newCache[oldWsId!];
          if (newWsId !== oldWsId && newCache[newWsId]) delete newCache[newWsId];
          if (newCache["ALL"]) delete newCache["ALL"];
          return {
            tasks: state.tasks.map((t) => (t.id === taskId ? updatedServerTask : t)),
            workspaceCache: newCache
          };
        });
      } else {
        console.error('Failed to update task on server');
      }
    } catch (error) {
      console.error('Failed to update task', error);
    }
  },

  deleteTask: async (taskId) => {
    let prevTask: Task | null = null;
    try {
      set((state) => {
        prevTask = state.tasks.find(t => t.id === taskId) || null;
        return {
          tasks: state.tasks.filter((t) => t.id !== taskId),
          taskTotal: Math.max(0, state.taskTotal - 1),
        };
      });

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (prevTask) {
          set((state) => ({
            tasks: [...state.tasks, prevTask!],
            taskTotal: state.taskTotal + 1,
          }));
        }
        throw new Error(errorData.error || 'Failed to delete task on server');
      } else {
        // Invalidate cache on successful delete
        set((state) => {
          const newCache = { ...state.workspaceCache };
          if (prevTask?.workspace_id && newCache[prevTask.workspace_id]) delete newCache[prevTask.workspace_id];
          if (newCache["ALL"]) delete newCache["ALL"];
          return { workspaceCache: newCache };
        });
      }
    } catch (error: any) {
      if (prevTask) {
        set((state) => {
          if (!state.tasks.some(t => t.id === taskId)) {
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
        const updatedNote = await res.json();
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, note: updatedNote } : t
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to update task note', error);
    }
  },
}));
