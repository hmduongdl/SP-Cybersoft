/**
 * upload.ts — Pluggable image upload adapter
 *
 * Strategy is resolved from the environment:
 *   UPLOAD_PROVIDER=cloudinary  → Cloudinary (requires CLOUDINARY_URL)
 *   UPLOAD_PROVIDER=vercel-blob → Vercel Blob (requires BLOB_READ_WRITE_TOKEN)
 *   <anything else / unset>     → local filesystem under public/uploads/
 *
 * All strategies share the same signature:
 *   uploadImage(buffer, filename, mimeType) → Promise<string> (public URL)
 */

import path from "path";
import fs from "fs";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadResult {
  url: string;
  provider: "local" | "cloudinary" | "vercel-blob";
}

// ─── Local filesystem (development / self-hosted) ─────────────────────────────

async function uploadLocal(
  buffer: Buffer,
  filename: string
): Promise<UploadResult> {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);
  return {
    url: `/uploads/${filename}`,
    provider: "local",
  };
}

// ─── Cloudinary ───────────────────────────────────────────────────────────────

async function uploadCloudinary(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  // Lazy-import so the module is optional at install time
  const cloudinary = (await import("cloudinary")).v2;
  // cloudinary is auto-configured from CLOUDINARY_URL env var
  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "teamwork-check/checkins",
        public_id: filename.replace(/\.[^.]+$/, ""),
        resource_type: "image",
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) reject(error ?? new Error("Cloudinary upload failed"));
        else resolve(result as { secure_url: string });
      }
    );
    stream.end(buffer);
  });
  return { url: result.secure_url, provider: "cloudinary" };
}

// ─── Vercel Blob ──────────────────────────────────────────────────────────────

async function uploadVercelBlob(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  const { put } = await import("@vercel/blob");
  const blob = await put(`checkins/${filename}`, buffer, {
    access: "public",
    contentType: mimeType,
  });
  return { url: blob.url, provider: "vercel-blob" };
}

// ─── Public entry-point ───────────────────────────────────────────────────────

/**
 * Upload an image buffer to the configured storage provider.
 * Returns a publicly accessible URL.
 */
export async function uploadImage(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<UploadResult> {
  const ext = path.extname(originalFilename) || ".jpg";
  // Sanitise filename: strip path traversal, replace spaces
  const safeBase = path
    .basename(originalFilename, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 60);
  const uniqueName = `${safeBase}_${Date.now()}${ext}`;

  const provider = process.env.UPLOAD_PROVIDER ?? "local";

  switch (provider) {
    case "cloudinary":
      return uploadCloudinary(buffer, uniqueName, mimeType);
    case "vercel-blob":
      return uploadVercelBlob(buffer, uniqueName, mimeType);
    default:
      return uploadLocal(buffer, uniqueName);
  }
}
