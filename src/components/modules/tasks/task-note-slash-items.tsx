"use client";

import type { BlockNoteEditor } from "@blocknote/core";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { RefreshCw, Sparkles } from "lucide-react";

export function getTaskNoteSlashMenuItems(
  _editor: BlockNoteEditor,
  handlers: {
    onSync: () => void | Promise<void>;
    onRewrite: () => void | Promise<void>;
  }
): DefaultReactSuggestionItem[] {
  return [
    {
      title: "sync",
      subtext: "AI gộp bản server + local của bạn và lưu toàn cục",
      aliases: ["sync", "dongbo", "merge", "gop"],
      group: "AI",
      icon: <RefreshCw size={18} />,
      onItemClick: () => {
        void handlers.onSync();
      },
    },
    {
      title: "rewrite",
      subtext: "AI soạn lại ghi chú rõ ràng hơn và lưu",
      aliases: ["rewrite", "vietlai", "soanlai", "ai"],
      group: "AI",
      icon: <Sparkles size={18} />,
      onItemClick: () => {
        void handlers.onRewrite();
      },
    },
  ];
}
