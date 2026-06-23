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

export type FilterStatus = 'all' | 'todo' | 'in_progress' | 'done' | 'today' | 'upcoming';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

interface TaskStoreState {
  // State
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  currentWorkspace: Workspace | null;
  tasks: Task[];
  tags: Tag[];
  users: User[];
  currentView: 'list' | 'kanban' | 'calendar';
  isAIChatOpen: boolean;
  selectedTaskId: string | null;
  isAddTaskModalOpen: boolean;
  filterStatus: FilterStatus;
  selectedTagId: string | null;

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

  // Data Fetching Actions (Mocked API calls for now)
  fetchWorkspaces: () => Promise<void>;
  fetchTasks: (workspaceId: string) => Promise<void>;
  fetchTags: (workspaceId: string) => Promise<void>;
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
  filterStatus: 'all',
  selectedTagId: null,

  setCurrentWorkspaceId: (id) => set((state) => ({ 
    currentWorkspaceId: id,
    currentWorkspace: state.workspaces.find(w => w.id === id) || null
  })),
  setCurrentWorkspace: (workspace) => set({ 
    currentWorkspace: workspace,
    currentWorkspaceId: workspace ? workspace.id : null 
  }),
  setCurrentView: (view) => set({ currentView: view }),
  toggleAIChat: () => set((state) => ({ isAIChatOpen: !state.isAIChatOpen })),
  setAIChatOpen: (isOpen) => set({ isAIChatOpen: isOpen }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setAddTaskModalOpen: (isOpen) => set({ isAddTaskModalOpen: isOpen }),
  setFilter: (filter) => set({ filterStatus: filter }),
  setSelectedTagId: (tagId) => set({ selectedTagId: tagId }),

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

  fetchTasks: async (workspaceId: string) => {
    try {
      const res = await fetch(`/api/tasks?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        set({ tasks: data.tasks || [] });
      }
    } catch (error) {
      console.error('Failed to fetch tasks', error);
    }
  },

  fetchTags: async (workspaceId: string) => {
    try {
      const res = await fetch(`/api/tasks/tags?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        set({ tags: data.tags || [] });
      }
    } catch (error) {
      console.error('Failed to fetch tags', error);
    }
  },

  fetchUsers: async () => {
    try {
      const res = await fetch(`/api/user/list`);
      if (res.ok) {
        const users = await res.json();
        set({ users });
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
        set((state) => ({ tasks: [newTask, ...state.tasks] }));
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
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? updatedServerTask : t)),
        }));
      } else {
        // Rollback strategy could be implemented here
        console.error('Failed to update task on server');
      }
    } catch (error) {
      console.error('Failed to update task', error);
    }
  },

  deleteTask: async (taskId) => {
    // Keep a copy to revert if needed
    let prevTask = null;
    try {
      set((state) => {
        prevTask = state.tasks.find(t => t.id === taskId);
        return {
          tasks: state.tasks.filter((t) => t.id !== taskId),
        };
      });

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        // Revert
        if (prevTask) {
          set((state) => ({ tasks: [...state.tasks, prevTask!] }));
        }
        throw new Error(errorData.error || 'Failed to delete task on server');
      }
    } catch (error: any) {
      // Revert if fetch failed entirely
      if (prevTask) {
        set((state) => {
          if (!state.tasks.some(t => t.id === taskId)) {
            return { tasks: [...state.tasks, prevTask!] };
          }
          return state;
        });
      }
      console.error('Failed to delete task', error);
      throw error; // Let the UI handle the alert
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
