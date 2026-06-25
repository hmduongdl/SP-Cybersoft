/**
 * POST /api/checkins
 *
 * Hỗ trợ hai luồng input:
 *   (A) JSON  — { post_id, image_url }   → ảnh đã upload qua Uploadthing CDN
 *   (B) FormData — post_id + image_file    → ảnh upload trực tiếp (cũ)
 *
 * Pipeline đa tín hiệu:
 *  1. Xác thực phiên đăng nhập
 *  2. Parse input (JSON hoặc FormData)
 *  3. Kiểm tra Post tồn tại và cửa sổ 24h
 *  4. Chống spam (duplicate check)
 *  5. Fetch ảnh từ CDN / upload FormData
 *  6. Perceptual hash — phát hiện ảnh tái sử dụng / trùng lặp (Hướng 3)
 *  7. Phân tích EXIF server-side (exifr)
 *  8. Nếu EXIF không đủ, chạy AI Vision Check tự động (Hướng 1+4)
 *  9. Composite scoring — quyết định AUTO_APPROVED | PENDING (Hướng 2)
 * 10. Tạo bản ghi Checkin, cập nhật Trust Score
 * 11. Trả về JSON { success, status, exif_time, message }
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { uploadImage, deleteImage } from "@/lib/upload";
import exifr from "exifr";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import { updateUserTrustScore } from "@/lib/trust-score";
import { runVisionCheck } from "@/lib/ai-vision-check";
import { computeAHash, hammingDistance, PHASH_DUPLICATE_THRESHOLD } from "@/lib/image-hash";

// Cho phép body size lớn hơn mặc định 4 MB của Next.js
export const dynamic = "force-dynamic";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 giờ tính bằng milliseconds

// ─── Helper: parse EXIF từ Buffer ─────────────────────────────────────────────

interface ExifResult {
  /** Thời gian gốc trích xuất từ EXIF. null nếu không tìm thấy hoặc lỗi parse. */
  exifTime: Date | null;
  /** true nếu tìm thấy timestamp hợp lệ trong EXIF */
  exifFound: boolean;
  /** Tên tag tìm thấy, dùng để debug */
  sourceTag: string | null;
}

async function parseExifFromBuffer(buffer: Buffer): Promise<ExifResult> {
  // Mặc định trả về "không tìm thấy" — lỗi sẽ bị bắt ở catch-block
  const empty: ExifResult = { exifTime: null, exifFound: false, sourceTag: null };

  try {
    // Chỉ trích xuất các tag liên quan đến timestamp để nhanh hơn
    const meta = await exifr.parse(buffer, {
      pick: ["DateTimeOriginal", "CreateDate", "DateTimeDigitized", "DateTime"],
      // Tắt tất cả các segment không cần thiết để tránh lỗi với ảnh chụp màn hình
      tiff: true,
      xmp: false,
      icc: false,
      iptc: false,
      jfif: false,
      ihdr: false,
    });

    if (!meta) return empty;

    // Ưu tiên: DateTimeOriginal > CreateDate > DateTimeDigitized > DateTime
    const candidates: Array<{ tag: string; value: unknown }> = [
      { tag: "DateTimeOriginal", value: meta.DateTimeOriginal },
      { tag: "CreateDate", value: meta.CreateDate },
      { tag: "DateTimeDigitized", value: meta.DateTimeDigitized },
      { tag: "DateTime", value: meta.DateTime },
    ];

    for (const { tag, value } of candidates) {
      if (!value) continue;

      // exifr thường trả về Date object trực tiếp
      if (value instanceof Date && !isNaN(value.getTime())) {
        return { exifTime: value, exifFound: true, sourceTag: tag };
      }

      // Fallback: thử parse string (format EXIF cũ "YYYY:MM:DD HH:MM:SS")
      if (typeof value === "string") {
        // Chuẩn hoá format EXIF "2024:06:15 14:30:00" → "2024-06-15T14:30:00"
        const normalised = value
          .trim()
          .replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")
          .replace(" ", "T");
        const parsed = new Date(normalised);
        if (!isNaN(parsed.getTime())) {
          return { exifTime: parsed, exifFound: true, sourceTag: tag };
        }
      }
    }

    return empty;
  } catch (err) {
    // Ảnh chụp màn hình / file không có EXIF sẽ ném lỗi parse — đây là
    // trường hợp bình thường, không phải lỗi hệ thống. Log ở warn level.
    console.warn("[checkins] EXIF parse skipped (no metadata or unsupported format):", err instanceof Error ? err.message : err);
    return empty;
  }
}

// ─── Composite scoring — quyết định trạng thái ───────────────────────────────

type ApprovalReason =
  | "exif_valid"
  | "exif_out_of_window"
  | "no_exif"
  | "exif_valid_but_low_trust"
  | "vision_auto_approved"
  | "vision_pending_no_public"
  | "vision_pending_low_confidence"
  | "duplicate_image"
  | "ai_vision_timeout";

interface StatusResult {
  status: "AUTO_APPROVED" | "PENDING";
  aiConfidence: number;
  reason: ApprovalReason;
  /** Dữ liệu AI Vision để lưu vào DB (nếu có) */
  visionData?: {
    extractedUsername: string | null;
    extractedTitle: string | null;
    isFacebookUI: boolean;
    isPublicMode: boolean;
    visionReason: string;
  };
}

/**
 * Ngưỡng vision confidence để tự động duyệt khi không có EXIF.
 * Yêu cầu ảnh phải trông như mạng xã hội thật VÀ ở chế độ công khai.
 */
const VISION_AUTO_APPROVE_CONFIDENCE = 0.82;
const VISION_TRUST_SCORE_REQUIRED = 60;

async function determineStatus(
  exifFound: boolean,
  exifTime: Date | null,
  postStartAt: Date,
  trustScore: number,
  imageBuffer: Buffer | null,
  isDuplicate: boolean,
  visionInput: {
    expectedName: string;
    expectedTitle: string;
    expectedUrl?: string | null;
    mimeType: string;
  } | null
): Promise<StatusResult> {
  // ── Hard block: ảnh trùng lặp ─────────────────────────────────────────
  if (isDuplicate) {
    return { status: "PENDING", aiConfidence: 0.1, reason: "duplicate_image" };
  }

  const startMs = postStartAt.getTime();
  const endMs = startMs + WINDOW_MS;

  // ── Tín hiệu EXIF (mạnh nhất) ─────────────────────────────────────────
  if (exifFound && exifTime) {
    const takenMs = exifTime.getTime();
    const isWithinWindow = takenMs >= startMs && takenMs <= endMs;

    if (isWithinWindow) {
      if (trustScore >= 50) {
        return { status: "AUTO_APPROVED", aiConfidence: 0.97, reason: "exif_valid" };
      }
      return { status: "PENDING", aiConfidence: 0.97, reason: "exif_valid_but_low_trust" };
    }
    // EXIF ngoài cửa sổ → thử vision nếu trust đủ cao
  }

  // ── AI Vision Check (khi EXIF không đủ) ──────────────────────────────
  const needsVision = imageBuffer && visionInput && trustScore >= VISION_TRUST_SCORE_REQUIRED;

  if (needsVision) {
    try {
      const base64Image = imageBuffer.toString("base64");
      const vision = await runVisionCheck({
        base64Image,
        mimeType: visionInput.mimeType,
        expectedName: visionInput.expectedName,
        expectedTitle: visionInput.expectedTitle,
        expectedUrl: visionInput.expectedUrl,
      });

      const visionData = {
        extractedUsername: vision.extractedUsername,
        extractedTitle: vision.extractedTitle,
        isFacebookUI: vision.isFacebookUI,
        isPublicMode: vision.isPublicMode,
        visionReason: vision.reason,
      };

      // Điều kiện tự động duyệt qua AI vision:
      // 1. Vision đánh giá hợp lệ
      // 2. Confidence đủ cao
      // 3. Ảnh trông như giao diện mạng xã hội thật
      // 4. Bài ở chế độ Công khai
      if (
        vision.isValid &&
        vision.confidence >= VISION_AUTO_APPROVE_CONFIDENCE &&
        vision.isFacebookUI &&
        vision.isPublicMode
      ) {
        return {
          status: "AUTO_APPROVED",
          aiConfidence: vision.confidence,
          reason: "vision_auto_approved",
          visionData,
        };
      }

      // Ảnh hợp lệ nhưng thiếu chế độ công khai → vào hàng đợi với confidence cao
      if (vision.isValid && vision.confidence >= VISION_AUTO_APPROVE_CONFIDENCE && !vision.isPublicMode) {
        return {
          status: "PENDING",
          aiConfidence: vision.confidence,
          reason: "vision_pending_no_public",
          visionData,
        };
      }

      // Confidence thấp → vào hàng đợi
      return {
        status: "PENDING",
        aiConfidence: vision.confidence,
        reason: "vision_pending_low_confidence",
        visionData,
      };
    } catch {
      // Vision timeout hoặc lỗi API → fallback về PENDING bình thường
    }

    // Vision timeout fallback
    if (exifFound && exifTime) {
      return { status: "PENDING", aiConfidence: 0.5, reason: "ai_vision_timeout" };
    }
    return { status: "PENDING", aiConfidence: 0.25, reason: "ai_vision_timeout" };
  }

  // ── Fallback thuần ────────────────────────────────────────────────────
  if (exifFound && exifTime) {
    return { status: "PENDING", aiConfidence: 0.5, reason: "exif_out_of_window" };
  }
  return { status: "PENDING", aiConfidence: 0.25, reason: "no_exif" };
}

// ─── Tạo message trả về cho frontend ──────────────────────────────────────────

function buildMessage(reason: ApprovalReason): string {
  switch (reason) {
    case "exif_valid":
      return "Tự động xác thực thành công! Dữ liệu EXIF hợp lệ và nằm trong cửa sổ 24h.";
    case "vision_auto_approved":
      return "AI đã xác thực minh chứng thành công! Nội dung ảnh hợp lệ và ở chế độ công khai.";
    case "exif_out_of_window":
      return "Ảnh có dữ liệu EXIF nhưng thời gian chụp nằm ngoài cửa sổ 24h. Chuyển sang hàng đợi duyệt thủ công.";
    case "no_exif":
      return "Không phát hiện thông tin EXIF (có thể là ảnh chụp màn hình). Chuyển sang hàng đợi duyệt thủ công.";
    case "exif_valid_but_low_trust":
      return "Dữ liệu EXIF hợp lệ nhưng tài khoản đang có Độ tin cậy thấp. Chuyển sang hàng đợi duyệt thủ công.";
    case "vision_pending_no_public":
      return "AI nhận dạng được nội dung nhưng không thấy chế độ Công khai. Vui lòng đảm bảo share ở chế độ Public. Chuyển sang hàng đợi duyệt thủ công.";
    case "vision_pending_low_confidence":
      return "AI không xác minh được nội dung ảnh với độ chính xác đủ cao. Chuyển sang hàng đợi duyệt thủ công.";
    case "duplicate_image":
      return "Phát hiện ảnh đã được sử dụng trước đó. Vui lòng chụp ảnh mới. Chuyển sang hàng đợi duyệt thủ công.";
    case "ai_vision_timeout":
      return "Hệ thống AI tạm thời không phản hồi. Đã chuyển sang hàng đợi duyệt thủ công.";
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // ── 1. Xác thực phiên đăng nhập ──────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Bạn cần đăng nhập để nộp minh chứng." },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  try {
    // ── 2. Parse input — hỗ trợ cả FormData (cũ) và JSON (Uploadthing) ─────
    const contentType = request.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    let postId: string;
    let imageUrl: string;
    let imageBuffer: Buffer | null = null;
    let imageFileType: string = "image/jpeg";

    if (isJson) {
      // ── (A) JSON flow (Uploadthing: ảnh đã upload lên CDN) ────────────────
      let body: { post_id?: string; image_url?: string };
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, error: "JSON body không hợp lệ." },
          { status: 400 }
        );
      }

      postId = (body.post_id ?? "").trim();
      imageUrl = (body.image_url ?? "").trim();

      if (!postId) {
        return NextResponse.json(
          { success: false, error: "Thiếu trường post_id." },
          { status: 400 }
        );
      }

      if (!imageUrl) {
        return NextResponse.json(
          { success: false, error: "Thiếu trường image_url." },
          { status: 400 }
        );
      }

      // Fetch ảnh từ CDN để phân tích EXIF server-side
      try {
        const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
        if (!imgRes.ok) throw new Error(`CDN responded ${imgRes.status}`);
        const arrayBuffer = await imgRes.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        imageFileType = imgRes.headers.get("content-type") || "image/jpeg";
      } catch (fetchErr) {
        console.warn("[checkins] Could not fetch image from CDN for EXIF:", fetchErr);
        // Không block — vẫn tiếp tục với PENDING status
        imageBuffer = null;
      }
    } else {
      // ── (B) FormData flow (cũ: upload file trực tiếp) ──────────────────────
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        return NextResponse.json(
          { success: false, error: "Dữ liệu form không hợp lệ hoặc không phải multipart/form-data." },
          { status: 400 }
        );
      }

      const rawPostId = (formData.get("post_id") ?? formData.get("postId")) as string | null;
      const imageFile = (formData.get("image_file") ?? formData.get("image")) as File | null;

      if (!rawPostId || typeof rawPostId !== "string" || rawPostId.trim() === "") {
        return NextResponse.json(
          { success: false, error: "Thiếu trường post_id." },
          { status: 400 }
        );
      }
      postId = rawPostId.trim();

      if (!imageFile || typeof imageFile.arrayBuffer !== "function") {
        return NextResponse.json(
          { success: false, error: "Thiếu trường image_file hoặc file không hợp lệ." },
          { status: 400 }
        );
      }

      // ── 3a. Validate file type ───────────────────────────────────────────────
      if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(imageFile.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `Định dạng ảnh không được hỗ trợ: "${imageFile.type}". Chỉ chấp nhận JPG, PNG, WEBP.`,
          },
          { status: 422 }
        );
      }

      // ── 3b. Validate file size ───────────────────────────────────────────────
      if (imageFile.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            success: false,
            error: `Dung lượng ảnh (${(imageFile.size / 1024 / 1024).toFixed(1)} MB) vượt quá giới hạn 10 MB.`,
          },
          { status: 422 }
        );
      }

      // Read buffer & upload to Vercel Blob
      const arrayBuffer = await imageFile.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      imageFileType = imageFile.type;

      const uploadFilename = `${userId}_${postId}_${Date.now()}${
        imageFile.name ? "." + imageFile.name.split(".").pop()?.toLowerCase() : ".jpg"
      }`;

      const uploadResult = await uploadImage(
        imageBuffer,
        uploadFilename,
        imageFileType,
        "checkins"
      ).catch((reason) => {
        console.error("[checkins] Upload failed:", reason instanceof Error ? reason.message : reason);
        throw reason;
      });

      imageUrl = uploadResult.url;
    }

    // ── 4a. Kiểm tra Post tồn tại ────────────────────────────────────────────
    const post = await db.post.findUnique({
      where: { id: postId.trim() },
      select: {
        id: true,
        title: true,
        url: true,
        start_at: true,
        is_archived: true,
        allow_late_submit: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Bài viết không tồn tại hoặc đã bị xoá." },
        { status: 404 }
      );
    }

    if (post.is_archived) {
      return NextResponse.json(
        { success: false, error: "Bài viết này đã bị archive, không thể nộp thêm minh chứng." },
        { status: 410 }
      );
    }

    // ── 4b. Kiểm tra cửa sổ 24h của Post ────────────────────────────────────
    // Người dùng không được nộp sau khi cửa sổ đã đóng, trừ khi Admin đã mở khóa nộp bù.
    const windowEndMs = new Date(post.start_at).getTime() + WINDOW_MS;
    if (Date.now() > windowEndMs && !post.allow_late_submit) {
      return NextResponse.json(
        {
          success: false,
          error: "Cửa sổ nộp bài 24h đã kết thúc. Vui lòng liên hệ HR Admin nếu cần hỗ trợ.",
        },
        { status: 422 }
      );
    }

    // ── 4c. Kiểm tra trùng lặp (chống spam) & xử lý nộp lại ────────────────
    const existingCheckin = await db.checkin.findFirst({
      where: {
        user_id: userId,
        post_id: post.id,
      },
      select: { id: true, status: true, image_url: true },
    });

    if (existingCheckin) {
      // Nếu bài nộp trước đó bị REJECTED → cho phép nộp lại:
      // xoá ảnh cũ trên Vercel Blob, xoá bản ghi cũ, rồi fall through tạo mới
      if (existingCheckin.status === "REJECTED") {
        console.log(
          `[checkins] Re-submit: deleting old image for checkin ${existingCheckin.id}`
        );
        await deleteImage(existingCheckin.image_url);
        await db.checkin.delete({ where: { id: existingCheckin.id } });
        // Fall through to create new checkin below
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Bạn đã nộp minh chứng cho bài viết này rồi. Mỗi người chỉ được nộp một lần.",
            existing: {
              id: existingCheckin.id,
              status: existingCheckin.status,
            },
          },
          { status: 409 } // 409 Conflict
        );
      }
    }

    // ── 5. Phân tích EXIF từ buffer ─────────────────────────────────────────
    const exif: ExifResult = imageBuffer
      ? await parseExifFromBuffer(imageBuffer)
      : { exifTime: null, exifFound: false, sourceTag: null };

    // ── 5b. Tính Perceptual Hash & phát hiện ảnh trùng lặp ──────────────
    let imagePhash: string | null = null;
    let isDuplicate = false;

    if (imageBuffer) {
      imagePhash = await computeAHash(imageBuffer);

      if (imagePhash) {
        // So sánh với các checkin đã được duyệt của bài viết này (chặn reuse ảnh giống nhau)
        const recentApprovedCheckins = await db.checkin.findMany({
          where: {
            post_id: post.id,
            status: { in: ["AUTO_APPROVED", "APPROVED"] },
            image_phash: { not: null },
          },
          select: { image_phash: true },
          take: 200,
        });

        for (const existing of recentApprovedCheckins) {
          if (existing.image_phash && hammingDistance(imagePhash, existing.image_phash) <= PHASH_DUPLICATE_THRESHOLD) {
            isDuplicate = true;
            break;
          }
        }
      }
    }

    // ── 6. Lấy Trust Score người dùng ────────────────────────────────────
    const userRecord = await db.user.findUnique({
      where: { id: userId },
      select: { trust_score: true, name: true }
    });
    const trustScore = userRecord?.trust_score ?? 80;
    const userName = userRecord?.name ?? "";

    // ── 7. Composite scoring — xác định trạng thái cuối ──────────────────
    const result = await determineStatus(
      exif.exifFound,
      exif.exifTime,
      new Date(post.start_at),
      trustScore,
      imageBuffer,
      isDuplicate,
      imageBuffer ? {
        expectedName: userName,
        expectedTitle: post.title,
        expectedUrl: post.url,
        mimeType: imageFileType,
      } : null
    );

    const finalStatus = result.status;
    const finalReason = result.reason;

    // ── 8. Tạo bản ghi Checkin ───────────────────────────────────────────────
    const checkin = await db.checkin.create({
      data: {
        user_id: userId,
        post_id: post.id,
        image_url: imageUrl,
        exif_time: exif.exifTime ?? null,
        status: finalStatus,
        ai_confidence: result.aiConfidence,
        is_ai_flagged: finalStatus === "PENDING" && !exif.exifFound,
        image_phash: imagePhash,
        ai_analysis_reason: result.visionData?.visionReason
          ?? (finalReason === "exif_valid_but_low_trust" ? "Độ tin cậy thấp, yêu cầu duyệt tay" : null),
        ai_extracted_username: result.visionData?.extractedUsername ?? null,
        ai_extracted_title: result.visionData?.extractedTitle ?? null,
        ai_is_facebook_ui: result.visionData?.isFacebookUI ?? null,
        ai_is_public_mode: result.visionData?.isPublicMode ?? null,
      },
    });

    // Revalidate cache after a new check-in submission
    revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
    revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default");
    revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");

    if (finalStatus === "AUTO_APPROVED") {
      await updateUserTrustScore(userId, "AUTO_APPROVED", post.id);
    }

    // ── 9. Trả về kết quả ────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        status: finalStatus,
        exif_time: exif.exifTime ? exif.exifTime.toISOString() : null,
        exif_found: exif.exifFound,
        exif_source_tag: exif.sourceTag,
        image_url: imageUrl,
        checkin_id: checkin.id,
        ai_checked: !!result.visionData,
        message: buildMessage(finalReason),
      },
      { status: 201 }
    );

  } catch (err: unknown) {
    // Lỗi không mong đợi (DB connection, v.v.)
    const message = err instanceof Error ? err.message : "Lỗi hệ thống không xác định.";
    console.error("[checkins] Unexpected error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
        // Chỉ expose chi tiết khi development để tránh rò rỉ thông tin
        ...(process.env.NODE_ENV === "development" && { debug: message }),
      },
      { status: 500 }
    );
  }
}

// ─── GET /api/checkins?post_id=... ────────────────────────────────────────────
// Trả về danh sách checkin của user hiện tại, tuỳ chọn lọc theo post_id

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Bạn cần đăng nhập." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("post_id");

    const checkins = await db.checkin.findMany({
      where: {
        user_id: session.user.id,
        ...(postId ? { post_id: postId } : {}),
      },
      select: {
        id: true,
        post_id: true,
        status: true,
        exif_time: true,
        submitted_at: true,
        image_url: true,
        reject_reason: true,
        ai_confidence: true,
        post: {
          select: { id: true, title: true, start_at: true },
        },
      },
      orderBy: { submitted_at: "desc" },
    });

    return NextResponse.json({ success: true, checkins });
  } catch (err) {
    console.error("[checkins GET] Error:", err);
    return NextResponse.json(
      { success: false, error: "Không thể tải danh sách checkin." },
      { status: 500 }
    );
  }
}
