const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tasks = await prisma.task.findMany({
    include: { workspace: true }
  });
  console.log(tasks.map(t => ({
    id: t.id,
    title: t.title,
    wsName: t.workspace.name,
    wsType: t.workspace.type,
    wsOwner: t.workspace.owner_id,
    assignee: t.assignee_id,
    creator: t.creator_id
  })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
