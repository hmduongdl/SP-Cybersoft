import { aibox, MODEL_CHAT_PRO } from "@/lib/aibox";

// SEO tools dùng chung AI client (AI Box) với toàn bộ hệ thống.
// Model cố định: DeepSeek Pro v4 — không hiển thị tên model cho người dùng.
export const openai = aibox;
export const SEO_MODEL = MODEL_CHAT_PRO;

type SeoCompletionOptions = {
  prompt: string;
  /** Ngân sách token cho cả phần reasoning + nội dung. */
  maxTokens?: number;
  /** Bắt buộc model trả về JSON object. */
  jsonMode?: boolean;
  temperature?: number;
  system?: string;
};

/**
 * Gọi AI và LUÔN trả về nội dung text.
 *
 * DeepSeek v4 là model reasoning: phần "suy luận" được tính chung vào
 * completion tokens. Nếu max_tokens quá thấp so với độ phức tạp đầu vào,
 * toàn bộ token bị tiêu vào reasoning và `content` trả về rỗng
 * (finish_reason = "length"). Helper này tự động thử lại với ngân sách
 * token gấp đôi khi gặp tình huống đó, và ném lỗi rõ ràng nếu vẫn thất bại.
 */
export async function generateSeoText(opts: SeoCompletionOptions): Promise<string> {
  const { prompt, maxTokens = 4000, jsonMode = false, temperature, system } = opts;

  const messages = [
    ...(system ? [{ role: "system" as const, content: system }] : []),
    { role: "user" as const, content: prompt },
  ];

  const budgets = [maxTokens, maxTokens * 2];
  let lastFinishReason = "";

  for (const tokens of budgets) {
    const completion = await aibox.chat.completions.create({
      model: SEO_MODEL,
      messages,
      max_tokens: tokens,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
    });

    const choice = completion.choices?.[0];
    const content = choice?.message?.content?.trim();
    lastFinishReason = choice?.finish_reason || "";

    if (content) return content;

    // Chỉ retry khi bị cắt do hết token (reasoning ăn hết). Lỗi khác → dừng.
    if (lastFinishReason !== "length") break;
  }

  throw new Error(
    lastFinishReason === "length"
      ? "Dữ liệu đầu vào quá phức tạp khiến AI vượt giới hạn xử lý. Vui lòng rút gọn bớt và thử lại."
      : "Không nhận được phản hồi từ AI. Vui lòng thử lại."
  );
}
