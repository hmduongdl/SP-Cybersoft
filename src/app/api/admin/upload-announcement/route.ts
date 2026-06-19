import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadImage } from "@/lib/upload";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name ? "." + file.name.split(".").pop()?.toLowerCase() : "";
    const mimeType = file.type || "application/octet-stream";

    const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(ext);
    const folder = isImage ? "announcements/images" : "announcements/documents";

    const result = await uploadImage(buffer, file.name, mimeType, folder);

    return NextResponse.json({
      success: true,
      url: result.url,
      fileName: file.name,
      isImage,
    });
  } catch (error: any) {
    console.error("Upload Announcement Error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
