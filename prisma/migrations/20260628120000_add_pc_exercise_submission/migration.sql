-- CreateTable
CREATE TABLE "PcExercise" (
    "id" TEXT NOT NULL,
    "exercise_date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" JSONB NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "team" "Team" NOT NULL DEFAULT 'ALL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PcExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PcSubmission" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "parts_answer" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "image_urls" JSONB NOT NULL DEFAULT '[]',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "CheckinStatus" NOT NULL DEFAULT 'PENDING',
    "reject_reason" TEXT,
    "reviewed_by" TEXT,
    "ai_feedback" TEXT,
    "ai_score" DOUBLE PRECISION,

    CONSTRAINT "PcSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PcExercise_exercise_date_idx" ON "PcExercise"("exercise_date");

-- CreateIndex
CREATE UNIQUE INDEX "PcExercise_exercise_date_order_index_key" ON "PcExercise"("exercise_date", "order_index");

-- CreateIndex
CREATE INDEX "PcSubmission_user_id_submitted_at_idx" ON "PcSubmission"("user_id", "submitted_at");

-- CreateIndex
CREATE INDEX "PcSubmission_status_idx" ON "PcSubmission"("status");

-- CreateIndex
CREATE INDEX "PcSubmission_exercise_id_idx" ON "PcSubmission"("exercise_id");

-- AddForeignKey
ALTER TABLE "PcSubmission" ADD CONSTRAINT "PcSubmission_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "PcExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PcSubmission" ADD CONSTRAINT "PcSubmission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PcSubmission" ADD CONSTRAINT "PcSubmission_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
