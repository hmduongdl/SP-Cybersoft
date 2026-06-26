"use client";

import { useCallback, useEffect, useRef } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import type { BlockLockInfo, ViewerInfo } from "@/lib/task-note-collab";

const LOCK_RENEW_MS = 3000;
const PRESENCE_HEARTBEAT_MS = 3000;

export function useTaskNoteBlockLock(
  taskId: string,
  editor: BlockNoteEditor | null,
  currentUserId: string | undefined,
  collabState: { locks: BlockLockInfo[]; viewers: ViewerInfo[] }
) {
  const activeBlockIdRef = useRef<string | null>(null);
  const lockWarnedRef = useRef<string | null>(null);

  const getRemoteLocks = useCallback((): Map<string, { userName: string | null }> => {
    const map = new Map<string, { userName: string | null }>();
    if (!currentUserId) return map;

    for (const lock of collabState.locks) {
      if (lock.userId !== currentUserId) {
        map.set(lock.blockId, { userName: lock.userName });
      }
    }
    return map;
  }, [collabState.locks, currentUserId]);

  const otherViewers = collabState.viewers.filter((v) => v.userId !== currentUserId);

  const claimLock = useCallback(
    async (blockId: string | null) => {
      if (!taskId || !blockId || !currentUserId) return;

      activeBlockIdRef.current = blockId;

      try {
        const res = await fetch(`/api/tasks/${taskId}/note/lock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blockId }),
        });
        if (res.status === 409) {
          const data = await res.json();
          if (lockWarnedRef.current !== blockId) {
            lockWarnedRef.current = blockId;
          }
          void data;
        } else {
          lockWarnedRef.current = null;
        }
      } catch {
        // ignore — poll will refresh lock state
      }
    },
    [taskId, currentUserId]
  );

  const releaseLocks = useCallback(async () => {
    if (!taskId || !currentUserId) return;
    activeBlockIdRef.current = null;
    try {
      await fetch(`/api/tasks/${taskId}/note/lock`, { method: "DELETE" });
    } catch {
      // ignore
    }
  }, [taskId, currentUserId]);

  useEffect(() => {
    if (!editor || !taskId || !currentUserId) return;

    const refreshFocusLock = () => {
      try {
        const pos = editor.getTextCursorPosition();
        void claimLock(pos?.block?.id ?? null);
      } catch {
        void claimLock(null);
      }
    };

    refreshFocusLock();
    const renewId = setInterval(refreshFocusLock, LOCK_RENEW_MS);
    const unsubSelection = editor.onSelectionChange(refreshFocusLock);

    return () => {
      clearInterval(renewId);
      unsubSelection();
      void releaseLocks();
    };
  }, [editor, taskId, currentUserId, claimLock, releaseLocks]);

  useEffect(() => {
    if (!taskId || !currentUserId) return;

    const heartbeat = () => {
      void fetch(`/api/tasks/${taskId}/note/presence`, { method: "POST" });
    };

    heartbeat();
    const id = setInterval(heartbeat, PRESENCE_HEARTBEAT_MS);

    return () => {
      clearInterval(id);
      void fetch(`/api/tasks/${taskId}/note/presence`, { method: "DELETE" });
    };
  }, [taskId, currentUserId]);

  return { getRemoteLocks, otherViewers, releaseLocks };
}
