"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

function ThemeSyncer() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    fetch("/api/user/profile", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (data?.user?.theme && data.user.theme !== theme) {
          setTheme(data.user.theme);
        }
      })
      .catch(() => { /* not logged in or fetch failed, silent skip */ });
  }, [theme, setTheme]);

  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem forcedTheme={isLandingPage ? "light" : undefined}>
      <ThemeSyncer />
      {children}
    </NextThemesProvider>
  );
}
