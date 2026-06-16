/**
 * prisma/seed.ts — Khởi tạo dữ liệu mẫu cho môi trường phát triển.
 * Chạy bằng: npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Bắt đầu khởi tạo dữ liệu mẫu...");

  // ── 1. Xoá dữ liệu cũ (thứ tự đúng theo foreign key) ──────────────────────
  await prisma.checkin.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.user.deleteMany({});

  // ── 2. Hash mật khẩu mẫu bằng bcryptjs ─────────────────────────────────────
  const defaultPassword = await bcryptjs.hash("Password1", 10);
  const userPassword    = await bcryptjs.hash("12345678", 10);
  const adminPassword   = await bcryptjs.hash("Ho@ngLong274", 10);

  // ── 3. Tạo tài khoản ───────────────────────────────────────────────────────
  // Admin yêu cầu: username: HMD27425 / Ho@ngLong274
  const admin = await prisma.user.create({
    data: {
      username:      "HMD27425",
      name:          "Quản trị viên HR",
      full_name:     "Quản trị viên HR",
      email:         "admin@kinetichr.com",
      password:      adminPassword,
      role:          "ADMIN",
      department:    "HR",
      is_first_login: false,
      avatar_url:    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=250&auto=format&fit=crop",
    },
  });

  // User yêu cầu: user@kinetichr.com / 12345678
  const regularUser = await prisma.user.create({
    data: {
      username:      "user",
      name:          "Nhân viên Kỹ thuật",
      full_name:     "Nhân viên Kỹ thuật",
      email:         "user@kinetichr.com",
      password:      userPassword, // 12345678 hashed
      role:          "USER",
      department:    "TECH",
      is_first_login: false,
      avatar_url:    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop",
    },
  });

  const user1 = await prisma.user.create({
    data: {
      username:      "mkt_user",
      name:          "Nguyễn Văn A",
      full_name:     "Nguyễn Văn A",
      email:         "mkt_user@example.com",
      password:      defaultPassword,
      role:          "USER",
      department:    "Marketing",
      is_first_login: false,
      avatar_url:    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      username:      "tech_user",
      name:          "Trần Thị B",
      full_name:     "Trần Thị B",
      email:         "tech_user@example.com",
      password:      defaultPassword,
      role:          "USER",
      department:    "Tech",
      is_first_login: false,
      avatar_url:    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop",
    },
  });

  const user3 = await prisma.user.create({
    data: {
      username:      "sales_user",
      name:          "Lê Văn C",
      full_name:     "Lê Văn C",
      email:         "sales_user@example.com",
      password:      defaultPassword,
      role:          "USER",
      department:    "Sales",
      is_first_login: false,
      avatar_url:    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=250&auto=format&fit=crop",
    },
  });

  const user4 = await prisma.user.create({
    data: {
      username:      "demo_user",
      name:          "Phạm Thị D",
      full_name:     "Phạm Thị D",
      email:         "demo_user@example.com",
      password:      defaultPassword,
      role:          "USER",
      department:    "Other",
      is_first_login: true,
    },
  });

  console.log("✅ Đã tạo các tài khoản mẫu.");

  // ── 4. Tạo bài viết mẫu ────────────────────────────────────────────────────
  const now        = new Date();
  const oneDayAgo  = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2  * 24 * 60 * 60 * 1000);

  const post1 = await prisma.post.create({
    data: {
      title:       "Kỷ niệm 5 năm thành lập — Hành trình phát triển cùng nhau",
      description: "Hãy chia sẻ bài viết kỷ niệm hành trình 5 năm phát triển để lan tỏa năng lượng tích cực!",
      url:         "https://www.facebook.com/kinetic-hr/posts/101",
      thumbnail_url: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=600&auto=format&fit=crop",
      start_at:    twoDaysAgo,
      team:        "ALL",
      is_archived: true,
    },
  });

  const post2 = await prisma.post.create({
    data: {
      title:       "Tuyển dụng: Tìm kiếm đồng đội Marketing sáng tạo",
      description: "Kinetic HR đang tìm chuyên viên Marketing. Đồng nghiệp share bài này giúp công ty nhé!",
      url:         "https://www.facebook.com/kinetic-hr/posts/102",
      thumbnail_url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=600&auto=format&fit=crop",
      start_at:    oneDayAgo,
      team:        "ALL",
      is_archived: false,
    },
  });

  const post3 = await prisma.post.create({
    data: {
      title:       "Workshop tháng 6: Khai phóng năng lực cá nhân",
      description: "Workshop định kỳ dành cho Tech team. Share bài giới thiệu chủ đề tuần này nào!",
      url:         "https://www.facebook.com/kinetic-hr/posts/103",
      thumbnail_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop",
      start_at:    now,
      team:        "ALL",
      is_archived: false,
    },
  });

  console.log("✅ Đã tạo các bài viết mẫu.");

  // ── 5. Tạo dữ liệu checkin mẫu ────────────────────────────────────────────
  await prisma.checkin.create({
    data: {
      user_id:      user1.id,
      post_id:      post1.id,
      image_url:    "/uploads/seed_mkt_post1.jpg",
      exif_time:    new Date(twoDaysAgo.getTime() + 2 * 60 * 60 * 1000),
      status:       "AUTO_APPROVED",
      ai_confidence: 0.98,
      is_ai_flagged: false,
    },
  });

  await prisma.checkin.create({
    data: {
      user_id:      user2.id,
      post_id:      post1.id,
      image_url:    "/uploads/seed_tech_post1.jpg",
      exif_time:    new Date(twoDaysAgo.getTime() + 4 * 60 * 60 * 1000),
      status:       "APPROVED",
      reviewed_by:  admin.id,
      ai_confidence: 0.89,
      is_ai_flagged: false,
    },
  });

  await prisma.checkin.create({
    data: {
      user_id:      user1.id,
      post_id:      post2.id,
      image_url:    "/uploads/seed_mkt_post2.jpg",
      exif_time:    null,
      status:       "PENDING",
      is_ai_flagged: true,
      ai_confidence: 0.25,
    },
  });

  await prisma.checkin.create({
    data: {
      user_id:       user3.id,
      post_id:       post2.id,
      image_url:     "/uploads/seed_sales_post2.jpg",
      exif_time:     null,
      status:        "REJECTED",
      reviewed_by:   admin.id,
      reject_reason: "Ảnh không hiển thị bài viết đúng yêu cầu.",
      is_ai_flagged:  true,
      ai_confidence:  0.15,
    },
  });

  console.log("✅ Đã tạo checkins mẫu.");
  console.log("\n🎉 Khởi tạo dữ liệu hoàn tất!");
  console.log("\n📋 Danh sách tài khoản:");
  console.log("   Admin     : username=HMD27425 / password=Ho@ngLong274");
  console.log("   User (Tech): email=user@kinetichr.com  / password=12345678");
  console.log("   User 1    : username=mkt_user         / password=Password1");
  console.log("   User 2    : username=tech_user        / password=Password1");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi chạy seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
