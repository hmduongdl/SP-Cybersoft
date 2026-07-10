import { NextResponse } from "next/server";
import {
  checkAiStudioQuota,
  quotaExceededResponse,
  recordAiStudioUse,
} from "@/lib/plan-quota";

export async function guardAiStudioQuota(userId: string) {
  const quota = await checkAiStudioQuota(userId);
  if (!quota.allowed) {
    return {
      response: NextResponse.json(quotaExceededResponse(quota), { status: 403 }),
    };
  }

  await recordAiStudioUse(userId);
  return { response: null };
}
