import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SEPAY_CONFIG } from "@/lib/sepay";

export const dynamic = "force-dynamic";

/**
 * GET /api/checkout/details
 * Query: ?orderCode=...
 *
 * Trả về chi tiết đơn hàng cùng cấu hình chuyển khoản ngân hàng (SePay)
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
    select: {
      id: true,
      planId: true,
      amount: true,
      status: true,
      createdAt: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
  }

  // Nội dung chuyển khoản duy nhất phục vụ SePay nhận diện
  const transferContent = `SPCYBERSOFT ${orderCode}`;

  return NextResponse.json({
    order,
    bankInfo: {
      bankId: SEPAY_CONFIG.BANK_ID,
      accountNo: SEPAY_CONFIG.ACCOUNT_NO,
      accountName: SEPAY_CONFIG.ACCOUNT_NAME,
      amount: order.amount,
      transferContent,
      qrUrl: `https://img.vietqr.io/image/${SEPAY_CONFIG.BANK_ID}-${SEPAY_CONFIG.ACCOUNT_NO}-compact.png?amount=${order.amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(SEPAY_CONFIG.ACCOUNT_NAME)}`,
    },
  });
}
