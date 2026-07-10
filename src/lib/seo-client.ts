import { toast } from "sonner";
import { copyMarkdownAsRichText } from "@/utils/clipboard";

export async function copyToClipboard(text: string, successMessage: string) {
  if (!text.trim()) {
    toast.error("Không có nội dung để copy");
    return;
  }

  if (await copyMarkdownAsRichText(text)) {
    toast.success(successMessage);
  } else {
    toast.error("Không thể copy vào clipboard");
  }
}

/** Đọc response text/plain stream từ SEO API, cập nhật UI theo từng chunk. */
export async function readTextStream(
  res: Response,
  onChunk: (accumulated: string) => void
): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Không thể khởi tạo luồng nhận dữ liệu.");
  }

  const decoder = new TextDecoder();
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulated += decoder.decode(value, { stream: true });
    onChunk(accumulated);
  }

  return accumulated;
}

import { handleQuotaApiError, type QuotaErrorPayload } from "@/lib/quota-client";

export { parseApiErrorResponse } from "@/lib/quota-client";

/** Hiển thị toast lỗi API SEO — kèm nút nâng cấp khi chạm quota */
export async function handleSeoApiError(res: Response): Promise<QuotaErrorPayload | null> {
  return handleQuotaApiError(res);
}

/** Làm sạch code fence ```markdown / ``` nếu model bọc kết quả bảng. */
export function cleanSeoTableMarkdown(raw: string): string {
  return raw
    .replace(/^```(?:markdown|md)?/i, "")
    .replace(/```$/, "")
    .trim();
}
