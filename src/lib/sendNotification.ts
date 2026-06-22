/**
 * Client-side helper: gọi API /api/send-notification
 * Chỉ dùng ở client, không import nodemailer ở đây
 */
export interface SendNotificationParams {
  to: string;
  subject: string;
  message: string;
}

export async function sendNotification({
  to,
  subject,
  message,
}: SendNotificationParams): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, message }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error("[sendNotification] Failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi không xác định",
    };
  }
}
