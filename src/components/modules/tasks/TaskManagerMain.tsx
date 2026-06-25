"use client";

import React, { useEffect, useRef } from "react";
import { MotionConfig } from "framer-motion";
import { useTaskStore } from "@/store/useTaskStore";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { AIChatSidebar } from "./AIChatSidebar";
import { AddTaskModal } from "./AddTaskModal";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MainContent } from "./MainContent";

export default function TaskManagerMain() {
  const {
    isAIChatOpen,
    selectedTaskId,
    fetchWorkspaces,
    switchWorkspace,
  } = useTaskStore();

  const initializedRef = useRef(false);

  // Khởi tạo một lần — tránh gọi switchWorkspace lặp khi currentWorkspaceId đổi.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    fetchWorkspaces().then(() => {
      const wsId = useTaskStore.getState().currentWorkspaceId ?? "ALL";
      switchWorkspace(wsId);
    });
  }, [fetchWorkspaces, switchWorkspace]);

  return (
    <MotionConfig reducedMotion="user">
      {/* ── 3-Column Shell ── */}
      <div className="flex h-full w-full overflow-hidden bg-surface">

        {/* Main content — flex-1 */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header />
          <MainContent />
        </main>

        {/* Column 3: AI Chat — 320px, collapsible */}
        {isAIChatOpen && <AIChatSidebar />}

      </div>

      {/* TaskDetailPanel: bottom drawer, not column */}
      {selectedTaskId && <TaskDetailPanel />}

      {/* Add Task Modal */}
      <AddTaskModal />
    </MotionConfig>
  );
}
