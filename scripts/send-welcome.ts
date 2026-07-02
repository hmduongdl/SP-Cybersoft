/**
 * Script gửi email chào mừng để test Resend.
 * Chạy: npm run email:test-welcome -- user@example.com "Tên người nhận"
 */
import { loadEnvConfig } from "@next/env";
import { sendMail } from "../src/lib/mailer";
import { buildNotificationEmail } from "../src/lib/email-template";

loadEnvConfig(process.cwd());

async function main() {
  const to = process.argv[2] || process.env.TEST_WELCOME_EMAIL || process.env.ADMIN_EMAIL;
  const name = process.argv[3] || process.env.TEST_WELCOME_NAME || "bạn";

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.error('Thiếu email người nhận. Ví dụ: npm run email:test-welcome -- user@example.com "Nguyễn Văn A"');
    process.exit(1);
  }

  const subject = "Chào mừng bạn đến với SP-Cybersoft!";
  const message =
    `Xin chào ${name},\n\n` +
    "Chào mừng bạn đã tham gia hệ thống SP-Cybersoft. " +
    "Chúng tôi rất vui khi có bạn đồng hành cùng đội ngũ.\n\n" +
    "Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.\n\n" +
    "Chúc bạn một ngày làm việc hiệu quả!";

  try {
    const html = await buildNotificationEmail(subject, message);
    await sendMail({ to, subject, html });
    console.log(`Email chào mừng đã được gửi thành công đến ${to}!`);
  } catch (error) {
    console.error("Gửi email thất bại:", error);
    process.exit(1);
  }
}

main();
