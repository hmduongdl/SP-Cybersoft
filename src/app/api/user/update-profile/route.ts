import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { uploadImage } from "@/lib/upload";

export const dynamic = "force-dynamic";

/**
 * POST /api/user/update-profile
 *
 * Accepts both application/json and multipart/form-data (khi có file ảnh).
 * Các field hợp lệ: email, phone, facebook_link, và file `avatar`.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";

    // ── Parse input ──────────────────────────────────────────────
    let email: string | undefined;
    let facebook_link: string | undefined;
    let avatarFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      email = (formData.get("email") as string) || undefined;
      facebook_link = (formData.get("facebook_link") as string) || undefined;
      avatarFile = formData.get("avatar") as File | null;
    } else {
      const body = await request.json();
      email = typeof body.email === "string" ? body.email.trim() : undefined;
      facebook_link =
        typeof body.facebook_link === "string"
          ? body.facebook_link.trim()
          : undefined;
    }

    // ── Validate ─────────────────────────────────────────────────
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Email không đúng định dạng." },
        { status: 400 }
      );
    }

    if (facebook_link && !facebook_link.startsWith("http")) {
      return NextResponse.json(
        { error: "Link Facebook phải bắt đầu bằng http:// hoặc https://." },
        { status: 400 }
      );
    }

    // ── Build update payload ─────────────────────────────────────
    const updateData: Record<string, any> = {};

    if (email !== undefined) updateData.email = email;
    if (facebook_link !== undefined)
      updateData.facebook_profile_url = facebook_link || null;

    // ── Upload avatar nếu có file ────────────────────────────────
    if (avatarFile && avatarFile.size > 0) {
      if (!avatarFile.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "File ảnh đại diện không đúng định dạng." },
          { status: 400 }
        );
      }

      const arrayBuffer = await avatarFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = avatarFile.name
        ? "." + avatarFile.name.split(".").pop()?.toLowerCase()
        : ".jpg";
      const filename = `avatar_${session.user.id}_${Date.now()}${ext}`;
      const uploadResult = await uploadImage(
        buffer,
        filename,
        avatarFile.type,
        "avatars"
      );
      updateData.avatar_url = uploadResult.url;
    }

    // ── Nếu không có gì để cập nhật ──────────────────────────────
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Không có dữ liệu nào được gửi lên." },
        { status: 400 }
      );
    }

    // ── Update DB ────────────────────────────────────────────────
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        avatar_url: true,
        facebook_profile_url: true,
      },
    });

    const responseUser = {
      ...updatedUser,
      facebook_link: updatedUser.facebook_profile_url,
    };

    return NextResponse.json({ success: true, user: responseUser });
  } catch (error: any) {
    // Xử lý unique constraint violation (email trùng)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Email này đã được sử dụng bởi tài khoản khác." },
        { status: 409 }
      );
    }

    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật thông tin." },
      { status: 500 }
    );
  }
}
