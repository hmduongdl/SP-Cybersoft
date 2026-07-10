import { db } from "@/lib/db";
import { deleteImage } from "@/lib/upload";

const BUILD_PC_SUBMISSION_TTL_MS = 8 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 100;

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function shouldCleanUrl(url: string) {
  return Boolean(url) && url !== "excel-parsed";
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

async function cleanupExpiredBuildPcSubmissionsBatch(now = new Date()) {
  const cutoff = new Date(now.getTime() - BUILD_PC_SUBMISSION_TTL_MS);

  const [submissions, checkins] = await Promise.all([
    db.pcSubmission.findMany({
      where: { submitted_at: { lt: cutoff } },
      select: { id: true, image_urls: true },
      take: BATCH_SIZE,
    }),
    db.checkin.findMany({
      where: {
        task_type: "BUILD_PC",
        submitted_at: { lt: cutoff },
      },
      select: { id: true, image_url: true },
      take: BATCH_SIZE,
    }),
  ]);

  if (submissions.length === 0 && checkins.length === 0) {
    return { submissions: 0, checkins: 0 };
  }

  const submissionIds = submissions.map((s) => s.id);
  const checkinIds = checkins.map((c) => c.id);

  const submissionImageUrls = submissions.flatMap((s) =>
    getStringArray(s.image_urls).filter(shouldCleanUrl)
  );
  const checkinImageUrls = checkins
    .map((c) => c.image_url)
    .filter(shouldCleanUrl);

  await deleteUrls([...submissionImageUrls, ...checkinImageUrls]);

  const notificationDeletes: Promise<unknown>[] = [];
  if (submissionIds.length > 0) {
    notificationDeletes.push(
      db.notification.deleteMany({
        where: {
          reference_id: { in: submissionIds },
          reference_type: "pc_submission",
        },
      })
    );
  }
  if (checkinIds.length > 0) {
    notificationDeletes.push(
      db.notification.deleteMany({
        where: {
          reference_id: { in: checkinIds },
          reference_type: "checkin",
        },
      })
    );
  }
  await Promise.all(notificationDeletes);

  const recordDeletes: Promise<unknown>[] = [];
  if (submissionIds.length > 0) {
    recordDeletes.push(
      db.pcSubmission.deleteMany({ where: { id: { in: submissionIds } } })
    );
  }
  if (checkinIds.length > 0) {
    recordDeletes.push(
      db.checkin.deleteMany({ where: { id: { in: checkinIds } } })
    );
  }
  await Promise.all(recordDeletes);

  return {
    submissions: submissions.length,
    checkins: checkins.length,
  };
}

export async function cleanupExpiredBuildPcSubmissions(
  now = new Date(),
  maxBatches = 20
) {
  let totalSubmissions = 0;
  let totalCheckins = 0;

  for (let batch = 0; batch < maxBatches; batch += 1) {
    const result = await cleanupExpiredBuildPcSubmissionsBatch(now);
    totalSubmissions += result.submissions;
    totalCheckins += result.checkins;
    if (result.submissions === 0 && result.checkins === 0) break;
  }

  return {
    submissions: totalSubmissions,
    checkins: totalCheckins,
    retentionDays: BUILD_PC_SUBMISSION_TTL_MS / (24 * 60 * 60 * 1000),
  };
}

export { BUILD_PC_SUBMISSION_TTL_MS };
