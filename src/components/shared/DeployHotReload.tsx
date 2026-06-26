"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const POLL_MS = 30_000;
const IDLE_BEFORE_RELOAD_MS = 3_000;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return !!target.closest('[contenteditable="true"]');
}

/**
 * Sau mỗi lần deploy Vercel, poll /api/version và tự reload khi phát hiện build mới.
 * Chờ user ngừng gõ ~3s trước khi reload để tránh mất draft.
 */
export function DeployHotReload() {
  const buildIdRef = useRef<string | null>(null);
  const reloadingRef = useRef(false);
  const pendingReloadRef = useRef(false);
  const lastInputAtRef = useRef(0);
  const reloadTimerRef = useRef<number | null>(null);
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;

    const clearReloadTimer = () => {
      if (reloadTimerRef.current !== null) {
        window.clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
    };

    const canReloadNow = () =>
      Date.now() - lastInputAtRef.current >= IDLE_BEFORE_RELOAD_MS;

    const performReload = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      clearReloadTimer();
      toast.info("Đã có phiên bản mới — đang tải lại trang...", {
        duration: 2500,
      });
      window.setTimeout(() => window.location.reload(), 600);
    };

    const scheduleReloadWhenIdle = () => {
      if (!pendingReloadRef.current || reloadingRef.current) return;

      clearReloadTimer();

      const waitMs = Math.max(
        200,
        IDLE_BEFORE_RELOAD_MS - (Date.now() - lastInputAtRef.current)
      );

      reloadTimerRef.current = window.setTimeout(() => {
        reloadTimerRef.current = null;
        if (!pendingReloadRef.current || reloadingRef.current) return;

        if (canReloadNow()) {
          performReload();
        } else {
          scheduleReloadWhenIdle();
        }
      }, waitMs);
    };

    const queueReload = () => {
      pendingReloadRef.current = true;

      if (!toastShownRef.current) {
        toastShownRef.current = true;
        toast.info("Đã có phiên bản mới — sẽ tải lại khi bạn ngừng nhập...", {
          duration: 4000,
        });
      }

      if (canReloadNow()) {
        performReload();
      } else {
        scheduleReloadWhenIdle();
      }
    };

    const markTypingActivity = (event: Event) => {
      if (!isEditableTarget(event.target)) return;
      lastInputAtRef.current = Date.now();

      if (pendingReloadRef.current && !reloadingRef.current) {
        scheduleReloadWhenIdle();
      }
    };

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
          queueReload();
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

    const typingEvents = ["keydown", "input", "compositionstart", "paste"] as const;
    for (const eventName of typingEvents) {
      document.addEventListener(eventName, markTypingActivity, true);
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearReloadTimer();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const eventName of typingEvents) {
        document.removeEventListener(eventName, markTypingActivity, true);
      }
    };
  }, []);

  return null;
}
