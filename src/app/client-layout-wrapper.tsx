"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";
import { SiteHeader } from "@/components/shared/site-header";
import { AIAssistant } from "@/components/AIAssistant";

import { useSession } from "next-auth/react";
import { OnboardingModal } from "@/components/OnboardingModal";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isLoginPage = pathname === "/login" || pathname === "/login/";
  const isNotOnboarded = session?.user?.is_onboarded === false;

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
        <div className="flex-1 overflow-y-auto w-full">
          <main className="p-md md:p-xl lg:p-2xl max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>

      {/* Floating AI Assistant */}
      <AIAssistant />

      {/* Full-screen blocking onboarding modal */}
      {isNotOnboarded && <OnboardingModal />}
    </div>
  );
}
