"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";
import { SiteHeader } from "@/components/shared/site-header";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/login/";

  if (isLoginPage) {
    return <div className="h-screen w-screen overflow-y-auto bg-surface">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Pane */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden md:pl-[280px]">
        {/* Top Header */}
        <SiteHeader />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-md md:p-xl lg:p-2xl max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
