"use client";

import React from "react";
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
  } = useTaskStore();

  return (
    <>
      {/* ── 3-Column Shell ── */}
      <div className="flex h-full overflow-hidden bg-surface">

        {/* Column 1: Task Filter Sidebar — 220px fixed */}
        <Sidebar />

        {/* Column 2: Main content — flex-1 */}
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
    </>
  );
}
