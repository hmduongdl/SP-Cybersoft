import { NextResponse } from "next/server";
import { cleanupExpiredBuildPcImages } from "@/lib/pc-build-cleanup";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await cleanupExpiredBuildPcImages();
  return NextResponse.json({ success: true, result });
}
