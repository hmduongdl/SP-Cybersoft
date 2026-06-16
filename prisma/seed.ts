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
  const admin = await prisma.user.create({
    data: {
      username: "admin_duong",
      name: "Hoàng Minh Dương",
      email: "admin@kinetichr.com",
      password,
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

  // ── 5. Tổng kết ────────────────────────────────────────────────────────────
  console.log("\n=== Seed hoàn tất ===");
  console.log("\nDanh sách tài khoản:");
  console.log("  Admin: admin_duong / 12345678  (SALES, hope_stars=5, đã onboard)");
  console.log("  User : loc_kỹ_thuật / 12345678 (TECH, hope_stars=1, chưa onboard)\n");
}

main()
  .catch((e) => {
    console.error("Lỗi khi chạy seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
