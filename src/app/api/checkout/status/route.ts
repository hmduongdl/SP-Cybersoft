import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/checkout/status
 * Query: ?orderCode=...
 *
 * Kiểm tra trạng thái đơn hàng (được polling từ client trang /thanh-toan)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderCodeStr = searchParams.get("orderCode");

  if (!orderCodeStr) {
    return NextResponse.json({ error: "Thiếu orderCode" }, { status: 400 });
  }

  const orderCode = Number(orderCodeStr);
  if (isNaN(orderCode)) {
    return NextResponse.json({ error: "orderCode không hợp lệ" }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { orderCode },
    select: { status: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
  }

  return NextResponse.json({ status: order.status });
}
