import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Vui lòng nhập mật khẩu cũ và mật khẩu mới." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có ít nhất 8 ký tự." },
        { status: 400 }
      );
    }

    // Fetch user from DB
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Tài khoản không tồn tại hoặc không thể thay đổi mật khẩu." },
        { status: 400 }
      );
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Mật khẩu hiện tại không chính xác." },
        { status: 400 }
      );
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
        is_first_login: false, // If changing password, they are no longer first login
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đổi mật khẩu thành công.",
    });
  } catch (error: any) {
    console.error("Change Password Error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi đổi mật khẩu." },
      { status: 500 }
    );
  }
}
