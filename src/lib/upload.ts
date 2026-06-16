import { put } from "@vercel/blob";

export interface UploadResult {
  url: string;
  provider: "vercel-blob";
}

/**
 * Upload an image buffer to Vercel Blob storage.
 * Returns a publicly accessible URL.
 */
export async function uploadImage(
  fileData: Buffer | ArrayBuffer,
  originalFilename: string,
  mimeType: string,
  folder: string = "uploads"
): Promise<UploadResult> {
  const ext = originalFilename.includes(".") ? "." + originalFilename.split(".").pop() : ".jpg";
  // Sanitise filename: strip path traversal, replace spaces
  const safeBase = originalFilename
    .replace(ext, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 60);
    
  const uniqueName = `${safeBase}_${Date.now()}${ext}`;

  // Đẩy file lên Vercel Blob (dùng tham số folder để tách biệt avatars và checkins)
  const blob = await put(`${folder}/${uniqueName}`, fileData, {
    access: "public",
    contentType: mimeType,
  });

  return { url: blob.url, provider: "vercel-blob" };
}
