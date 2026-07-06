const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Đang bắt đầu hạ cấp toàn bộ user thường (role: USER) xuống gói FREE...");
  
  const result = await prisma.user.updateMany({
    where: {
      role: "USER",
    },
    data: {
      plan: "FREE",
      plan_expires_at: null,
    },
  });

  console.log(`Hoàn thành! Đã hạ cấp thành công ${result.count} người dùng xuống gói FREE.`);
}

main()
  .catch((err) => {
    console.error("Lỗi khi chạy script:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
