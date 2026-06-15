-- CreateEnum
CREATE TYPE "CheckinStatus" AS ENUM ('AUTO_APPROVED', 'PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_userId_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_postId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "department" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "start_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "team" TEXT;

-- DropTable
DROP TABLE "Submission";

-- DropEnum
DROP TYPE "SubmissionStatus";

-- CreateTable
CREATE TABLE "Checkin" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "exif_time" TIMESTAMP(3),
    "status" "CheckinStatus" NOT NULL DEFAULT 'PENDING',
    "reject_reason" TEXT,
    "is_ai_flagged" BOOLEAN NOT NULL DEFAULT false,
    "ai_confidence" DOUBLE PRECISION,
    "evidenceType" "EvidenceType" NOT NULL,
    "evidenceUrl" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "Checkin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Checkin_user_id_idx" ON "Checkin"("user_id");

-- CreateIndex
CREATE INDEX "Checkin_post_id_idx" ON "Checkin"("post_id");

-- CreateIndex
CREATE INDEX "Checkin_submittedAt_idx" ON "Checkin"("submittedAt");

-- CreateIndex
CREATE INDEX "Checkin_status_idx" ON "Checkin"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Checkin_user_id_post_id_key" ON "Checkin"("user_id", "post_id");

-- AddForeignKey
ALTER TABLE "Checkin" ADD CONSTRAINT "Checkin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkin" ADD CONSTRAINT "Checkin_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
