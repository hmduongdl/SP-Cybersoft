import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse payload
    const body = await request.json();
    const { pc_task_id, build_data } = body;

    if (!pc_task_id) {
      return NextResponse.json({ error: "Missing pc_task_id" }, { status: 400 });
    }

    if (!build_data || typeof build_data !== "object") {
      return NextResponse.json({ error: "Missing or invalid build_data" }, { status: 400 });
    }

    // 3. Create Checkin record in Prisma
    const checkin = await db.checkin.create({
      data: {
        user_id: session.user.id,
        task_type: "PC_BUILD",
        pc_task_id: pc_task_id,
        build_data: build_data,
        status: "PENDING",
        image_url: "PC_BUILD_TRAINING",
      },
    });

    // 4. Revalidate relevant cache tags
    try {
      revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");
      revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");
      revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
    } catch (cacheError) {
      console.warn("Revalidation warning:", cacheError);
    }

    // 5. Return success response
    return NextResponse.json({
      success: true,
      checkin_id: checkin.id,
      message: "Đã nộp bài build PC thành công.",
    }, { status: 200 });

  } catch (error: any) {
    console.error("Submit build PC error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
