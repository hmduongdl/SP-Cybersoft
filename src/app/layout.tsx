import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Sidebar } from "@/components/shared/sidebar";
import { SiteHeader } from "@/components/shared/site-header";
import { LayoutProvider } from "@/components/shared/layout-context";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import ClientLayoutWrapper from "./client-layout-wrapper";

export const metadata: Metadata = {
  title: "SPS AI Check-in Tool",
  description: "Modern employee post sharing and check-in management tool",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className="h-full">
      <head>
        {/* Nhúng Material Icons & Symbols CDN */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full antialiased overflow-hidden">
        <SessionProviderWrapper>
          <LayoutProvider>
            <ClientLayoutWrapper>
              {children}
            </ClientLayoutWrapper>
          </LayoutProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
