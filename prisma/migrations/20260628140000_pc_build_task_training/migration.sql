-- AlterTable: Checkin optional post/image for BUILD_PC submissions
ALTER TABLE "Checkin" ALTER COLUMN "post_id" DROP NOT NULL;
ALTER TABLE "Checkin" ALTER COLUMN "image_url" DROP NOT NULL;

-- CreateTable: PcBuildTask
CREATE TABLE IF NOT EXISTS "PcBuildTask" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_need" TEXT NOT NULL,
    "max_budget" DOUBLE PRECISION NOT NULL,
    "requirements" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PcBuildTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PcBuildTask_date_idx" ON "PcBuildTask"("date");

-- Checkin BUILD_PC columns (if not exist from prior migration)
ALTER TABLE "Checkin" ADD COLUMN IF NOT EXISTS "task_type" TEXT NOT NULL DEFAULT 'SHARE_POST';
ALTER TABLE "Checkin" ADD COLUMN IF NOT EXISTS "build_data" JSONB;
ALTER TABLE "Checkin" ADD COLUMN IF NOT EXISTS "pc_task_id" TEXT;

CREATE INDEX IF NOT EXISTS "Checkin_task_type_idx" ON "Checkin"("task_type");
CREATE INDEX IF NOT EXISTS "Checkin_pc_task_id_idx" ON "Checkin"("pc_task_id");

DO $$ BEGIN
  ALTER TABLE "Checkin" ADD CONSTRAINT "Checkin_pc_task_id_fkey"
    FOREIGN KEY ("pc_task_id") REFERENCES "PcBuildTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
