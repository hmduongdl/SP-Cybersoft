import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";

/**
 * Tìm tất cả người dùng đang có gói MAX hiệu lực (bao gồm cả Admin và người dùng đăng ký gói MAX chưa hết hạn)
 */
async function getActiveMaxUsers() {
  const users = await db.user.findMany({
    where: {
      OR: [
        { role: "ADMIN" },
        { plan: "MAX" }
      ],
      is_active: true,
    },
    select: {
      email: true,
      name: true,
      role: true,
      plan: true,
      plan_expires_at: true,
    },
  });

  return users.filter((u) => {
    if (u.role === "ADMIN") return true;
    if (u.plan === "MAX") {
      if (!u.plan_expires_at) return true;
      return new Date() <= new Date(u.plan_expires_at);
    }
    return false;
  });
}

/**
 * Gửi email thông báo khi có bài viết Share Post (Like - Share) mới.
 * Thuật toán tối ưu: Gửi đúng 1 lần khi bài viết được đăng.
 */
export async function notifyNewSharePost(title: string, description: string, url: string) {
  try {
    const maxUsers = await getActiveMaxUsers();
    if (maxUsers.length === 0) return;

    const emailPromises = maxUsers.map(async (user) => {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg: 8px;">
          <h2 style="color: #6b46c1; margin-bottom: 16px;">Yêu cầu Check-in Like & Share mới!</h2>
          <p>Xin chào <strong>${user.name || "Thành viên MAX"}</strong>,</p>
          <p>Hệ thống vừa cập nhật một bài viết cần thực hiện Check-in Like & Share ngày hôm nay:</p>
          <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #6b46c1; margin: 20px 0;">
            <h4 style="margin: 0 0 8px 0; color: #2d3748;">${title}</h4>
            <p style="margin: 0; color: #4a5568; font-size: 14px;">${description || "Không có mô tả chi tiết."}</p>
          </div>
          <p style="margin-bottom: 24px;">Vui lòng truy cập liên kết dưới đây để thực hiện nhiệm vụ:</p>
          <a href="${url}" target="_blank" style="display: inline-block; background-color: #6b46c1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Đi đến bài viết</a>
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;" />
          <p style="font-size: 11px; color: #a0aec0;">Bạn nhận được thông báo này vì đang sử dụng gói tính năng MAX của SP-CyberSoft. Trân trọng cảm ơn!</p>
        </div>
      `;

      await sendMail({
        to: user.email,
        subject: `[Check-in] Nhiệm vụ Like - Share mới: ${title}`,
        html,
      }).catch((e) => {
        console.error(`Không thể gửi mail Like-Share đến ${user.email}:`, e);
      });
    });

    await Promise.all(emailPromises);
  } catch (error) {
    console.error("Lỗi gửi thông báo Like-Share cho gói MAX:", error);
  }
}

/**
 * Gửi email thông báo khi có đề bài Build PC mới.
 * Thuật toán tối ưu: Chỉ gửi 1 lần mỗi ngày cho đề bài đầu tiên.
 */
export async function notifyNewPcBuildTask(customerNeed: string, requirements: string) {
  try {
    // Thuật toán tối ưu tài nguyên email hàng tháng:
    // Kiểm tra xem hôm nay đã có bài build PC nào chưa.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const taskCountToday = await db.pcBuildTask.count({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Nếu đã có bài viết trước đó trong ngày hôm nay -> không gửi thêm mail (tối ưu hóa số lượng gửi)
    if (taskCountToday > 1) {
      console.log("[notify] Đã gửi thông báo Build PC hôm nay rồi. Bỏ qua gửi email tiếp theo để tối ưu tài nguyên.");
      return;
    }

    const maxUsers = await getActiveMaxUsers();
    if (maxUsers.length === 0) return;

    const emailPromises = maxUsers.map(async (user) => {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg: 8px;">
          <h2 style="color: #dd6b20; margin-bottom: 16px;">Đề bài Đào tạo Build PC mới hôm nay! 🖥️</h2>
          <p>Xin chào <strong>${user.name || "Thành viên MAX"}</strong>,</p>
          <p>Đề bài thực hành Build PC đầu tiên của ngày hôm nay đã được đăng tải:</p>
          <div style="background-color: #fffaf0; padding: 15px; border-left: 4px solid #dd6b20; margin: 20px 0;">
            <h4 style="margin: 0 0 8px 0; color: #2d3748;">Nhu cầu khách hàng:</h4>
            <p style="margin: 0 0 12px 0; color: #4a5568; font-size: 14px;">${customerNeed}</p>
            <h4 style="margin: 0 0 8px 0; color: #2d3748;">Yêu cầu chi tiết:</h4>
            <p style="margin: 0; color: #4a5568; font-size: 14px;">${requirements || "Không có yêu cầu đặc biệt."}</p>
          </div>
          <p style="margin-bottom: 24px;">Vui lòng truy cập hệ thống để tham gia thực hành và nộp bài đúng hạn:</p>
          <a href="${process.env.APP_URL || "https://sp-cybersoft.com"}/build-pc" target="_blank" style="display: inline-block; background-color: #dd6b20; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Xem đề bài & Nộp bài</a>
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;" />
          <p style="font-size: 11px; color: #a0aec0;">Bạn nhận được thông báo này vì đang sử dụng gói tính năng MAX của SP-CyberSoft. Trân trọng cảm ơn!</p>
        </div>
      `;

      await sendMail({
        to: user.email,
        subject: `[Build PC] Đề bài thực hành mới hôm nay: ${customerNeed.slice(0, 40)}...`,
        html,
      }).catch((e) => {
        console.error(`Không thể gửi mail Build PC đến ${user.email}:`, e);
      });
    });

    await Promise.all(emailPromises);
  } catch (error) {
    console.error("Lỗi gửi thông báo Build PC cho gói MAX:", error);
  }
}
