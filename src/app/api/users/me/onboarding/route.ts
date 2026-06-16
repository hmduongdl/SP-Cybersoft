import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();

    const {
      full_name,
      gmail,
      department,
      avatar_url,
      facebook_profile_url,
      new_password,
    } = body;

    if (!full_name || !gmail || !department || !new_password) {
      return NextResponse.json(
        { error: "Thiếu các thông tin bắt buộc" },
        { status: 400 }
      );
    }

    if (new_password.length < 8 || !/\d/.test(new_password)) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 8 ký tự và bao gồm số" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(new_password, 12);

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        name: full_name,
        full_name,
        gmail,
        department,
        avatar_url: avatar_url || null,
        facebook_profile_url: facebook_profile_url || null,
        password: passwordHash,
        is_first_login: false,
      },
    });

    return NextResponse.json(
      { message: "Cập nhật thông tin thành công", user: updatedUser },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user onboarding:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật thông tin" },
      { status: 500 }
    );
  }
}
