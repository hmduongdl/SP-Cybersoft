import { aibox, MODEL_CHAT_FLASH } from "@/lib/aibox";

// SEO tools ưu tiên tốc độ phản hồi — mặc định Flash, override qua MODEL_SEO nếu cần.
export const openai = aibox;
export const SEO_MODEL = process.env.MODEL_SEO || MODEL_CHAT_FLASH;

export const SEO_STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
} as const;

/** Hướng dẫn model trả lời trực tiếp, giảm thời gian suy luận trước khi xuất text. */
export const SEO_SYSTEM_PROMPT =
  "Bạn là công cụ nội dung Song Phương. Trả lời trực tiếp kết quả cuối cùng, không giải thích quy trình, không thêm lời dẫn hay ghi chú.";

export type SeoCompletionOptions = {
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
function buildSeoMessages(opts: SeoCompletionOptions) {
  const { prompt, system } = opts;
  return [
    { role: "system" as const, content: system ?? SEO_SYSTEM_PROMPT },
    { role: "user" as const, content: prompt },
  ];
}

/** Stream từng chunk text — dùng cho SEO API để hiển thị kết quả ngay khi model bắt đầu trả lời. */
export async function* streamSeoText(opts: SeoCompletionOptions): AsyncGenerator<string> {
  const { maxTokens = 2500, jsonMode = false, temperature } = opts;
  const messages = buildSeoMessages(opts);

  const completion = await aibox.chat.completions.create({
    model: SEO_MODEL,
    messages,
    max_tokens: maxTokens,
    stream: true,
    ...(temperature !== undefined ? { temperature } : {}),
    ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
  });

  for await (const chunk of completion) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

export async function generateSeoText(opts: SeoCompletionOptions): Promise<string> {
  const { prompt, maxTokens = 2500, jsonMode = false, temperature, system } = opts;

  const messages = buildSeoMessages({ prompt, system });

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
