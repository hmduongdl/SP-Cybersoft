import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope, Inter, Geist } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/shared/sidebar";
import { SiteHeader } from "@/components/shared/site-header";
import { LayoutProvider } from "@/components/shared/layout-context";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import ClientLayoutWrapper from "./client-layout-wrapper";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const manrope = Manrope({
  subsets: ["vietnamese", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-manrope",
});

const inter = Inter({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SP-CyberSoft Check-in Tool",
  description: "Modern employee post sharing and check-in management tool",
  icons: {
    icon: "/songphuong.vn.png",
    apple: "/songphuong.vn.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={cn("h-full", "font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        {/* Nhúng Material Icons & Symbols CDN */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} ${manrope.variable} h-full antialiased overflow-hidden`}>
        <ThemeProvider>
          <SessionProviderWrapper>
            <LayoutProvider>
              <ClientLayoutWrapper>
                {children}
              </ClientLayoutWrapper>
            </LayoutProvider>
          </SessionProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
