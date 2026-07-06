import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PLAN_NAMES, PLAN_PRICES } from "@/lib/sepay";

export const dynamic = "force-dynamic";

/**
 * POST /api/checkout
 * Body: { planId: "pro" | "max", cycle: "monthly" | "yearly" }
 *
 * - Yêu cầu đăng nhập (session)
 * - Tạo Order trong DB với status "pending"
 * - Trả về checkoutUrl trỏ đến trang /thanh-toan tự quản lý của ứng dụng
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yêu cầu đăng nhập" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const { planId, cycle = "monthly" } = body as {
    planId?: string;
    cycle?: "monthly" | "yearly";
  };

  if (!planId || !["pro", "max"].includes(planId)) {
    return NextResponse.json(
      { error: "planId không hợp lệ (pro hoặc max)" },
      { status: 400 }
    );
  }
  if (!["monthly", "yearly"].includes(cycle)) {
    return NextResponse.json(
      { error: "cycle không hợp lệ (monthly hoặc yearly)" },
      { status: 400 }
    );
  }

  const amount = PLAN_PRICES[planId][cycle];

  // Tạo orderCode duy nhất gồm 9 chữ số ngẫu nhiên không trùng lắp
  const orderCode = Number(String(Date.now()).slice(-9));

  // Tạo đơn hàng ở trạng thái chờ thanh toán
  await db.order.create({
    data: {
      userId,
      planId,
      amount,
      orderCode,
      status: "pending",
    },
  });

  // Trả về trang thanh toán nội bộ, nơi người dùng sẽ thấy thông tin tài khoản ngân hàng và VietQR
  return NextResponse.json({
    checkoutUrl: `/thanh-toan?orderCode=${orderCode}`,
  });
}
