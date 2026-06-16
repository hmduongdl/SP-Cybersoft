import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { uploadImage } from "@/lib/upload";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const formData = await request.formData();

    const fullName = (formData.get("full_name") as string)?.trim();
    const username = (formData.get("username") as string)?.trim();
    const email = (formData.get("email") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim() || null;
    const facebookLink = (formData.get("facebook_link") as string)?.trim() || null;
    const file = formData.get("file") as File | null;

    // Validate required fields
    if (!fullName || !username || !email) {
      return NextResponse.json(
        { error: "Họ tên, tên đăng nhập và email là bắt buộc." },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Email không hợp lệ." },
        { status: 400 }
      );
    }

    // Validate username format (alphanumeric + underscore, 3-30 chars)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: "Tên đăng nhập chỉ gồm chữ cái, số, dấu gạch dưới và từ 3-30 ký tự." },
        { status: 400 }
      );
    }

    // Upload avatar to Vercel Blob if provided
    let avatarUrl: string | null = null;
    if (file && file.size > 0) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Chỉ chấp nhận file ảnh (JPG, PNG, ...)." },
          { status: 400 }
        );
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Kích thước ảnh tối đa 5MB." },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = file.name ? "." + file.name.split(".").pop()?.toLowerCase() : ".jpg";
      const filename = `avatar_${userId}_${Date.now()}${ext}`;
      const uploadResult = await uploadImage(buffer, filename, file.type, "avatars");
      avatarUrl = uploadResult.url;
    }

    // Execute transaction
    const updatedUser = await db.$transaction(async (tx) => {
      // Check username uniqueness (excluding current user)
      const existingUsername = await tx.user.findFirst({
        where: { username, id: { not: userId } },
        select: { id: true },
      });
      if (existingUsername) {
        throw new Error("Tên đăng nhập đã được sử dụng.");
      }

      // Check email uniqueness (excluding current user)
      const existingEmail = await tx.user.findFirst({
        where: { email, id: { not: userId } },
        select: { id: true },
      });
      if (existingEmail) {
        throw new Error("Email đã được sử dụng.");
      }

      return tx.user.update({
        where: { id: userId },
        data: {
          name: fullName,
          username,
          email,
          phone,
          facebook_link: facebookLink,
          ...(avatarUrl && { avatar_url: avatarUrl }),
          is_onboarded: true,
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          phone: true,
          facebook_link: true,
          avatar_url: true,
          department: true,
          is_onboarded: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Hoàn tất đăng ký thành công.",
      user: updatedUser,
    });
  } catch (error: any) {
    // Handle known business errors from transaction
    if (
      error.message === "Tên đăng nhập đã được sử dụng." ||
      error.message === "Email đã được sử dụng."
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    // Handle Prisma unique constraint errors
    if (error?.code === "P2002") {
      const target = error?.meta?.target as string[] | undefined;
      if (target?.includes("username")) {
        return NextResponse.json(
          { error: "Tên đăng nhập đã được sử dụng." },
          { status: 409 }
        );
      }
      if (target?.includes("email")) {
        return NextResponse.json(
          { error: "Email đã được sử dụng." },
          { status: 409 }
        );
      }
    }

    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi hoàn tất đăng ký." },
      { status: 500 }
    );
  }
}
