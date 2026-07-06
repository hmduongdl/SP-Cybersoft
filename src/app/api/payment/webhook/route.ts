import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SEPAY_CONFIG } from "@/lib/sepay";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const SEPAY_WHITELISTED_IPS = [
  "172.236.138.20",
  "172.233.83.68",
  "171.244.35.2",
  "151.158.108.68",
  "151.158.109.79",
  "103.255.238.139",
  "2400:8905::2000:8cff:fe98:45cd",
  "2600:3c15::2000:8aff:fedd:874b",
];

/**
 * POST /api/payment/webhook
 * Webhook handler cho SePay
 * Nhận thông báo giao dịch chuyển khoản ngân hàng và cập nhật gói.
 */
export async function POST(req: NextRequest) {
  // ── 0. Whitelist IP Check ──────────────────────────────────────────────────
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  
  const isAllowedIp = 
    process.env.NODE_ENV === "development" || 
    !clientIp || 
    SEPAY_WHITELISTED_IPS.includes(clientIp) ||
    clientIp === "127.0.0.1" ||
    clientIp === "::1";

  if (!isAllowedIp) {
    console.warn(`SePay Webhook: Từ chối request từ IP không hợp lệ: ${clientIp}`);
    return NextResponse.json({ error: "Yêu cầu từ IP này không được phép" }, { status: 403 });
  }

  // ── 1. Xác thực Chữ ký bảo mật từ SePay ────────────────────────────────────
  const signature = req.headers.get("x-sepay-signature") || "";
  const timestamp = req.headers.get("x-sepay-timestamp") || "";
  const rawBody = await req.text();

  // Kiểm tra nếu API KEY chưa cấu hình hoặc ở chế độ mặc định test
  const isDefaultKey = !SEPAY_CONFIG.API_KEY || SEPAY_CONFIG.API_KEY === "sepay_secret_token_123";

  // Khởi tạo chữ ký kiểm thử dự kiến
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', SEPAY_CONFIG.API_KEY)
    .update(timestamp + '.' + rawBody)
    .digest('hex');

  // Đối chiếu chữ ký bảo mật
  if (signature !== expectedSignature && !isDefaultKey) {
    console.warn("SePay Webhook: Chữ ký không hợp lệ, tuy nhiên sẽ trả về 200 nếu là test request của SePay.");
    
    // Nếu là test request từ SePay (thường dùng để kích hoạt hoặc kiểm tra endpoint)
    // Trả về 200 OK để SePay chấp nhận Webhook URL hoạt động
    const isTestRequest = rawBody.toLowerCase().includes("test") || !signature;
    if (isTestRequest) {
      return NextResponse.json({ success: true, message: "Xác thực test thành công" });
    }

    // Từ chối nếu là giao dịch thật nhưng sai chữ ký
    return NextResponse.json({ success: false, error: "Chữ ký webhook không hợp lệ" }, { status: 401 });
  }

  // Parse raw text body sang JSON object
  let body: any = null;
  try {
    body = JSON.parse(rawBody || "{}");
  } catch (e) {
    return NextResponse.json({ success: false, error: "JSON Payload không hợp lệ" }, { status: 200 });
  }

  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json({ success: false, error: "Yêu cầu body hợp lệ" }, { status: 200 });
  }

  // Hỗ trợ test payload trực tiếp từ SePay Dashboard (không chứa thông tin giao dịch thật)
  const content = body.content || body.transactionContent || "";
  if (body.isTest || content.toLowerCase().includes("test")) {
    return NextResponse.json({ success: true, message: "Nhận test webhook thành công" });
  }

  // ── 2. Trích xuất orderCode từ nội dung chuyển khoản ──────────────────────
  let orderCode: number | null = null;

  // Lấy các chữ số từ content (ví dụ: "SPCYBERSOFT 123456789" -> 123456789)
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

  // Nếu không tìm thấy orderCode hợp lệ, trả về 200 kèm mã lỗi thay vì 400 để ngắt hàng đợi retry của SePay
  if (!orderCode) {
    return NextResponse.json({ success: false, error: "Không tìm thấy orderCode trong nội dung" }, { status: 200 });
  }

  // ── 3. Tìm đơn hàng trong database ───────────────────────────────────────
  const order = await db.order.findUnique({
    where: { orderCode },
  });

  if (!order) {
    return NextResponse.json({ success: true, message: "Không tìm thấy đơn hàng tương ứng." });
  }

  // ── 4. Bỏ qua nếu đơn hàng đã được xử lý (tránh duplicate) ──────────────────
  if (order.status !== "pending") {
    return NextResponse.json({ success: true, message: "Đơn hàng đã được xử lý từ trước." });
  }

  // Kiểm tra số tiền nạp vào phải tối thiểu bằng số tiền đơn hàng
  const amountIn = Number(body.transferAmount || body.amountIn || 0);
  if (amountIn < order.amount) {
    return NextResponse.json({ success: false, error: "Số tiền chuyển khoản không đủ" }, { status: 200 });
  }

  // ── 5. Kích hoạt dịch vụ thành công ──────────────────────────────────────
  const now = new Date();
  
  const expiresAt = new Date(now);
  if (order.planId === "max" && order.amount === 159000) {
    // 3 + 1 tháng = 4 tháng
    expiresAt.setMonth(expiresAt.getMonth() + 4);
  } else if (order.amount >= 189000) {
    // Gói năm
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  } else {
    // Gói tháng
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
