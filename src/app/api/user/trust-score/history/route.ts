import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs = await db.trustScoreLog.findMany({
    where: { user_id: session.user.id },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { trust_score: true },
  });

  return NextResponse.json({
    logs,
    currentScore: currentUser?.trust_score ?? 80,
  });
}
