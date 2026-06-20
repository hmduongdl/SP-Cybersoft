"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
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
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem>
      <ThemeSyncer />
      {children}
    </NextThemesProvider>
  );
}
