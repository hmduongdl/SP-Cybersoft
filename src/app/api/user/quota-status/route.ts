import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        daily_token_limit: true,
        tokens_used_today: true,
        last_token_reset: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Auto-detect if it's a new day (client also does this for fresh data)
    const now = new Date();
    const lastReset = new Date(user.last_token_reset);
    const isNewDay =
      now.getFullYear() !== lastReset.getFullYear() ||
      now.getMonth() !== lastReset.getMonth() ||
      now.getDate() !== lastReset.getDate();

    const tokensUsed = isNewDay ? 0 : user.tokens_used_today;
    const limit = user.daily_token_limit ?? 100000;
    const usagePercent = limit > 0 ? Math.min(100, Math.round((tokensUsed / limit) * 100)) : 0;

    return NextResponse.json({
      daily_token_limit: limit,
      tokens_used_today: tokensUsed,
      usage_percent: usagePercent,
    });
  } catch (error: any) {
    console.error("Quota status error:", error);
    return NextResponse.json(
      { error: "Không thể lấy thông tin hạn mức." },
      { status: 500 }
    );
  }
}
