-- Add reviewed_at column to PcSubmission and Checkin
ALTER TABLE "PcSubmission" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3);
ALTER TABLE "Checkin" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3);

-- Backfill reviewed_at for existing reviewed records using the JSON timestamps stored in parts_answer/build_data
UPDATE "PcSubmission"
SET "reviewed_at" = COALESCE(
  (("parts_answer"->>'reviewed_locally_at')::timestamptz),
  ("submitted_at")
)
WHERE "status" IN ('APPROVED', 'REJECTED', 'AUTO_APPROVED')
  AND "reviewed_at" IS NULL;

UPDATE "Checkin"
SET "reviewed_at" = COALESCE(
  (("build_data"->>'reviewed_locally_at')::timestamptz),
  ("submitted_at")
)
WHERE "status" IN ('APPROVED', 'REJECTED', 'AUTO_APPROVED')
  AND "reviewed_at" IS NULL;
