/**
 * POST /api/upload/checkin
 * Upload ảnh minh chứng lên Vercel Blob.
 * Input: FormData với field "file" (File)
 * Output: { url: string }
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadImage } from "@/lib/upload";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập để tải ảnh lên." },
      { status: 401 }
    );
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
    return NextResponse.json(
      { error: "Thiếu file ảnh." },
      { status: 400 }
    );
  }

  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { error: "Chỉ chấp nhận JPG, PNG, WEBP." },
      { status: 422 }
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Dung lượng vượt quá 10MB." },
      { status: 422 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const filename = `${session.user.id}_${Date.now()}.${file.name.split(".").pop() || "jpg"}`;

  try {
    const result = await uploadImage(buf, filename, file.type, "checkins");
    return NextResponse.json({ url: result.url }, { status: 201 });
  } catch (err) {
    console.error("[upload/checkin] Upload failed:", err);
    return NextResponse.json(
      { error: "Không thể tải ảnh lên. Thử lại sau." },
      { status: 503 }
    );
  }
}
