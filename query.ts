import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ws = await prisma.workspace.findMany({
    where: { is_default: true },
    include: {
      _count: { select: { tasks: true } },
      tasks: { select: { title: true, status: true, is_archived: true } }
    }
  });
  console.log(JSON.stringify(ws, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
