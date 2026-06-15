import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Sidebar } from "@/components/shared/sidebar";
import { SiteHeader } from "@/components/shared/site-header";
import { LayoutProvider } from "@/components/shared/layout-context";
import { SessionProvider } from "next-auth/react";
import ClientLayoutWrapper from "./client-layout-wrapper";

export const metadata: Metadata = {
  title: "TeamSync HR Check-in Tool",
  description: "Modern employee post sharing and check-in management tool",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className="h-full">
      <body className="h-full antialiased overflow-hidden">
        <SessionProvider>
          <LayoutProvider>
            <ClientLayoutWrapper>
              {children}
            </ClientLayoutWrapper>
          </LayoutProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
