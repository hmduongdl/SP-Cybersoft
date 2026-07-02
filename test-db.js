const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tasks = await prisma.pcBuildTask.findMany({
        orderBy: { date: 'desc' },
        take: 5
    });
    console.log(tasks.map(t => ({ id: t.id, date: t.date, created_at: t.created_at })));
}
main();
