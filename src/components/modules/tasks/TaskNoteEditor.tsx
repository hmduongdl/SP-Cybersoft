"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { vi } from "@blocknote/core/locales";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  useTaskNoteLiveSync,
  useTypingGuard,
  type NoteCollabState,
} from "@/hooks/useTaskNoteLiveSync";
import { useTaskNoteBlockLock } from "@/hooks/useTaskNoteBlockLock";
import { useTaskStore } from "@/store/useTaskStore";

const NOTE_PLACEHOLDER = "Nhập nội dung hoặc gõ '/' để mở menu lệnh";

type TaskNoteEditorProps = {
  taskId: string;
  initialContent?: unknown;
  initialRevision?: number;
  isDarkMode: boolean;
  onSaveStatusChange?: (
    status: "idle" | "saving" | "saved" | "error" | "synced"
  ) => void;
};

export function TaskNoteEditor({
  taskId,
  initialContent,
  initialRevision = 0,
  isDarkMode,
  onSaveStatusChange,
}: TaskNoteEditorProps) {
  const { data: session } = useSession();
  const updateTaskNote = useTaskStore((s) => s.updateTaskNote);

  const noteDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const skipSaveRef = useRef(false);
  const lastKnownRevisionRef = useRef(initialRevision);
  const isTypingRef = useRef(false);
  const canApplyRemoteRef = useRef(true);
  const otherViewerCountRef = useRef(0);
  const blockWarnedRef = useRef<string | null>(null);
  const { markTyping, clearTyping } = useTypingGuard(isTypingRef);

  const [collabState, setCollabState] = useState<NoteCollabState>({
    locks: [],
    viewers: [],
  });

  const editor = useCreateBlockNote(
    {
      initialContent: initialContent ? (initialContent as any) : undefined,
      dictionary: {
        ...vi,
        placeholders: {
          ...vi.placeholders,
          default: NOTE_PLACEHOLDER,
          emptyDocument: NOTE_PLACEHOLDER,
        },
      },
    },
    [taskId]
  );

  const syncCanApplyRemote = () => {
    canApplyRemoteRef.current =
      !isTypingRef.current && noteDebounceRef.current === null;
  };

  const { getRemoteLocks, otherViewers } = useTaskNoteBlockLock(
    taskId,
    editor,
    session?.user?.id,
    collabState
  );

  useEffect(() => {
    otherViewerCountRef.current = otherViewers.length;
  }, [otherViewers.length]);

  useTaskNoteLiveSync(taskId, editor, {
    initialRevision,
    skipSaveRef,
    lastKnownRevisionRef,
    canApplyRemoteRef,
    otherViewerCountRef,
    onStatusChange: (status) => {
      if (status === "synced") onSaveStatusChange?.("synced");
      else onSaveStatusChange?.("error");
    },
    onCollabStateChange: setCollabState,
    onRemoteApplied: ({ editorName }) => {
      if (editorName) {
        toast.info(`Đã đồng bộ bản mới từ ${editorName}`, { duration: 2500 });
      } else {
        toast.info("Đã đồng bộ bản mới", { duration: 2000 });
      }
    },
  });

  useEffect(() => {
    if (!editor) return;

    const unsubscribeBefore = editor.onBeforeChange(({ getChanges }) => {
      const remoteLocks = getRemoteLocks();
      if (remoteLocks.size === 0) return true;

      for (const change of getChanges()) {
        const blockId =
          "block" in change &&
          change.block &&
          typeof change.block === "object" &&
          "id" in change.block
            ? (change.block as { id: string }).id
            : null;
        if (!blockId) continue;

        const lock = remoteLocks.get(blockId);
        if (lock) {
          if (blockWarnedRef.current !== blockId) {
            blockWarnedRef.current = blockId;
            toast.warning(
              `${lock.userName || "Ai đó"} đang sửa dòng này — chờ họ xong hoặc chọn dòng khác`
            );
          }
          return false;
        }
      }

      blockWarnedRef.current = null;
      return true;
    });

    return () => unsubscribeBefore();
  }, [editor, getRemoteLocks]);

  useEffect(() => {
    if (!editor) return;

    const unsubscribe = editor.onChange(() => {
      if (skipSaveRef.current) return;

      markTyping();
      syncCanApplyRemote();
      if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current);
      onSaveStatusChange?.("saving");

      noteDebounceRef.current = setTimeout(async () => {
        noteDebounceRef.current = null;
        syncCanApplyRemote();
        try {
          const saved = await updateTaskNote(taskId, editor.document);
          if (saved?.revision != null) {
            lastKnownRevisionRef.current = saved.revision;
          }
          clearTyping();
          syncCanApplyRemote();
          onSaveStatusChange?.("saved");
        } catch {
          onSaveStatusChange?.("error");
        }
      }, 600);
    });

    return () => {
      unsubscribe();
      if (noteDebounceRef.current) {
        clearTimeout(noteDebounceRef.current);
        noteDebounceRef.current = null;
      }
      syncCanApplyRemote();
    };
  }, [editor, taskId, updateTaskNote, onSaveStatusChange, markTyping, clearTyping]);

  const remoteLocks = getRemoteLocks();

  if (!editor) return null;

  return (
    <div className="relative">
      {remoteLocks.size > 0 && (
        <style dangerouslySetInnerHTML={{
          __html: Array.from(remoteLocks.entries()).map(([blockId, lock]) => {
            const escapedName = (lock.userName || "Ai đó").replace(/"/g, '\\"');
            return `
              .bn-editor [data-id="${blockId}"] {
                position: relative !important;
                background-color: ${isDarkMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)'} !important;
                border-left: 3px solid #ef4444 !important;
                border-top-left-radius: 2px;
                border-bottom-left-radius: 2px;
                padding-left: 4px !important;
              }
              .bn-editor [data-id="${blockId}"]::before {
                content: "${escapedName} đang sửa";
                position: absolute;
                right: 8px;
                top: 2px;
                font-size: 9px;
                font-family: sans-serif;
                color: #ef4444;
                background-color: ${isDarkMode ? '#2d1a1a' : '#fef2f2'};
                padding: 1px 4px;
                border-radius: 3px;
                border: 1px solid rgba(239, 68, 68, 0.2);
                z-index: 10;
                pointer-events: none;
                opacity: 0.8;
              }
            `;
          }).join('\n')
        }} />
      )}
      {(otherViewers.length > 0 || remoteLocks.size > 0) && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {otherViewers.map((v) => (
            <span
              key={v.userId}
              className="text-[10px] px-2 py-0.5 rounded-full bg-primary-container text-on-muted animate-pulse"
            >
              🟢 {v.userName || "Ai đó"} đang xem
            </span>
          ))}
          {Array.from(remoteLocks.entries()).map(([blockId, lock]) => (
            <span
              key={blockId}
              className="text-[10px] px-2 py-0.5 rounded-full bg-warn-bg text-warn-text"
            >
              🔒 {lock.userName || "Ai đó"} đang sửa dòng
            </span>
          ))}
        </div>
      )}
      <BlockNoteView editor={editor} theme={isDarkMode ? "dark" : "light"} />
    </div>
  );
}
