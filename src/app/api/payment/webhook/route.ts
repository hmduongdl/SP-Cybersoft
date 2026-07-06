import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SEPAY_CONFIG } from "@/lib/sepay";

import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/payment/webhook
 * Webhook handler cho SePay
 * Nhận thông báo giao dịch chuyển khoản ngân hàng và cập nhật gói.
 */
export async function POST(req: NextRequest) {
  // ── 1. Xác thực Chữ ký bảo mật từ SePay ────────────────────────────────────
  const signature = req.headers.get("x-sepay-signature") || "";
  const timestamp = req.headers.get("x-sepay-timestamp") || "";
  const rawBody = await req.text();

  // Khởi tạo chữ ký kiểm thử dự kiến
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', SEPAY_CONFIG.API_KEY)
    .update(timestamp + '.' + rawBody)
    .digest('hex');

  // Đối chiếu chữ ký, nếu không khớp từ chối ngay lập tức
  if (signature !== expectedSignature) {
    return NextResponse.json({ error: "Chữ ký webhook không hợp lệ" }, { status: 401 });
  }

  // Parse raw text body sang JSON object sau khi kiểm tra chữ ký thành công
  const body = JSON.parse(rawBody || "{}");
  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json({ error: "Yêu cầu body hợp lệ" }, { status: 400 });
  }

  // ── 2. Trích xuất orderCode từ nội dung chuyển khoản ──────────────────────
  let orderCode: number | null = null;

  // Lấy các chữ số từ transactionContent (ví dụ: "SPCYBERSOFT 123456789" -> 123456789)
  const content = body.transactionContent || "";
  const matches = content.match(/\d+/g);
  
  if (matches) {
    for (const m of matches) {
      const num = Number(m);
      if (num >= 100000000 && num <= 999999999) { // orderCode có 9 chữ số
        orderCode = num;
        break;
      }
    }
  }

  // Fallback sang code nếu không parse được từ nội dung
  if (!orderCode && body.code) {
    const codeMatches = body.code.match(/\d+/g);
    if (codeMatches) {
      orderCode = Number(codeMatches.join(""));
    }
  }

  if (!orderCode) {
    return NextResponse.json({ error: "Không tìm thấy orderCode trong nội dung" }, { status: 400 });
  }

  // ── 3. Tìm đơn hàng trong database ───────────────────────────────────────
  const order = await db.order.findUnique({
    where: { orderCode },
  });

  if (!order) {
    // Không tìm thấy đơn hàng trong hệ thống, trả về 200 để ngắt retry từ SePay
    return NextResponse.json({ success: true, message: "Không tìm thấy đơn hàng tương ứng." });
  }

  // ── 4. Bỏ qua nếu đơn hàng đã được xử lý (tránh duplicate) ──────────────────
  if (order.status !== "pending") {
    return NextResponse.json({ success: true, message: "Đơn hàng đã được xử lý từ trước." });
  }

  // Kiểm tra số tiền nạp vào phải tối thiểu bằng số tiền đơn hàng
  const amountIn = Number(body.amountIn || 0);
  if (amountIn < order.amount) {
    return NextResponse.json({ error: "Số tiền chuyển khoản không đủ" }, { status: 400 });
  }

  // ── 5. Kích hoạt dịch vụ thành công ──────────────────────────────────────
  const now = new Date();
  
  // Xác định thời hạn kích hoạt: trên 100k là hàng năm, dưới 100k là hàng tháng
  const isYearly = order.amount >= 100000;
  const expiresAt = new Date(now);
  if (isYearly) {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  } else {
    expiresAt.setDate(expiresAt.getDate() + 30);
  }

  const plan = order.planId; // "pro" | "max"

  // Cập nhật trạng thái đơn hàng
  await db.order.update({
    where: { orderCode },
    data: { 
      status: "paid", 
      paidAt: now 
    },
  });

  // Upsert Subscription
  await db.subscription.upsert({
    where: { userId: order.userId },
    create: {
      userId: order.userId,
      plan,
      expiresAt,
    },
    update: {
      plan,
      expiresAt,
    },
  });

  // Đồng bộ User plan trực tiếp để cập nhật menu/quyền hạn ngay lập tức
  await db.user.update({
    where: { id: order.userId },
    data: {
      plan: plan.toUpperCase() as any, // "PRO" | "MAX"
      plan_expires_at: expiresAt,
    },
  });

  return NextResponse.json({ success: true, message: "Kích hoạt gói dịch vụ thành công." });
}
