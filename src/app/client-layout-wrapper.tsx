"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";
import { SiteHeader } from "@/components/shared/site-header";

import { useLayout } from "@/components/shared/layout-context";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sidebarCollapsed } = useLayout();
  const isLoginPage = pathname === "/login" || pathname === "/login/";
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
  const isTasksPage = pathname === "/tasks" || pathname?.startsWith("/tasks/");

  if (isLoginPage || isMaintenanceMode || pathname === "/maintenance") {
    return <div className="h-screen w-screen overflow-y-auto bg-surface">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Pane */}
      <div className={`flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300 ${sidebarCollapsed ? "md:pl-16" : "md:pl-[240px]"}`}>
        {/* Top Header */}
        <SiteHeader />

        {/* Content Area */}
        <div className={`flex-1 w-full bg-[#F8FAFC] ${isTasksPage ? "overflow-hidden h-full" : "overflow-y-auto"}`}>
          {isTasksPage ? (
            children
          ) : (
            <main className="p-4 md:p-6 lg:p-8 pt-6 lg:pt-8 max-w-7xl mx-auto w-full">
              {children}
            </main>
          )}
        </div>
      </div>
    </div>
  );
}
