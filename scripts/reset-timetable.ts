/**
 * Script: reset-timetable.ts
 * Xóa toàn bộ dữ liệu timetable của tất cả người dùng và reset cờ onboarding.
 * 
 * Chạy: npx ts-node --project tsconfig.json -e "require('./scripts/reset-timetable.ts')"
 * Hoặc:  npx tsx scripts/reset-timetable.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Bắt đầu reset timetable cho tất cả người dùng...\n");

  // 1. Xóa tất cả TimetableRow (TimetableCell sẽ cascade)
  const deletedRows = await prisma.timetableRow.deleteMany({});
  console.log(`✅ Đã xóa ${deletedRows.count} hàng TimetableRow (cells cascade)`);

  // 2. Reset is_onboarded = false cho tất cả UserTimetableConfig
  const resetConfigs = await prisma.userTimetableConfig.updateMany({
    data: { is_onboarded: false },
  });
  console.log(`✅ Đã reset ${resetConfigs.count} UserTimetableConfig (is_onboarded → false)`);

  console.log("\n🎉 Hoàn tất! Tất cả người dùng sẽ thấy onboarding timetable khi truy cập lại.");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
