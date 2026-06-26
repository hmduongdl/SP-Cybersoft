"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const POLL_MS = 90_000;

/**
 * Sau mỗi lần deploy Vercel, poll /api/version và tự reload khi phát hiện build mới.
 * Giúp user không bị kẹt cache JS cũ.
 */
export function DeployHotReload() {
  const buildIdRef = useRef<string | null>(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;

    const checkVersion = async () => {
      if (reloadingRef.current) return;

      try {
        const res = await fetch("/api/version", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) return;

        const data = await res.json();
        const id = data?.id as string | undefined;
        if (!id || id === "local-dev") return;

        if (buildIdRef.current === null) {
          buildIdRef.current = id;
          return;
        }

        if (buildIdRef.current !== id) {
          reloadingRef.current = true;
          toast.info("Đã có phiên bản mới — đang tải lại trang...", {
            duration: 2500,
          });
          window.setTimeout(() => window.location.reload(), 600);
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời
      }
    };

    void checkVersion();

    const intervalId = window.setInterval(checkVersion, POLL_MS);
    const onFocus = () => void checkVersion();
    const onVisibility = () => {
      if (!document.hidden) void checkVersion();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
