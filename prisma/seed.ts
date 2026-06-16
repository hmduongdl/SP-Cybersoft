/**
 * prisma/seed.ts — Khởi tạo dữ liệu mẫu cho môi trường phát triển.
 * Chạy bằng: npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Bắt đầu dọn dẹp và khởi tạo dữ liệu gốc...");

  // ── 1. Xoá toàn bộ dữ liệu cũ (thứ tự đúng theo foreign key) ──────────────────────
  await prisma.checkin.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.user.deleteMany({});

  // ── 2. Hash mật khẩu admin bằng bcryptjs ─────────────────────────────────────
  const adminPassword = await bcryptjs.hash("Ho@ngLong274", 10);

  // ── 3. Tạo duy nhất tài khoản Admin ──────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      username:      "HMD27425",
      name:          "Quản trị viên",
      full_name:     "Quản trị viên Hệ Thống",
      email:         "admin@kinetichr.com",
      password:      adminPassword,
      role:          "ADMIN",
      department:    "HR",
      is_first_login: false,
      avatar_url:    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=250&auto=format&fit=crop",
    },
  });

  console.log("✅ Đã làm sạch toàn bộ dữ liệu mẫu.");
  console.log("✅ Đã tạo tài khoản Admin gốc.");

  console.log("\n🎉 Khởi tạo dữ liệu hoàn tất!");
  console.log("\n📋 Danh sách tài khoản:");
  console.log("   Admin     : username=HMD27425 / password=Ho@ngLong274");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi chạy seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
