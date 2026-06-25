import { toast } from "sonner";

export async function copyToClipboard(text: string, successMessage: string) {
  if (!text.trim()) {
    toast.error("Không có nội dung để copy");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
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

export async function parseApiErrorResponse(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // ignore JSON parse failure
  }

  if (res.status === 400) return "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.";
  if (res.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (res.status === 500) return "Lỗi hệ thống. Vui lòng thử lại sau.";
  return `Yêu cầu thất bại (${res.status})`;
}

/** Làm sạch code fence ```markdown / ``` nếu model bọc kết quả bảng. */
export function cleanSeoTableMarkdown(raw: string): string {
  return raw
    .replace(/^```(?:markdown|md)?/i, "")
    .replace(/```$/, "")
    .trim();
}
