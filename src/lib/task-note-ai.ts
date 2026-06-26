import { BlockNoteEditor } from "@blocknote/core";
import { aibox, MODEL_CHAT_FLASH } from "@/lib/aibox";
import { extractTextFromBlockNote } from "@/lib/task-note-persist";

function extractMarkdown(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)```$/i);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

async function callNoteAI(system: string, user: string): Promise<string> {
  const res = await aibox.chat.completions.create({
    model: MODEL_CHAT_FLASH,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.35,
  });

  const text = res.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("AI không trả về nội dung");
  return extractMarkdown(text);
}

export function markdownToBlockNoteBlocks(markdown: string): unknown[] {
  const editor = BlockNoteEditor.create();
  const blocks = editor.tryParseMarkdownToBlocks(markdown);
  return blocks as unknown[];
}

const MERGE_SYSTEM = `Bạn là trợ lý gộp ghi chú công việc nhóm trong SP-CyberSoft.
Nhiệm vụ: hợp nhất bản đã lưu trên server (có thể chứa đóng góp từ đồng nghiệp) với bản local user đang chỉnh thành MỘT ghi chú thống nhất.

Quy tắc:
- Giữ TOÀN BỘ thông tin quan trọng từ cả hai nguồn
- Loại trùng lặp; ưu tiên chi tiết cụ thể hơn khi có mâu thuẫn nhẹ
- Nếu biết ai chỉnh sửa lần cuối trên server, có thể ghi chú ngắn (không bắt buộc)
- Trả về CHỈ markdown thuần (heading, bullet, checklist) — không code fence, không giải thích`;

const REWRITE_SYSTEM = `Bạn là trợ lý soạn ghi chú công việc trong SP-CyberSoft.
Viết lại nội dung cho RÕ RÀNG, có cấu trúc, dễ đọc. Giữ nguyên ý nghĩa và sự kiện.
Trả về CHỈ markdown thuần — không code fence, không giải thích thêm.`;

export async function mergeTaskNoteWithAI(opts: {
  taskTitle?: string;
  serverContent: unknown[] | null;
  localContent: unknown[];
  serverEditedBy?: string | null;
  otherViewerNames?: string[];
}): Promise<string> {
  const serverText = opts.serverContent
    ? extractTextFromBlockNote(opts.serverContent as any[])
    : "";
  const localText = extractTextFromBlockNote(opts.localContent as any[]);

  const context = [
    opts.taskTitle ? `Task: ${opts.taskTitle}` : "",
    opts.serverEditedBy
      ? `Lần lưu server gần nhất bởi: ${opts.serverEditedBy}`
      : "",
    opts.otherViewerNames?.length
      ? `Đang có người khác xem: ${opts.otherViewerNames.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `${context ? context + "\n\n" : ""}## Bản đã lưu trên server (toàn cục)
${serverText || "(trống)"}

## Bản local user đang chỉnh (chưa hoặc vừa lưu)
${localText || "(trống)"}

Hãy gộp hai bản thành một ghi chú markdown hoàn chỉnh.`;

  return callNoteAI(MERGE_SYSTEM, userPrompt);
}

export async function rewriteTaskNoteWithAI(opts: {
  taskTitle?: string;
  content: unknown[];
}): Promise<string> {
  const text = extractTextFromBlockNote(opts.content as any[]);
  const userPrompt = `${opts.taskTitle ? `Task: ${opts.taskTitle}\n\n` : ""}${text || "(ghi chú trống)"}`;
  return callNoteAI(REWRITE_SYSTEM, userPrompt);
}
