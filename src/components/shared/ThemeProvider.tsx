"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

type ThemeId = "light" | "dark" | "system";

type ThemeContextValue = {
  setUserTheme: (theme: ThemeId) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useUserTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useUserTheme must be used within ThemeProvider");
  }
  return ctx;
}

function ThemeSyncer({
  skipSyncRef,
}: {
  skipSyncRef: React.MutableRefObject<boolean>;
}) {
  const { setTheme } = useTheme();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;

    fetch("/api/user/profile", { cache: "no-store" })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (skipSyncRef.current) return;
        if (data?.user?.theme) {
          setTheme(data.user.theme);
        }
      })
      .catch(() => { /* not logged in or fetch failed */ });
  }, [setTheme]);

  return null;
}

function ThemeProviderInner({ children }: { children: ReactNode }) {
  const skipSyncRef = useRef(false);
  const { setTheme } = useTheme();

  const setUserTheme = useCallback(
    async (theme: ThemeId) => {
      skipSyncRef.current = true;
      setTheme(theme);
      try {
        const res = await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme }),
        });
        if (!res.ok) {
          throw new Error("Failed to save theme");
        }
      } catch (e) {
        console.error("Lỗi khi lưu thiết lập theme:", e);
      } finally {
        skipSyncRef.current = false;
      }
    },
    [setTheme],
  );

  return (
    <ThemeContext.Provider value={{ setUserTheme }}>
      <ThemeSyncer skipSyncRef={skipSyncRef} />
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      forcedTheme={isLandingPage ? "light" : undefined}
    >
      <ThemeProviderInner>{children}</ThemeProviderInner>
    </NextThemesProvider>
  );
}
