/**
 * mailer.ts - Resend email client dùng chung cho server routes/scripts.
 */
import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend {
  if (resend) return resend;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Thiếu biến môi trường RESEND_API_KEY. Vui lòng kiểm tra file .env.local");
  }

  resend = new Resend(apiKey);
  return resend;
}

function getFromAddress(): string {
  const domain = process.env.RESEND_EMAIL_DOMAIN || "sp-cybersoft.com";
  const fromEmail = process.env.RESEND_FROM_EMAIL || `noreply@${domain}`;
  const fromName = process.env.RESEND_FROM_NAME || "SP-Cybersoft";

  return `"${fromName}" <${fromEmail}>`;
}

/** Tham số cho hàm sendMail */
export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

/** Gửi email qua Resend. Throw error nếu thất bại để phía caller xử lý. */
export async function sendMail({ to, subject, html }: SendMailParams): Promise<void> {
  try {
    const { data, error } = await getResend().emails.send({
      from: getFromAddress(),
      to,
      subject,
      html,
    });

    if (error) {
      throw error;
    }

    console.log(`[mailer] Email sent: ${data?.id ?? "unknown"} -> ${to}`);
  } catch (error) {
    console.error("[mailer] Failed to send email:", error);
    throw error;
  }
}
