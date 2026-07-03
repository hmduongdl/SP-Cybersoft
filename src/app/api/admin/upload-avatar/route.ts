import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { uploadAvatar } from "@/lib/upload";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "Thiếu cấu hình BLOB_READ_WRITE_TOKEN trên server." },
        { status: 500 }
      );
    }

    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!userId) {
      return NextResponse.json({ error: "Thiếu ID tài khoản cần cập nhật ảnh." }, { status: 400 });
    }

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Không tìm thấy tệp tin ảnh." }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Chỉ chấp nhận JPG, PNG, WEBP." }, { status: 422 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Dung lượng vượt quá 2MB." }, { status: 422 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { avatar_url: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Tài khoản không tồn tại." }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await uploadAvatar(buffer, userId, file.type, user.avatar_url);

    await db.user.update({
      where: { id: userId },
      data: { avatar_url: uploadResult.url },
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      avatar_url: uploadResult.url,
    });
  } catch (error: any) {
    console.error("Admin Upload Avatar Error:", error);
    return NextResponse.json(
      { error: error.message || "Đã xảy ra lỗi khi tải ảnh lên." },
      { status: 500 }
    );
  }
}
