"use client";

import { toast } from "sonner";

export interface QuotaErrorPayload {
  error?: string;
  quotaExceeded?: boolean;
  upgradePlan?: string;
  used?: number;
  limit?: number;
  resetsAt?: string;
}

export async function parseApiErrorResponse(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // ignore
  }

  if (res.status === 400) return "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.";
  if (res.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (res.status === 403) return "Bạn không có quyền hoặc đã hết hạn mức sử dụng.";
  if (res.status === 429) return "Bạn đã đạt giới hạn sử dụng. Vui lòng thử lại sau.";
  if (res.status === 500) return "Lỗi hệ thống. Vui lòng thử lại sau.";
  return `Yêu cầu thất bại (${res.status})`;
}

/**
 * Hiển thị toast lỗi khi chạm quota — kèm nút nâng cấp ngay tại điểm chạm.
 * Trả về payload quota nếu có, để caller cập nhật UI inline.
 */
export async function handleQuotaApiError(
  res: Response
): Promise<QuotaErrorPayload | null> {
  try {
    const data = (await res.clone().json()) as QuotaErrorPayload;
    const message =
      typeof data?.error === "string" && data.error.trim()
        ? data.error
        : await parseApiErrorResponse(res);

    if (data?.quotaExceeded) {
      const upgradePlan = data.upgradePlan ?? "MAX";
      toast.error(message, {
        duration: 10000,
        action: {
          label: `Nâng cấp ${upgradePlan}`,
          onClick: () => {
            window.location.href = "/pricing";
          },
        },
      });
      return data;
    }

    toast.error(message);
    return null;
  } catch {
    toast.error(await parseApiErrorResponse(res));
    return null;
  }
}
