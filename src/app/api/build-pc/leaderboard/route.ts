import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const users = await db.user.findMany({
    where: {
      pc_score: { gt: 0 }
    },
    select: {
      id: true,
      name: true,
      avatar_url: true,
      pc_score: true
    },
    orderBy: {
      pc_score: "desc"
    },
    take: 50
  });

  return NextResponse.json({ leaderboard: users });
}
