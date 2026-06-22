/**
 * mailer.ts - Cấu hình Nodemailer transporter dùng chung với Gmail
 * Sử dụng Gmail App Password để xác thực, không lộ credentials ra client
 */
import nodemailer from "nodemailer";

// Cache transporter để tránh tạo lại mỗi lần gửi
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "Thiếu biến môi trường GMAIL_USER hoặc GMAIL_APP_PASSWORD. Vui lòng kiểm tra file .env.local"
    );
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return transporter;
}

/** Tham số cho hàm sendMail */
export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Gửi email qua Gmail SMTP
 * Throw error nếu thất bại để phía caller xử lý
 */
export async function sendMail({ to, subject, html }: SendMailParams): Promise<void> {
  const transport = getTransporter();

  try {
    const info = await transport.sendMail({
      from: `"Teamwork Check" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[mailer] Email sent: ${info.messageId} → ${to}`);
  } catch (error) {
    console.error("[mailer] Failed to send email:", error);
    throw error;
  }
}
