const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const userId = '64fc617f-424b-48f8-b125-9d8d27a38327'; // From earlier
  let whereClause = { is_archived: false };
  whereClause.OR = [
    { workspace: { owner_id: userId, type: "PERSONAL" } },
    { assignee_id: userId },
    { creator_id: userId }
  ];
  try {
    const tasks = await prisma.task.findMany({ where: whereClause });
    console.log("Found:", tasks.length);
  } catch (e) {
    console.error("Error:", e);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
