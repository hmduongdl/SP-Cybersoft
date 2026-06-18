import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminUsername = "HMD27425";
  const newPasswordRaw = "Ho@ngLong27425";
  const newPasswordHash = await bcryptjs.hash(newPasswordRaw, 10);

  // Find the old admin
  const oldAdmin = await prisma.user.findUnique({
    where: { username: adminUsername }
  });

  if (!oldAdmin) {
    console.log(`No admin found with username ${adminUsername}`);
    return;
  }

  console.log("Found old admin:", oldAdmin);

  // Delete the old admin
  await prisma.user.delete({
    where: { username: adminUsername }
  });
  console.log("Deleted old admin.");

  // Recreate the admin with same fields, new password
  const newAdmin = await prisma.user.create({
    data: {
      username: oldAdmin.username,
      is_verified: oldAdmin.is_verified,
      name: oldAdmin.name,
      full_name: oldAdmin.full_name,
      email: oldAdmin.email,
      facebook_profile_url: oldAdmin.facebook_profile_url,
      password: newPasswordHash,
      role: oldAdmin.role,
      department: oldAdmin.department,
      avatar_url: oldAdmin.avatar_url,
      facebook_verified: oldAdmin.facebook_verified,
      is_active: oldAdmin.is_active,
      daily_token_limit: oldAdmin.daily_token_limit,
      last_token_reset: oldAdmin.last_token_reset,
      tokens_used_today: oldAdmin.tokens_used_today,
      hope_stars: oldAdmin.hope_stars,
      used_stars_this_month: oldAdmin.used_stars_this_month,
      last_star_reset_at: oldAdmin.last_star_reset_at,
    }
  });

  console.log("Successfully recreated admin:", newAdmin);
}

main()
  .catch((e) => {
    console.error("Error recreating admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
