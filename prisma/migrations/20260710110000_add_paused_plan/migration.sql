-- AlterTable
ALTER TABLE "User" ADD COLUMN "paused_plan" "UserPlan",
ADD COLUMN "paused_plan_expires_at" TIMESTAMP(3);
