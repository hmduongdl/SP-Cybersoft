/**
 * POST /api/upload/checkin
 * Upload ảnh minh chứng lên Vercel Blob.
 * Input: FormData với field "file" (File)
 * Output: { url: string }
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadImage } from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Kiểm tra env trước
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[upload/checkin] Missing BLOB_READ_WRITE_TOKEN env var");
    return NextResponse.json(
      { error: "Thiếu cấu hình BLOB_READ_WRITE_TOKEN trên server." },
      { status: 500 }
    );
  }

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
  } catch (e: any) {
    console.log("[upload/checkin] formData parse error:", e?.message);
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

  console.log("[upload/checkin] file:", file.name, file.type, file.size);

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

  const filename = `${session.user.id}_${Date.now()}.${file.name.split(".").pop() || "jpg"}`;

  try {
    const result = await uploadImage(file, filename, file.type, "checkins");
    console.log("[upload/checkin] success:", result.url);
    return NextResponse.json({ url: result.url }, { status: 201 });
  } catch (err: any) {
    console.error("[upload/checkin] uploadImage failed:", err?.message, err?.stack);
    return NextResponse.json(
      { error: err?.message || "Không thể tải ảnh lên. Thử lại sau." },
      { status: 503 }
    );
  }
}
