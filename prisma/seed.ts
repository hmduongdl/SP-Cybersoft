import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Bắt đầu khởi tạo dữ liệu mẫu...");

  // 1. Xóa dữ liệu cũ để tránh trùng lặp
  await prisma.checkin.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Tạo mật khẩu mẫu băm sẵn
  const passwordHash = await bcrypt.hash("password123", 10);

  // 3. Tạo dữ liệu người dùng
  const admin = await prisma.user.create({
    data: {
      name: "Quản trị viên HR",
      email: "admin@example.com",
      role: "ADMIN",
      passwordHash,
      department: "HR",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=250&auto=format&fit=crop",
    },
  });

  const user1 = await prisma.user.create({
    data: {
      name: "Nguyễn Văn A",
      email: "user1@example.com",
      role: "USER",
      passwordHash,
      department: "Marketing",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: "Trần Thị B",
      email: "user2@example.com",
      role: "USER",
      passwordHash,
      department: "Tech",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop",
    },
  });

  const user3 = await prisma.user.create({
    data: {
      name: "Lê Văn C",
      email: "user3@example.com",
      role: "USER",
      passwordHash,
      department: "Sales",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=250&auto=format&fit=crop",
    },
  });

  console.log("Đã tạo người dùng mẫu:", { 
    admin: admin.email, 
    user1: user1.email, 
    user2: user2.email, 
    user3: user3.email 
  });

  // 4. Tạo dữ liệu bài viết
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const post1 = await prisma.post.create({
    data: {
      title: "Tin tức nội bộ: Kỷ niệm 5 năm thành lập Kinetic HR",
      description: "Hãy chia sẻ bài viết kỷ niệm hành trình 5 năm phát triển của công ty để lan tỏa năng lượng tích cực!",
      originalUrl: "https://www.facebook.com/kinetic-hr/posts/101",
      thumbnailUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=600&auto=format&fit=crop",
      scheduledAt: twoDaysAgo,
      start_at: twoDaysAgo,
      team: "All Employees",
      is_archived: true,
    },
  });

  const post2 = await prisma.post.create({
    data: {
      title: "Thông báo tuyển dụng: Tìm kiếm đồng đội Marketing",
      description: "Kinetic HR đang tìm kiếm chuyên viên Marketing sáng tạo. Đồng nghiệp chung tay share bài viết này nhé!",
      originalUrl: "https://www.facebook.com/kinetic-hr/posts/102",
      thumbnailUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=600&auto=format&fit=crop",
      scheduledAt: oneDayAgo,
      start_at: oneDayAgo,
      team: "Marketing",
      is_archived: false,
    },
  });

  const post3 = await prisma.post.create({
    data: {
      title: "Workshop kỹ năng: Khai phóng năng lực cá nhân",
      description: "Workshop định kỳ tháng này dành riêng cho Tech team. Share bài viết giới thiệu chủ đề của tuần này nào!",
      originalUrl: "https://www.facebook.com/kinetic-hr/posts/103",
      thumbnailUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop",
      scheduledAt: now,
      start_at: now,
      team: "Tech",
      is_archived: false,
    },
  });

  console.log("Đã tạo bài viết mẫu:", { 
    post1: post1.title, 
    post2: post2.title, 
    post3: post3.title 
  });

  // 5. Tạo dữ liệu lượt check-in
  // Bài viết 1 (đã kết thúc, tự động duyệt duyệt thông qua exif)
  await prisma.checkin.create({
    data: {
      userId: user1.id,
      postId: post1.id,
      image_url: "/uploads/seed_user1_post1.jpg",
      exif_time: new Date(twoDaysAgo.getTime() + 2 * 60 * 60 * 1000), // Check-in sau 2 tiếng
      status: "AUTO_APPROVED",
      evidenceType: "AUTO_FB",
      evidenceUrl: "FACEBOOK_AUTO_CHECK",
      ai_confidence: 0.98,
    },
  });

  // Bài viết 1 (nhân viên 2 duyệt thủ công)
  await prisma.checkin.create({
    data: {
      userId: user2.id,
      postId: post1.id,
      image_url: "/uploads/seed_user2_post1.jpg",
      exif_time: new Date(twoDaysAgo.getTime() + 4 * 60 * 60 * 1000),
      status: "APPROVED",
      evidenceType: "MANUAL_SCREENSHOT",
      evidenceUrl: "/uploads/seed_user2_post1.jpg",
      ai_confidence: 0.89,
    },
  });

  // Bài viết 2 (đang chờ duyệt, có nghi vấn từ AI)
  await prisma.checkin.create({
    data: {
      userId: user1.id,
      postId: post2.id,
      image_url: "/uploads/seed_user1_post2.jpg",
      exif_time: null, // Không có thông tin EXIF
      status: "PENDING",
      evidenceType: "MANUAL_SCREENSHOT",
      evidenceUrl: "/uploads/seed_user1_post2.jpg",
      is_ai_flagged: true,
      ai_confidence: 0.35,
    },
  });

  console.log("Khởi tạo dữ liệu mẫu hoàn tất thành công!");
}

main()
  .catch((e) => {
    console.error("Lỗi khi chạy seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
