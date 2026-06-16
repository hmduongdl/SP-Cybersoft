import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

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
      username,
      email,
      phone,
      facebook_link,
      avatar_url,
    } = body;

    if (!full_name || !username || !email) {
      return NextResponse.json(
        { error: "Thiếu các thông tin bắt buộc (Họ tên, Username, Email)" },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        name: full_name,
        username,
        email,
        phone: phone || null,
        facebook_link: facebook_link || null,
        avatar_url: avatar_url || null,
        is_onboarded: true,
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
