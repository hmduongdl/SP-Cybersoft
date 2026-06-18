import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { updateUserTrustScore } from "@/lib/trust-score";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, delta } = body;

    if (!userId || typeof delta !== "number") {
      return NextResponse.json(
        { error: "Thiếu userId hoặc delta." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, trust_score: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Không tìm thấy người dùng." },
        { status: 404 }
      );
    }

    const newScore = Math.round(
      Math.max(0, Math.min(100, (user.trust_score ?? 50) + delta))
    );

    await db.user.update({
      where: { id: userId },
      data: { trust_score: newScore },
    });

    return NextResponse.json({ trust_score: newScore });
  } catch (error: any) {
    console.error("Trust Score Adjustment Error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi điều chỉnh độ tin cậy." },
      { status: 500 }
    );
  }
}
