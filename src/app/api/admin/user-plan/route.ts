import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/user-plan
 * Body: { userId: string, plan: "FREE" | "PRO" | "MAX", expiresAt?: string | null }
 * Chỉ ADMIN mới gọi được.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Chỉ admin mới có quyền
  const admin = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, plan, expiresAt } = body;

  if (!userId || !plan) {
    return NextResponse.json({ error: "userId và plan là bắt buộc" }, { status: 400 });
  }

  if (!["FREE", "PRO", "MAX"].includes(plan)) {
    return NextResponse.json({ error: "plan không hợp lệ" }, { status: 400 });
  }

  const updatedUser = await db.user.update({
    where: { id: userId },
    data: {
      plan,
      plan_expires_at: expiresAt ? new Date(expiresAt) : null,
    },
    select: { id: true, name: true, plan: true, plan_expires_at: true },
  });

  return NextResponse.json({ success: true, user: updatedUser });
}
