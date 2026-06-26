"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import type { BlockLockInfo, ViewerInfo } from "@/lib/task-note-collab";

const DEFAULT_POLL_MS = 1500;
const TYPING_IDLE_MS = 1200;

type LiveSyncStatus = "synced" | "error";

export type NoteCollabState = {
  locks: BlockLockInfo[];
  viewers: ViewerInfo[];
};

export function useTaskNoteLiveSync(
  taskId: string,
  editor: BlockNoteEditor | null,
  options: {
    initialUpdatedAt?: string | Date | null;
    onStatusChange?: (status: LiveSyncStatus) => void;
    onCollabStateChange?: (state: NoteCollabState) => void;
    skipSaveRef: MutableRefObject<boolean>;
    lastKnownUpdatedAtRef: MutableRefObject<number>;
    isTypingRef: MutableRefObject<boolean>;
    pollIntervalMs?: number;
  }
) {
  const {
    initialUpdatedAt,
    onStatusChange,
    onCollabStateChange,
    skipSaveRef,
    lastKnownUpdatedAtRef,
    isTypingRef,
    pollIntervalMs = DEFAULT_POLL_MS,
  } = options;

  const onStatusRef = useRef(onStatusChange);
  const onCollabRef = useRef(onCollabStateChange);
  onStatusRef.current = onStatusChange;
  onCollabRef.current = onCollabStateChange;

  useEffect(() => {
    if (initialUpdatedAt) {
      lastKnownUpdatedAtRef.current = new Date(initialUpdatedAt).getTime();
    }
  }, [taskId, initialUpdatedAt, lastKnownUpdatedAtRef]);

  useEffect(() => {
    if (!editor || !taskId) return;

    let cancelled = false;

    const applyRemoteContent = (content: unknown) => {
      skipSaveRef.current = true;
      const blocks =
        content && Array.isArray(content) && content.length > 0
          ? content
          : [{ type: "paragraph", content: [] }];

      editor.replaceBlocks(editor.document, blocks as any);
      requestAnimationFrame(() => {
        skipSaveRef.current = false;
      });
    };

    const poll = async () => {
      if (cancelled || document.hidden || isTypingRef.current) return;

      try {
        const res = await fetch(`/api/tasks/${taskId}/note`, { cache: "no-store" });
        if (!res.ok) throw new Error("poll failed");

        const data = await res.json();
        const note = data.note;

        onCollabRef.current?.({
          locks: data.locks ?? [],
          viewers: data.viewers ?? [],
        });

        if (!note?.updatedAt) {
          onStatusRef.current?.("synced");
          return;
        }

        const remoteTs = new Date(note.updatedAt).getTime();
        if (remoteTs <= lastKnownUpdatedAtRef.current) {
          onStatusRef.current?.("synced");
          return;
        }

        lastKnownUpdatedAtRef.current = remoteTs;
        applyRemoteContent(note.content);
        onStatusRef.current?.("synced");
      } catch {
        onStatusRef.current?.("error");
      }
    };

    poll();
    const intervalId = setInterval(poll, pollIntervalMs);

    const onVisibility = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    editor,
    taskId,
    pollIntervalMs,
    skipSaveRef,
    lastKnownUpdatedAtRef,
    isTypingRef,
  ]);
}

export function useTypingGuard(isTypingRef: MutableRefObject<boolean>) {
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const markTyping = () => {
    isTypingRef.current = true;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      typingTimerRef.current = null;
    }, TYPING_IDLE_MS);
  };

  const clearTyping = () => {
    isTypingRef.current = false;
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  return { markTyping, clearTyping };
}
