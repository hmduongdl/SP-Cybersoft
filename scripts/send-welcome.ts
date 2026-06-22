/**
 * Script gửi email chào mừng cho user Nguyễn Phước Lộc
 * Chạy: npx tsx scripts/send-welcome.ts
 */
import { sendMail } from "../src/lib/mailer";
import { buildNotificationEmail } from "../src/lib/email-template";

async function main() {
  const to = "sp.phuocloc@gmail.com";
  const subject = "Chào mừng bạn đến với Teamwork Check!";
  const message =
    "Xin chào Nguyễn Phước Lộc,\n\n" +
    "Chào mừng bạn đã tham gia hệ thống Teamwork Check. " +
    "Chúng tôi rất vui khi có bạn đồng hành cùng đội ngũ.\n\n" +
    "Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.\n\n" +
    "Chúc bạn một ngày làm việc hiệu quả!";

  try {
    const html = buildNotificationEmail(subject, message);
    await sendMail({ to, subject, html });
    console.log("Email chào mừng đã được gửi thành công!");
  } catch (error) {
    console.error("Gửi email thất bại:", error);
    process.exit(1);
  }
}

main();
