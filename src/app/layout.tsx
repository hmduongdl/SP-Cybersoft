import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Sidebar } from "@/components/shared/sidebar";
import { SiteHeader } from "@/components/shared/site-header";
import { LayoutProvider } from "@/components/shared/layout-context";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "Teamwork Check Dashboard",
  description: "Dashboard quản lý công việc và lịch biểu với kiến trúc sạch",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className="h-full">
      <body className="h-full bg-slate-950 text-slate-100 antialiased overflow-hidden">
        <SessionProvider>
          <LayoutProvider>
            <div className="flex h-screen overflow-hidden">
              {/* Left Sidebar */}
              <Sidebar />

              {/* Main Content Pane */}
              <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {/* Top Header */}
                <SiteHeader />

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-6 lg:p-8">
                  <div className="max-w-[1600px] mx-auto w-full">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </LayoutProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
