import { after, NextResponse } from "next/server";
import {
  getPcBuildWorkerSecret,
  processPcBuildCompatibilityFromStored,
} from "@/lib/pc-build-background-worker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = request.headers.get("x-pc-build-worker-secret");
  if (secret !== getPcBuildWorkerSecret()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const type = body.type === "submission" ? "submission" : "checkin";

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  after(() => {
    processPcBuildCompatibilityFromStored(id, type).catch((err) => {
      console.error("[analyze-compatibility/route] Error running DeepSeek worker:", err);
    });
  });

  return NextResponse.json({
    success: true,
    status: "QUEUED",
    message: "Đã xếp hàng bước DeepSeek.",
  });
}
