import type { BlockNoteEditor } from "@blocknote/core";

/** Xóa "/sync", "/rewrite"... khỏi block hiện tại sau khi chọn slash command. */
export function stripSlashCommandSuffix(editor: BlockNoteEditor) {
  try {
    const { block } = editor.getTextCursorPosition();
    if (!block.content || !Array.isArray(block.content)) return;

    const fullText = (block.content as { type?: string; text?: string }[])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");

    const match = fullText.match(/\/[a-zA-Z0-9_-]*$/);
    if (!match) return;

    const newText = fullText.slice(0, fullText.length - match[0].length);
    editor.updateBlock(block, {
      content: newText ? [{ type: "text", text: newText, styles: {} }] : [],
    });
  } catch {
    // ignore
  }
}
