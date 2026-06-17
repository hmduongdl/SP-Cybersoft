import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminId = "dac0df9f-53a1-49e4-b4bd-77c512d319b8";
  
  const checkinsCreated = await prisma.checkin.count({
    where: { user_id: adminId }
  });
  
  const checkinsReviewed = await prisma.checkin.count({
    where: { reviewed_by: adminId }
  });
  
  console.log(`Checkins created by admin: ${checkinsCreated}`);
  console.log(`Checkins reviewed by admin: ${checkinsReviewed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
