/**
 * API Route: POST /api/send-notification
 * Nhận to, subject, message và gửi email thông báo qua Gmail
 */
import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";
import { buildNotificationEmail } from "@/lib/email-template";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, message } = body;

    // Validate các field bắt buộc
    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc: to, subject, message" },
        { status: 400 }
      );
    }

    // Validate định dạng email cơ bản
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "Địa chỉ email không hợp lệ" },
        { status: 400 }
      );
    }

    // Tạo HTML template và gửi
    const html = buildNotificationEmail(subject, message);
    await sendMail({ to, subject, html });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[send-notification] API error:", error);
    return NextResponse.json(
      { error: "Không thể gửi email. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

// Chỉ chấp nhận method POST
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}
