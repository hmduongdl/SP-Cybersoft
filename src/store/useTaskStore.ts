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

interface TaskStoreState {
  // State
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  tasks: Task[];
  tags: Tag[];
  currentView: 'list' | 'kanban' | 'calendar';
  isAIChatOpen: boolean;
  selectedTaskId: string | null;
  isAddTaskModalOpen: boolean;

  // UI Actions
  setCurrentWorkspaceId: (id: string | null) => void;
  setCurrentView: (view: 'list' | 'kanban' | 'calendar') => void;
  toggleAIChat: () => void;
  setAIChatOpen: (isOpen: boolean) => void;
  setSelectedTaskId: (id: string | null) => void;
  setAddTaskModalOpen: (isOpen: boolean) => void;

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
  workspaces: [],
  currentWorkspaceId: null,
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
  tags: [],
  currentView: 'kanban',
  isAIChatOpen: false,
  selectedTaskId: null,
  isAddTaskModalOpen: false,

  setCurrentWorkspaceId: (id) => set({ currentWorkspaceId: id }),
  setCurrentView: (view) => set({ currentView: view }),
  toggleAIChat: () => set((state) => ({ isAIChatOpen: !state.isAIChatOpen })),
  setAIChatOpen: (isOpen) => set({ isAIChatOpen: isOpen }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setAddTaskModalOpen: (isOpen) => set({ isAddTaskModalOpen: isOpen }),

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
