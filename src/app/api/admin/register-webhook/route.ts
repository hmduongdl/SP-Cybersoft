import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { payos } from "@/lib/payos";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/register-webhook
 * Đăng ký webhook URL với PayOS.
 * Chỉ ADMIN mới gọi được.
 * PayOS sẽ gọi về: <APP_URL>/api/payment/webhook
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const appUrl =
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const webhookUrl = `${appUrl}/api/payment/webhook`;

  try {
    await payos.confirmWebhook(webhookUrl);
    return NextResponse.json({
      success: true,
      webhookUrl,
      message: `Đã đăng ký webhook thành công: ${webhookUrl}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Đăng ký webhook thất bại",
        detail: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/register-webhook
 * Trả về webhook URL hiện tại (không gọi PayOS, chỉ để preview).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const appUrl =
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  return NextResponse.json({
    webhookUrl: `${appUrl}/api/payment/webhook`,
    note: "Gọi POST để đăng ký URL này với PayOS",
  });
}
