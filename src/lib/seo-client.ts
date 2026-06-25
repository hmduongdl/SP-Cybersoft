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
