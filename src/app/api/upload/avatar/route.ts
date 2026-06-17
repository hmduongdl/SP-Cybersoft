import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadImage } from "@/lib/upload";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Thiếu cấu hình BLOB_READ_WRITE_TOKEN trên server." },
      { status: 500 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Dữ liệu không phải multipart/form-data." },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ error: "Thiếu file ảnh." }, { status: 400 });
  }

  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Chỉ chấp nhận JPG, PNG, WEBP." }, { status: 422 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Dung lượng vượt quá 2MB." }, { status: 422 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const filename = `avatar_${session.user.id}_${Date.now()}.${file.name.split(".").pop() || "jpg"}`;

  try {
    const result = await uploadImage(buf, filename, file.type, "avatars");

    await db.user.update({
      where: { id: session.user.id },
      data: { avatar_url: result.url },
    });

    return NextResponse.json({ url: result.url }, { status: 201 });
  } catch (err: any) {
    console.error("[upload/avatar] failed:", err?.message);
    return NextResponse.json(
      { error: err?.message || "Không thể tải ảnh lên." },
      { status: 503 }
    );
  }
}
