import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PC_SCORE_START_AT = new Date("2026-07-01T17:00:00Z");
const PC_REJECT_SCORE_MULTIPLIER = 1.358;
const MARKER_KEY = "pc_reject_penalty_applied_at";
const DRY_RUN = process.argv.includes("--dry-run");

function getJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getPositiveScore(score: unknown): number | null {
  const value = Number(score);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getPenalty(score: unknown): number | null {
  const value = getPositiveScore(score);
  return value ? Math.round(value * PC_REJECT_SCORE_MULTIPLIER) : null;
}

async function main() {
  const [submissions, checkins] = await Promise.all([
    prisma.pcSubmission.findMany({
      where: {
        status: "REJECTED",
        submitted_at: { gte: PC_SCORE_START_AT },
      },
      select: {
        id: true,
        user_id: true,
        submitted_at: true,
        ai_score: true,
        parts_answer: true,
        user: { select: { name: true, email: true, pc_score: true } },
      },
    }),
    prisma.checkin.findMany({
      where: {
        task_type: "BUILD_PC",
        status: "REJECTED",
        submitted_at: { gte: PC_SCORE_START_AT },
      },
      select: {
        id: true,
        user_id: true,
        submitted_at: true,
        build_data: true,
        user: { select: { name: true, email: true, pc_score: true } },
      },
    }),
  ]);

  const submissionCandidates = submissions
    .map((submission) => {
      const partsAnswer = getJsonObject(submission.parts_answer);
      const score = getPositiveScore(submission.ai_score) ?? getPositiveScore(partsAnswer.temp_ai_score);
      const penalty = getPenalty(score);
      return { submission, partsAnswer, score, penalty };
    })
    .filter((item) => item.penalty && !item.partsAnswer[MARKER_KEY]);

  const checkinCandidates = checkins
    .map((checkin) => {
      const buildData = getJsonObject(checkin.build_data);
      const score = getPositiveScore(buildData.temp_ai_score);
      const penalty = getPenalty(score);
      return { checkin, buildData, score, penalty };
    })
    .filter((item) => item.penalty && !item.buildData[MARKER_KEY]);

  const totalPenalty =
    submissionCandidates.reduce((sum, item) => sum + (item.penalty || 0), 0) +
    checkinCandidates.reduce((sum, item) => sum + (item.penalty || 0), 0);

  console.log(JSON.stringify({
    mode: DRY_RUN ? "dry-run" : "apply",
    since: PC_SCORE_START_AT.toISOString(),
    submissions: submissionCandidates.length,
    checkins: checkinCandidates.length,
    totalPenalty,
    affectedUsers: new Set([
      ...submissionCandidates.map((item) => item.submission.user_id),
      ...checkinCandidates.map((item) => item.checkin.user_id),
    ]).size,
  }, null, 2));

  const preview = [
    ...submissionCandidates.map((item) => ({
      type: "pc_submission",
      id: item.submission.id,
      user: item.submission.user.name || item.submission.user.email,
      score: item.score,
      penalty: item.penalty,
      submitted_at: item.submission.submitted_at.toISOString(),
    })),
    ...checkinCandidates.map((item) => ({
      type: "checkin",
      id: item.checkin.id,
      user: item.checkin.user.name || item.checkin.user.email,
      score: item.score,
      penalty: item.penalty,
      submitted_at: item.checkin.submitted_at.toISOString(),
    })),
  ].slice(0, 20);

  console.log(JSON.stringify({ preview }, null, 2));

  if (DRY_RUN) return;

  const appliedAt = new Date().toISOString();

  for (const item of submissionCandidates) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: item.submission.user_id },
        data: { pc_score: { decrement: item.penalty || 0 } },
      }),
      prisma.pcSubmission.update({
        where: { id: item.submission.id },
        data: {
          parts_answer: {
            ...item.partsAnswer,
            [MARKER_KEY]: appliedAt,
            pc_reject_penalty_score: item.score,
            pc_reject_penalty_amount: item.penalty,
            pc_reject_penalty_multiplier: PC_REJECT_SCORE_MULTIPLIER,
          } as Prisma.InputJsonValue,
        },
      }),
    ]);
  }

  for (const item of checkinCandidates) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: item.checkin.user_id },
        data: { pc_score: { decrement: item.penalty || 0 } },
      }),
      prisma.checkin.update({
        where: { id: item.checkin.id },
        data: {
          build_data: {
            ...item.buildData,
            [MARKER_KEY]: appliedAt,
            pc_reject_penalty_score: item.score,
            pc_reject_penalty_amount: item.penalty,
            pc_reject_penalty_multiplier: PC_REJECT_SCORE_MULTIPLIER,
          } as Prisma.InputJsonValue,
        },
      }),
    ]);
  }

  console.log(JSON.stringify({
    applied: true,
    submissions: submissionCandidates.length,
    checkins: checkinCandidates.length,
    totalPenalty,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
