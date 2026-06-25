-- Create TaskAssignee join table for many-to-many task assignee support
CREATE TABLE "TaskAssignee" (
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "TaskAssignee_pkey" PRIMARY KEY ("task_id","user_id")
);

-- Add foreign keys
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing assignee_id values into TaskAssignee
INSERT INTO "TaskAssignee" ("task_id", "user_id")
SELECT "id", "assignee_id" FROM "Task" WHERE "assignee_id" IS NOT NULL;

-- Drop the old single-assignee column and its foreign key
ALTER TABLE "Task" DROP CONSTRAINT "Task_assignee_id_fkey";
ALTER TABLE "Task" DROP COLUMN "assignee_id";
