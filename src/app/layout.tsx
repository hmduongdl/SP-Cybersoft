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
import { DeployHotReload } from "@/components/shared/DeployHotReload";
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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={cn("h-full", "font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/material-symbols-outlined-latin-wght-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script src="/material-symbols-bootstrap.js" />
      </head>
      <body className={`${inter.variable} ${manrope.variable} h-full antialiased overflow-hidden`}>
        <ThemeProvider>
          <SessionProviderWrapper>
            <DeployHotReload />
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
