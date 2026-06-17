import { put, del } from "@vercel/blob";

export interface UploadResult {
  url: string;
  provider: "vercel-blob";
}

/**
 * Upload an image buffer to Vercel Blob storage.
 * Returns a publicly accessible URL.
 */
export async function uploadImage(
  fileData: Buffer | ArrayBuffer | File,
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

/**
 * Delete an image from Vercel Blob storage by its public URL.
 * Handles errors gracefully — logs a warning if the file doesn't exist
 * or the URL isn't a Vercel Blob URL.
 */
export async function deleteImage(imageUrl: string): Promise<boolean> {
  // Only attempt deletion for Vercel Blob URLs
  if (!imageUrl || !imageUrl.includes("blob.vercel-storage.com")) {
    console.warn(`[upload] Skipped deletion — not a Vercel Blob URL: ${imageUrl}`);
    return false;
  }

  try {
    await del(imageUrl);
    console.log(`[upload] Deleted image: ${imageUrl}`);
    return true;
  } catch (error) {
    console.warn(
      `[upload] Failed to delete image: ${imageUrl}`,
      error instanceof Error ? error.message : error
    );
    return false;
  }
}
