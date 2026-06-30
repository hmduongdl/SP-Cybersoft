import sharp from "sharp";
import { uploadImage } from "@/lib/upload";

const MAX_APPROVED_IMAGES = 3;
const MAX_IMAGE_EDGE = 1800;
const WEBP_QUALITY = 82;

function parseDataUrl(dataUrl: string): Buffer | null {
  const match = dataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[1], "base64");
}

async function readImage(url: string): Promise<Buffer | null> {
  if (url.startsWith("data:image/")) return parseDataUrl(url);

  const response = await fetch(url);
  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) return null;

  return Buffer.from(await response.arrayBuffer());
}

export async function optimizeApprovedPcSubmissionImages(
  submissionId: string,
  imageUrls: unknown
): Promise<string[]> {
  const urls = Array.isArray(imageUrls) ? imageUrls.filter((url): url is string => typeof url === "string") : [];
  const keptUrls = urls.slice(0, MAX_APPROVED_IMAGES);
  const optimizedUrls: string[] = [];

  for (let index = 0; index < keptUrls.length; index += 1) {
    const originalUrl = keptUrls[index];

    try {
      const source = await readImage(originalUrl);
      if (!source) {
        optimizedUrls.push(originalUrl);
        continue;
      }

      const optimized = await sharp(source, { failOn: "none" })
        .rotate()
        .resize({
          width: MAX_IMAGE_EDGE,
          height: MAX_IMAGE_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY, effort: 4 })
        .toBuffer();

      const uploaded = await uploadImage(
        optimized,
        `pc-submission-${submissionId}-${index + 1}.webp`,
        "image/webp",
        "pc-build/approved"
      );

      optimizedUrls.push(uploaded.url);

    } catch (error) {
      console.warn(
        `[pc-submission-images] Failed to optimize image for submission ${submissionId}:`,
        error instanceof Error ? error.message : error
      );
      optimizedUrls.push(originalUrl);
    }
  }

  return optimizedUrls;
}
