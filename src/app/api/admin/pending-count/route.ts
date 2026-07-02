import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

let cachedPendingCount: number | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 10000; // 10 seconds

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();
    if (cachedPendingCount !== null && now - lastFetchTime < CACHE_TTL) {
      return NextResponse.json({ pendingCount: cachedPendingCount });
    }

    const [likeSharePending, pcPending, pcLegacyPending] = await Promise.all([
      db.checkin.count({ where: { status: "PENDING", task_type: "SHARE_POST" } }),
      db.pcSubmission.count({
        where: {
          status: "PENDING",
          parts_answer: {
            path: ["is_draft"],
            equals: false
          }
        }
      }),
      db.checkin.count({
        where: {
          status: "PENDING",
          task_type: "BUILD_PC",
          build_data: {
            path: ["is_draft"],
            equals: false
          }
        }
      })
    ]).catch(() => [0, 0, 0]);

    cachedPendingCount = likeSharePending + pcPending + pcLegacyPending;
    lastFetchTime = now;

    return NextResponse.json({ pendingCount: cachedPendingCount });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
