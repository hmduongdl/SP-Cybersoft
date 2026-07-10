import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { cleanupExpiredBuildPcSubmissions } from "@/lib/pc-build-cleanup";
import { CACHE_TAGS } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await cleanupExpiredBuildPcSubmissions();

  if (result.submissions > 0 || result.checkins > 0) {
    try {
      revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");
    } catch {
      /* Best effort cache invalidation. */
    }
  }

  return NextResponse.json({ success: true, result });
}
