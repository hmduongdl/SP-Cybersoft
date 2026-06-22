/**
 * Template HTML cho email thông báo
 * Style inline để hiển thị tốt trên Gmail
 */
export function buildNotificationEmail(subject: string, message: string): string {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0;">${escapeHtml(subject)}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <div style="font-size:16px;line-height:1.6;color:#374151;">
                ${escapeHtml(message).replace(/\n/g, "<br>")}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="font-size:13px;color:#9ca3af;margin:0;text-align:center;">
                Email được gửi tự động từ hệ thống <strong>Teamwork Check</strong>.<br>
                Vui lòng không trả lời trực tiếp email này.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Escape HTML để tránh XSS */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
