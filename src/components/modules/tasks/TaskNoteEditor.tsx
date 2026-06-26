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
  initialUpdatedAt?: string | Date | null;
  isDarkMode: boolean;
  onSaveStatusChange?: (
    status: "idle" | "saving" | "saved" | "error" | "synced"
  ) => void;
};

export function TaskNoteEditor({
  taskId,
  initialContent,
  initialUpdatedAt,
  isDarkMode,
  onSaveStatusChange,
}: TaskNoteEditorProps) {
  const { data: session } = useSession();
  const updateTaskNote = useTaskStore((s) => s.updateTaskNote);

  const noteDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const skipSaveRef = useRef(false);
  const lastKnownUpdatedAtRef = useRef(0);
  const isTypingRef = useRef(false);
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

  const { getRemoteLocks, otherViewers } = useTaskNoteBlockLock(
    taskId,
    editor,
    session?.user?.id,
    collabState
  );

  useTaskNoteLiveSync(taskId, editor, {
    initialUpdatedAt,
    skipSaveRef,
    lastKnownUpdatedAtRef,
    isTypingRef,
    onStatusChange: (status) => {
      if (status === "synced") onSaveStatusChange?.("synced");
      else onSaveStatusChange?.("error");
    },
    onCollabStateChange: setCollabState,
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
      if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current);
      onSaveStatusChange?.("saving");

      noteDebounceRef.current = setTimeout(async () => {
        try {
          const saved = await updateTaskNote(taskId, editor.document);
          if (saved?.updatedAt) {
            lastKnownUpdatedAtRef.current = new Date(saved.updatedAt).getTime();
          }
          clearTyping();
          onSaveStatusChange?.("saved");
        } catch {
          onSaveStatusChange?.("error");
        }
        noteDebounceRef.current = null;
      }, 800);
    });

    return () => {
      unsubscribe();
      if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current);
    };
  }, [editor, taskId, updateTaskNote, onSaveStatusChange, markTyping, clearTyping]);

  const remoteLocks = getRemoteLocks();

  if (!editor) return null;

  return (
    <div className="relative">
      {(otherViewers.length > 0 || remoteLocks.size > 0) && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {otherViewers.map((v) => (
            <span
              key={v.userId}
              className="text-[10px] px-2 py-0.5 rounded-full bg-primary-container text-on-muted"
            >
              {v.userName || "Ai đó"} đang xem
            </span>
          ))}
          {Array.from(remoteLocks.entries()).map(([blockId, lock]) => (
            <span
              key={blockId}
              className="text-[10px] px-2 py-0.5 rounded-full bg-warn-bg text-warn-text"
            >
              {lock.userName || "Ai đó"} đang sửa một dòng
            </span>
          ))}
        </div>
      )}
      <BlockNoteView editor={editor} theme={isDarkMode ? "dark" : "light"} />
    </div>
  );
}
