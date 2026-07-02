import { db } from "@/lib/db";
import { deleteImage } from "@/lib/upload";

const BUILD_PC_IMAGE_TTL_MS = 48 * 60 * 60 * 1000;
const CLEANED_IMAGE_MARKER = "BUILD_PC_IMAGE_EXPIRED";

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function shouldCleanUrl(url: string) {
  return Boolean(url) && url !== "excel-parsed" && url !== CLEANED_IMAGE_MARKER;
}

async function deleteUrls(urls: string[]) {
  await Promise.all(
    urls.filter(shouldCleanUrl).map(async (url) => {
      try {
        await deleteImage(url);
      } catch {
        /* Best effort cleanup. */
      }
    })
  );
}

export async function cleanupExpiredBuildPcImages(now = new Date()) {
  const cutoff = new Date(now.getTime() - BUILD_PC_IMAGE_TTL_MS);

  const [submissions, checkins] = await Promise.all([
    db.pcSubmission.findMany({
      where: {
        submitted_at: { lt: cutoff },
        NOT: { image_urls: { equals: [CLEANED_IMAGE_MARKER] } },
      },
      select: { id: true, image_urls: true, parts_answer: true },
      take: 100,
    }),
    db.checkin.findMany({
      where: {
        task_type: "BUILD_PC",
        submitted_at: { lt: cutoff },
        NOT: { image_url: CLEANED_IMAGE_MARKER },
      },
      select: { id: true, image_url: true, build_data: true },
      take: 100,
    }),
  ]);

  for (const submission of submissions) {
    const urls = getStringArray(submission.image_urls);
    const cleanableUrls = urls.filter(shouldCleanUrl);
    if (cleanableUrls.length === 0) continue;

    await deleteUrls(cleanableUrls);
    const partsAnswer = getJsonObject(submission.parts_answer);
    await db.pcSubmission.update({
      where: { id: submission.id },
      data: {
        image_urls: [CLEANED_IMAGE_MARKER],
        parts_answer: {
          ...partsAnswer,
          evidence_cleaned_at: now.toISOString(),
          evidence_retention_hours: 48,
        },
      },
    });
  }

  for (const checkin of checkins) {
    if (!shouldCleanUrl(checkin.image_url)) continue;

    await deleteUrls([checkin.image_url]);
    const buildData = getJsonObject(checkin.build_data);
    await db.checkin.update({
      where: { id: checkin.id },
      data: {
        image_url: CLEANED_IMAGE_MARKER,
        build_data: {
          ...buildData,
          evidence_cleaned_at: now.toISOString(),
          evidence_retention_hours: 48,
        },
      },
    });
  }

  return {
    submissions: submissions.length,
    checkins: checkins.length,
  };
}

export { CLEANED_IMAGE_MARKER };
