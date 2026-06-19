-- CreateTable
CREATE TABLE "SystemAnnouncement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "file_url" TEXT,
    "file_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemAnnouncement_pkey" PRIMARY KEY ("id")
);
