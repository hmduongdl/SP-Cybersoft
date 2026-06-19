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
  assignee?: { name: string; avatar_url?: string };
  workspace_id: string;
  creator_id: string;
  is_archived: boolean;
  tags?: Tag[];
  note?: {
    id: string;
    content: any;
  };
}

export type FilterStatus = 'all' | 'todo' | 'in_progress' | 'done' | 'today' | 'upcoming';

interface TaskStoreState {
  // State
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  currentWorkspace: Workspace | null;
  tasks: Task[];
  tags: Tag[];
  currentView: 'list' | 'kanban' | 'calendar';
  isAIChatOpen: boolean;
  selectedTaskId: string | null;
  isAddTaskModalOpen: boolean;
  filterStatus: FilterStatus;

  // UI Actions
  setCurrentWorkspaceId: (id: string | null) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setCurrentView: (view: 'list' | 'kanban' | 'calendar') => void;
  toggleAIChat: () => void;
  setAIChatOpen: (isOpen: boolean) => void;
  setSelectedTaskId: (id: string | null) => void;
  setAddTaskModalOpen: (isOpen: boolean) => void;
  setFilter: (filter: FilterStatus) => void;

  // Data Fetching Actions (Mocked API calls for now)
  fetchWorkspaces: () => Promise<void>;
  fetchTasks: (workspaceId: string) => Promise<void>;
  fetchTags: (workspaceId: string) => Promise<void>;

  // CRUD Actions
  addTask: (taskData: Partial<Task>) => Promise<void>;
  updateTask: (taskId: string, taskData: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTaskNote: (taskId: string, noteContent: any) => Promise<void>;
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  workspaces: [
    { id: "ws-1", name: "Dự án SPS", icon: "🚀", color: "#0050cb", owner_id: "user-1" },
    { id: "ws-2", name: "Marketing Space", icon: "📢", color: "#ef4444", owner_id: "user-1" },
    { id: "ws-3", name: "Thiết kế UI/UX", icon: "🎨", color: "#10b981", owner_id: "user-1" }
  ],
  currentWorkspaceId: "ws-1",
  currentWorkspace: { id: "ws-1", name: "Dự án SPS", icon: "🚀", color: "#0050cb", owner_id: "user-1" },
  tasks: [
    {
      id: "task-1",
      title: "Thiết kế giao diện Topbar",
      status: "DONE",
      workspace_id: "ws-1",
      creator_id: "user-1",
      is_archived: false,
      due_date: new Date().toISOString(),
      tags: [{ id: "tag-1", name: "UI/UX", color: "#3b82f6", workspace_id: "ws-1" }]
    },
    {
      id: "task-2",
      title: "Tích hợp BlockNote Editor vào Detail Panel",
      status: "IN_PROGRESS",
      workspace_id: "ws-1",
      creator_id: "user-1",
      is_archived: false,
      due_date: new Date(Date.now() + 86400000).toISOString(),
      tags: [{ id: "tag-2", name: "Frontend", color: "#8b5cf6", workspace_id: "ws-1" }]
    },
    {
      id: "task-3",
      title: "Viết logic RAG AI tạo Embeddings",
      status: "TODO",
      workspace_id: "ws-1",
      creator_id: "user-1",
      is_archived: false,
      tags: [{ id: "tag-3", name: "Backend", color: "#ef4444", workspace_id: "ws-1" }, { id: "tag-4", name: "AI", color: "#10b981", workspace_id: "ws-1" }]
    }
  ],
  tags: [
    { id: "tag-1", name: "Frontend", color: "#3b82f6", workspace_id: "ws-1" },
    { id: "tag-2", name: "Backend", color: "#8b5cf6", workspace_id: "ws-1" },
    { id: "tag-3", name: "UI/UX", color: "#10b981", workspace_id: "ws-1" },
    { id: "tag-4", name: "AI/RAG", color: "#f59e0b", workspace_id: "ws-1" }
  ],
  currentView: 'kanban',
  isAIChatOpen: false,
  selectedTaskId: null,
  isAddTaskModalOpen: false,
  filterStatus: 'all',

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

  addTask: async (taskData) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (res.ok) {
        const newTask = await res.json();
        set((state) => ({ tasks: [...state.tasks, newTask] }));
      }
    } catch (error) {
      console.error('Failed to add task', error);
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
      
      if (!res.ok) {
        // Rollback strategy could be implemented here
        console.error('Failed to update task on server');
      }
    } catch (error) {
      console.error('Failed to update task', error);
    }
  },

  deleteTask: async (taskId) => {
    try {
      // Optimistic delete
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== taskId),
      }));

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        console.error('Failed to delete task on server');
      }
    } catch (error) {
      console.error('Failed to delete task', error);
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
