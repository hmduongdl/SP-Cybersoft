"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import type { BlockLockInfo, ViewerInfo } from "@/lib/task-note-collab";

const POLL_IDLE_MS = 1200;
const POLL_ACTIVE_MS = 600;
const TYPING_IDLE_MS = 1200;

type LiveSyncStatus = "synced" | "error";

export type NoteCollabState = {
  locks: BlockLockInfo[];
  viewers: ViewerInfo[];
};

type PendingRemote = {
  revision: number;
  content: unknown;
  editorName: string | null;
};

export function useTaskNoteLiveSync(
  taskId: string,
  editor: BlockNoteEditor | null,
  options: {
    initialRevision?: number;
    canApplyRemoteRef: MutableRefObject<boolean>;
    lastKnownRevisionRef: MutableRefObject<number>;
    otherViewerCountRef: MutableRefObject<number>;
    onStatusChange?: (status: LiveSyncStatus) => void;
    onCollabStateChange?: (state: NoteCollabState) => void;
    onRemoteApplied?: (info: { editorName: string | null }) => void;
    skipSaveRef: MutableRefObject<boolean>;
  }
) {
  const {
    initialRevision = 0,
    canApplyRemoteRef,
    lastKnownRevisionRef,
    otherViewerCountRef,
    onStatusChange,
    onCollabStateChange,
    onRemoteApplied,
    skipSaveRef,
  } = options;

  const onStatusRef = useRef(onStatusChange);
  const onCollabRef = useRef(onCollabStateChange);
  const onRemoteAppliedRef = useRef(onRemoteApplied);
  const pendingRemoteRef = useRef<PendingRemote | null>(null);

  onStatusRef.current = onStatusChange;
  onCollabRef.current = onCollabStateChange;
  onRemoteAppliedRef.current = onRemoteApplied;

  useEffect(() => {
    lastKnownRevisionRef.current = initialRevision;
    pendingRemoteRef.current = null;
  }, [taskId, initialRevision, lastKnownRevisionRef]);

  useEffect(() => {
    if (!editor || !taskId) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const applyRemoteContent = (content: unknown, editorName: string | null) => {
      skipSaveRef.current = true;
      const blocks =
        content && Array.isArray(content) && content.length > 0
          ? content
          : [{ type: "paragraph", content: [] }];

      editor.replaceBlocks(editor.document, blocks as any);
      requestAnimationFrame(() => {
        skipSaveRef.current = false;
      });
      onRemoteAppliedRef.current?.({ editorName });
    };

    const tryApplyPending = () => {
      const pending = pendingRemoteRef.current;
      if (!pending || !canApplyRemoteRef.current) return false;
      if (pending.revision <= lastKnownRevisionRef.current) {
        pendingRemoteRef.current = null;
        return false;
      }

      lastKnownRevisionRef.current = pending.revision;
      pendingRemoteRef.current = null;
      applyRemoteContent(pending.content, pending.editorName);
      return true;
    };

    const handleRemoteNote = (note: {
      revision?: number;
      content: unknown;
      last_edited_by_name?: string | null;
    }) => {
      const remoteRevision = note.revision ?? 0;
      if (remoteRevision <= lastKnownRevisionRef.current) return;

      if (!canApplyRemoteRef.current) {
        pendingRemoteRef.current = {
          revision: remoteRevision,
          content: note.content,
          editorName: note.last_edited_by_name ?? null,
        };
        return;
      }

      lastKnownRevisionRef.current = remoteRevision;
      applyRemoteContent(note.content, note.last_edited_by_name ?? null);
    };

    const poll = async () => {
      if (cancelled) return;

      if (canApplyRemoteRef.current) {
        tryApplyPending();
      }

      try {
        const res = await fetch(`/api/tasks/${taskId}/note`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) throw new Error("poll failed");

        const data = await res.json();
        const note = data.note;

        const viewers: ViewerInfo[] = data.viewers ?? [];
        onCollabRef.current?.({
          locks: data.locks ?? [],
          viewers,
        });

        if (note) {
          handleRemoteNote(note);
        }
      } catch {
        onStatusRef.current?.("error");
      }
    };

    const scheduleNext = () => {
      if (cancelled) return;
      const ms =
        otherViewerCountRef.current > 0 ? POLL_ACTIVE_MS : POLL_IDLE_MS;
      timeoutId = setTimeout(() => {
        void poll().finally(scheduleNext);
      }, ms);
    };

    void poll().finally(scheduleNext);

    const onVisibility = () => {
      if (!document.hidden) void poll();
    };
    const onFocus = () => {
      void poll();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [
    editor,
    taskId,
    canApplyRemoteRef,
    lastKnownRevisionRef,
    otherViewerCountRef,
    skipSaveRef,
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
