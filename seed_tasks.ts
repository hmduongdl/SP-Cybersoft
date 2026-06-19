import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log("No users found to seed tasks for.");
    return;
  }

  for (const user of users) {
    const workspaces = await prisma.workspace.findMany({
      where: { owner_id: user.id }
    });

    for (const workspace of workspaces) {
      // Check if workspace already has tasks
      const existingTasks = await prisma.task.count({
        where: { workspace_id: workspace.id }
      });

      if (existingTasks > 0) {
        console.log(`Workspace ${workspace.name} for user ${user.email} already has tasks. Skipping...`);
        continue;
      }

      console.log(`Seeding tasks for workspace ${workspace.name} (user ${user.email})...`);

      const tasksToCreate = [];

      if (workspace.name === 'Personal') {
        tasksToCreate.push(
          { title: 'Lên kế hoạch du lịch cuối năm', status: 'TODO', due_date: new Date(Date.now() + 86400000 * 5) },
          { title: 'Thanh toán hoá đơn điện nước', status: 'DONE', due_date: new Date(Date.now() - 86400000 * 2) },
          { title: 'Tập thể dục 30 phút', status: 'IN_PROGRESS', due_date: new Date() }
        );
      } else if (workspace.name === 'Website') {
        tasksToCreate.push(
          { title: 'Thiết kế lại trang chủ UI/UX', status: 'IN_PROGRESS', due_date: new Date(Date.now() + 86400000 * 2) },
          { title: 'Fix bug dropdown menu', status: 'DONE', due_date: new Date(Date.now() - 86400000 * 1) },
          { title: 'Tối ưu hoá SEO thẻ Meta', status: 'TODO', due_date: new Date(Date.now() + 86400000 * 7) }
        );
      } else if (workspace.name === 'Tech') {
        tasksToCreate.push(
          { title: 'Nâng cấp server database', status: 'TODO', due_date: new Date(Date.now() + 86400000 * 10) },
          { title: 'Cài đặt monitor CI/CD', status: 'IN_PROGRESS', due_date: new Date(Date.now() + 86400000 * 1) },
          { title: 'Kiểm tra log lỗi tuần trước', status: 'TODO', due_date: new Date(Date.now() - 86400000 * 3) } // Overdue
        );
      } else {
        // Generic tasks for any other workspace
        tasksToCreate.push(
          { title: `Công việc chung 1 của ${workspace.name}`, status: 'TODO', due_date: new Date(Date.now() + 86400000 * 3) },
          { title: `Công việc chung 2 của ${workspace.name}`, status: 'IN_PROGRESS', due_date: new Date() },
          { title: `Công việc chung 3 của ${workspace.name}`, status: 'DONE', due_date: new Date(Date.now() - 86400000 * 1) }
        );
      }

      for (const t of tasksToCreate) {
        await prisma.task.create({
          data: {
            title: t.title,
            status: t.status as any,
            due_date: t.due_date,
            workspace_id: workspace.id,
            creator_id: user.id,
          }
        });
      }
      console.log(`Seeded ${tasksToCreate.length} tasks for workspace ${workspace.name}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
