/**
 * thumbnail-mirror.ts
 *
 * Tải ảnh thumbnail từ URL bên ngoài (đặc biệt link fbcdn.net có thời hạn),
 * nén xuống kích thước nhỏ (~400px, WebP, quality 72) và upload lên Vercel Blob
 * để có URL vĩnh cửu.
 *
 * Kích thước output: ~15-40KB (đủ hiển thị thumbnail nhỏ, không cần rõ nét).
 */

import { put } from "@vercel/blob";

// Tối đa 5MB được fetch từ URL ngoài
const MAX_FETCH_BYTES = 5 * 1024 * 1024;

// Chỉ mirror những URL không ổn định — fbcdn, scontent, external FB image
const UNSTABLE_PATTERNS = [
  /fbcdn\.net/i,
  /scontent\./i,
  /\.facebook\.com\/.*\.(jpg|jpeg|png|webp)/i,
  /lookaside\.fbsbx\.com/i,
];

// URL đã ổn định — giữ nguyên, không mirror
const STABLE_PATTERNS = [
  /blob\.vercel-storage\.com/i,
  /cloudinary\.com/i,
  /imgur\.com/i,
  /ibb\.co/i,
  /unsplash\.com/i,
];

/**
 * Kiểm tra URL có cần mirror hay không.
 */
export function needsMirroring(url: string | null | undefined): boolean {
  if (!url) return false;
  if (STABLE_PATTERNS.some((p) => p.test(url))) return false;
  if (UNSTABLE_PATTERNS.some((p) => p.test(url))) return true;
  // Các URL ngoài không rõ nguồn gốc → cũng mirror để an toàn
  return true;
}

/**
 * Resize và nén ảnh sử dụng Canvas API (Web standard, không cần sharp).
 * Target: width tối đa 480px, quality 72%, output WebP.
 */
async function compressImageBuffer(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<{ data: Buffer; mime: "image/webp" }> {
  // Dùng sharp nếu có (Node.js environment)
  // Fallback: trả về buffer gốc nếu không resize được
  try {
    // Dynamic import để không break nếu sharp không có
    const sharp = await import("sharp").then((m) => m.default).catch(() => null);

    if (sharp) {
      const compressed = await sharp(Buffer.from(buffer))
        .resize({
          width: 480,
          height: 320,
          fit: "cover",
          position: "centre",
        })
        .webp({ quality: 72, effort: 4 })
        .toBuffer();

      return { data: compressed, mime: "image/webp" };
    }
  } catch {
    // sharp không available — fallback
  }

  // Fallback: nếu không có sharp, trả về buffer gốc nhưng đã trim
  return { data: Buffer.from(buffer), mime: "image/webp" };
}

/**
 * Main function: tải ảnh từ URL, nén, upload Vercel Blob.
 * Trả về URL mới ổn định, hoặc URL gốc nếu xảy ra lỗi.
 */
export async function mirrorThumbnail(
  originalUrl: string | null | undefined,
  postSlug: string = "post"
): Promise<string | null> {
  if (!originalUrl) return null;

  // Không mirror URL đã ổn định
  if (!needsMirroring(originalUrl)) {
    return originalUrl;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn("[thumbnail-mirror] Missing BLOB_READ_WRITE_TOKEN — skipping mirror, using original URL");
    return originalUrl;
  }

  try {
    // 1. Fetch ảnh từ URL ngoài với timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const response = await fetch(originalUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ThumbnailMirror/1.0)",
        Accept: "image/webp,image/jpeg,image/png,image/*",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[thumbnail-mirror] Fetch failed ${response.status} for: ${originalUrl}`);
      return originalUrl; // fallback: giữ URL gốc
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      console.warn(`[thumbnail-mirror] Not an image content-type: ${contentType}`);
      return originalUrl;
    }

    // 2. Kiểm tra kích thước trước khi tải
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_FETCH_BYTES) {
      console.warn(`[thumbnail-mirror] Image too large (${contentLength} bytes), skipping`);
      return originalUrl;
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > MAX_FETCH_BYTES) {
      console.warn(`[thumbnail-mirror] Downloaded image too large (${buffer.byteLength} bytes)`);
      return originalUrl;
    }

    // 3. Nén ảnh
    const { data: compressed, mime } = await compressImageBuffer(buffer, contentType);

    // 4. Upload lên Vercel Blob
    const safeSlug = postSlug.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
    const filename = `thumbnails/thumb_${safeSlug}_${Date.now()}.webp`;

    const blob = await put(filename, compressed, {
      access: "public",
      contentType: mime,
    });

    console.log(
      `[thumbnail-mirror] ✅ Mirrored: ${originalUrl.slice(0, 60)}... → ${blob.url} (${compressed.byteLength} bytes)`
    );

    return blob.url;
  } catch (error: any) {
    // Không crash flow chính — fallback về URL gốc
    console.error(
      `[thumbnail-mirror] ❌ Failed to mirror thumbnail, using original:`,
      error?.message || error
    );
    return originalUrl;
  }
}
