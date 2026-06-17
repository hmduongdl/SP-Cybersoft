import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Bắt đầu seed dữ liệu mẫu ===\n");

  // ── 1. Xoá dữ liệu cũ ──────────────────────────────────────────────────────
  await prisma.checkin.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("✓ Đã xoá dữ liệu cũ trong bảng Checkin, Post, User");

  // ── 2. Hash mật khẩu ───────────────────────────────────────────────────────
  const password = await bcryptjs.hash("12345678", 10);

  // ── 3. Tạo tài khoản Admin ──────────────────────────────────────────────────
  const adminPassword = await bcryptjs.hash("Ho@ngLong27425", 10);
  const admin = await prisma.user.create({
    data: {
      username: "HMD27425",
      name: "Hoàng Minh Dương",
      email: "admin@kinetichr.com",
      password: adminPassword,
      role: "ADMIN",
      department: "SALES",
      is_first_login: false,
    },
  });
  console.log(`✓ Đã tạo Admin: ${admin.name} (${admin.email})`);

  // ── 4. Tạo tài khoản User ───────────────────────────────────────────────────
  const user = await prisma.user.create({
    data: {
      username: "loc_kỹ_thuật",
      name: "Nguyễn Phước Lộc",
      email: "sp.phuocloc@gmail.com",
      password,
      role: "USER",
      department: "TECH",
      is_first_login: true,
    },
  });
  console.log(`✓ Đã tạo User: ${user.name} (${user.email})`);

  // ── 5. Tạo bài viết mẫu ─────────────────────────────────────────────────────
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const posts = await Promise.all([
    // Post 1: Đang hoạt động - hôm nay
    prisma.post.create({
      data: {
        title: "Chia sẻ bài viết tuyển dụng tháng 6 - Vị trí Senior Developer",
        url: "https://www.facebook.com/photo/?fbid=123456789",
        thumbnail_url: null,
        description: "Like và share bài viết tuyển dụng trên trang Facebook công ty, kèm hashtag #Kinetichr #TuyenDung",
        start_at: today,
        team: "ALL",
        is_archived: false,
        allow_late_submit: false,
      },
    }),
    // Post 2: Cho phép nộp bù - đã quá 24h nhưng vẫn nộp được
    prisma.post.create({
      data: {
        title: "Giới thiệu sản phẩm mới Q2 - Team Sales ưu tiên",
        url: "https://www.facebook.com/photo/?fbid=987654321",
        thumbnail_url: null,
        description: "Chia sẻ bài giới thiệu sản phẩm mới lên trang cá nhân ở chế độ công khai",
        start_at: yesterday,
        team: "SALES",
        is_archived: false,
        allow_late_submit: true,
      },
    }),
    // Post 3: Đã khóa - Admin đã archive
    prisma.post.create({
      data: {
        title: "Sự kiện team building tháng 5 (Đã kết thúc)",
        url: "https://www.facebook.com/photo/?fbid=111111111",
        thumbnail_url: null,
        description: "Bài viết đã hết hạn và được admin khóa lại",
        start_at: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        team: "ALL",
        is_archived: true,
        allow_late_submit: false,
      },
    }),
    // Post 4: Sắp tới - ngày mai
    prisma.post.create({
      data: {
        title: "Workshop nội bộ: Clean Code & Best Practices",
        url: "https://www.facebook.com/events/222222222",
        thumbnail_url: null,
        description: "Đăng ký và chia sẻ sự kiện workshop nội bộ tháng này",
        start_at: tomorrow,
        team: "TECH",
        is_archived: false,
        allow_late_submit: false,
      },
    }),
  ]);

  console.log(`✓ Đã tạo ${posts.length} bài viết mẫu:`);
  posts.forEach((p) => {
    console.log(`  - ${p.is_archived ? "[KHÓA]" : "[ACTIVE]"} ${p.title.substring(0, 50)}... (${p.allow_late_submit ? "nộp bù" : "thường"})`);
  });

  // ── 6. Tổng kết ────────────────────────────────────────────────────────────
  console.log("\n=== Seed hoàn tất ===");
  console.log("\nDanh sách tài khoản:");
  console.log("  Admin: HMD27425 / Ho@ngLong27425  (SALES, đã onboard)");
  console.log("  User : loc_kỹ_thuật / 12345678 (TECH, chưa onboard)\n");
}

main()
  .catch((e) => {
    console.error("Lỗi khi chạy seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
