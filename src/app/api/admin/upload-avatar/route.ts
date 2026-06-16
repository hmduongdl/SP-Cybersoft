import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { uploadImage } from "@/lib/upload";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy tệp tin ảnh." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name ? "." + file.name.split(".").pop()?.toLowerCase() : ".jpg";
    const filename = `avatar_${userId || session.user.id}_${Date.now()}${ext}`;
    const uploadResult = await uploadImage(buffer, filename, file.type, "avatars");

    return NextResponse.json({
      success: true,
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
