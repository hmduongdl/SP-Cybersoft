import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import exifr from "exifr";
import { uploadImage } from "@/lib/upload";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

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

    // 6. Save image to Vercel Blob using our adapter
    const uploadResult = await uploadImage(buffer, imageFile.name || "checkin.jpg", imageFile.type, "checkins");
    const imageUrl = uploadResult.url;

    // 7. Save Checkin record to database (create only — duplicate check already done in new route)
    const checkin = await db.checkin.create({
      data: {
        user_id: session.user.id,
        post_id: postId,
        status,
        image_url: imageUrl,
        exif_time: exifTime,
        ai_confidence: aiConfidence,
        is_ai_flagged: status === "PENDING" && !exifFound,
      },
    });

    // Revalidate cache after a new check-in submission
    revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
    revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");
    revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");

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
