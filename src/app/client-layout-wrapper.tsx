"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";
import { SiteHeader } from "@/components/shared/site-header";
import { AIAssistant } from "@/components/AIAssistant";

import { useLayout } from "@/components/shared/layout-context";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sidebarCollapsed } = useLayout();
  const isLoginPage = pathname === "/login" || pathname === "/login/";
  const isLandingPage = pathname === "/";
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
  const isTasksPage = pathname === "/tasks" || pathname?.startsWith("/tasks/");
  const isTimetablePage = pathname === "/timetable" || pathname?.startsWith("/timetable/");
  const isSeoToolsPage = pathname === "/seo-tools" || pathname?.startsWith("/seo-tools/");
  const isAiChatPage = pathname === "/ai-chat" || pathname?.startsWith("/ai-chat/");
  const isFullWidthPage = isTasksPage || isTimetablePage || isAiChatPage;

  const isPricingPage = pathname === "/pricing" || pathname === "/pricing/";
  const isPaymentPage = pathname === "/thanh-toan" || pathname?.startsWith("/thanh-toan");

  if (isLoginPage || isLandingPage || isMaintenanceMode || pathname === "/maintenance" || isPricingPage || isPaymentPage) {
    return <div className="h-screen w-screen overflow-y-auto bg-surface">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Pane */}
      <div className={`flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300 ${sidebarCollapsed ? "md:pl-16" : "md:pl-[240px]"}`}>
        {/* Top Header */}
        <SiteHeader />

        {/* Content Area */}
        <div className={`flex-1 w-full bg-surface ${isFullWidthPage ? "overflow-hidden h-full" : "overflow-y-auto"}`}>
          {isFullWidthPage ? (
            children
          ) : (
            <main className="p-3 sm:p-4 md:p-6 lg:p-8 pt-4 sm:pt-6 lg:pt-8 max-w-7xl mx-auto w-full pb-safe">
              {children}
            </main>
          )}
        </div>

        {/* Global AI Assistant Pop-up Chat */}
        {!isSeoToolsPage && !isAiChatPage && <AIAssistant />}
      </div>
    </div>
  );
}
