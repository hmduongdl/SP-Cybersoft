import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";
import exifr from "exifr";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const postId = formData.get("postId") as string;
    const imageFile = formData.get("image") as File;

    if (!postId || !imageFile) {
      return NextResponse.json(
        { error: "Thiếu thông tin postId hoặc ảnh bằng chứng." },
        { status: 400 }
      );
    }

    // Validate image file size and type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: "Định dạng ảnh không hợp lệ. Chỉ chấp nhận .jpg, .jpeg, .png." },
        { status: 400 }
      );
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (imageFile.size > maxSizeBytes) {
      return NextResponse.json(
        { error: "Dung lượng ảnh vượt quá giới hạn 5MB." },
        { status: 400 }
      );
    }

    // 3. Find target post
    const post = await db.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Không tìm thấy bài viết tương ứng." },
        { status: 404 }
      );
    }

    // 4. Read file buffer and parse EXIF
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let exifTime: Date | null = null;
    let exifFound = false;

    try {
      // Parse DateTimeOriginal and CreateDate from EXIF
      const metadata = await exifr.parse(buffer, ["DateTimeOriginal", "CreateDate", "OffsetTimeOriginal"]);
      
      if (metadata) {
        const parsedDate = metadata.DateTimeOriginal || metadata.CreateDate;
        if (parsedDate instanceof Date) {
          exifTime = parsedDate;
          exifFound = true;
        } else if (parsedDate) {
          // In case it's a string, try parsing it
          const d = new Date(parsedDate);
          if (!isNaN(d.getTime())) {
            exifTime = d;
            exifFound = true;
          }
        }
      }
    } catch (exifError) {
      console.warn("Failed to parse EXIF metadata:", exifError);
    }

    // 5. Determine Checkin Status
    let status: "AUTO_APPROVED" | "PENDING" = "PENDING";
    let aiConfidence = 0.5;

    if (exifFound && exifTime) {
      const postStartTime = new Date(post.start_at).getTime();
      const exifTimeMs = exifTime.getTime();
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      const postEndTime = postStartTime + twentyFourHoursMs;

      // EXIF time must be within 24 hours of post.start_at
      const isWithin24Hours = exifTimeMs >= postStartTime && exifTimeMs <= postEndTime;

      if (isWithin24Hours) {
        status = "AUTO_APPROVED";
        aiConfidence = 0.98; // High confidence since EXIF is fully valid
      } else {
        status = "PENDING"; // Time expired, needs manual review
        aiConfidence = 0.6;
      }
    } else {
      status = "PENDING"; // No EXIF found, needs manual review
      aiConfidence = 0.3;
    }

    // 6. Save image to local public/uploads directory
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExtension = path.extname(imageFile.name) || ".jpg";
    const fileName = `${session.user.id}_${postId}_${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);
    const imageUrl = `/uploads/${fileName}`;

    // 7. Save Checkin record to database
    const checkin = await db.checkin.upsert({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId: postId,
        },
      },
      update: {
        status,
        image_url: imageUrl,
        exif_time: exifTime,
        ai_confidence: aiConfidence,
        evidenceType: "MANUAL_SCREENSHOT",
        evidenceUrl: imageUrl,
      },
      create: {
        userId: session.user.id,
        postId: postId,
        status,
        image_url: imageUrl,
        exif_time: exifTime,
        ai_confidence: aiConfidence,
        evidenceType: "MANUAL_SCREENSHOT",
        evidenceUrl: imageUrl,
      },
    });

    // 8. Return response
    return NextResponse.json({
      success: true,
      status,
      exifFound,
      message: status === "AUTO_APPROVED"
        ? "Đã tự động xác thực và duyệt thành công nhờ dữ liệu EXIF hợp lệ."
        : exifFound
        ? "Ảnh có dữ liệu EXIF nhưng thời gian chụp nằm ngoài mốc 24h. Đã chuyển sang hàng đợi duyệt thủ công."
        : "Không tìm thấy dữ liệu EXIF. Đã chuyển sang hàng đợi duyệt thủ công.",
      checkin,
    });

  } catch (error: any) {
    console.error("Check-in Submit Error:", error);
    return NextResponse.json(
      { error: error.message || "Đã xảy ra lỗi hệ thống khi nộp bài." },
      { status: 500 }
    );
  }
}
