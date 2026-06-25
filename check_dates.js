const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tasks = await prisma.task.findMany({ select: { title: true, due_date: true, createdAt: true } });
  console.log(tasks);
}
main().catch(console.error).finally(() => prisma.$disconnect());
