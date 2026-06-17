import { UTApi } from "uploadthing/server";

/**
 * Instance UTApi dùng để tương tác với Uploadthing API ở server-side.
 * Tự động đọc UPLOADTHING_TOKEN từ biến môi trường.
 */
export const utapi = new UTApi();

/**
 * Trích xuất file key từ URL của Uploadthing.
 * URL mẫu: https://utfs.io/f/abc-xyz.png → key = "abc-xyz.png"
 */
function extractFileKey(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    // Key nằm sau "/f/"
    const match = url.pathname.match(/^\/f\/(.+)/);
    if (!match?.[1]) return null;
    return match[1];
  } catch {
    return null;
  }
}

/**
 * Xoá file trên Uploadthing bằng URL đầy đủ.
 * Giải phóng quota dung lượng khi file không còn dùng đến.
 *
 * @param fileUrl - Đường dẫn đầy đủ của file (vd: "https://utfs.io/f/abc-xyz.png")
 * @returns true nếu xoá thành công, false nếu thất bại
 */
export async function deleteFileFromUploadthing(
  fileUrl: string
): Promise<boolean> {
  try {
    const fileKey = extractFileKey(fileUrl);
    if (!fileKey) {
      console.error(
        "[uploadthing] Invalid file URL — cannot extract key:",
        fileUrl
      );
      return false;
    }

    await utapi.deleteFiles(fileKey);
    console.log(`[uploadthing] Deleted file: ${fileKey} (${fileUrl})`);
    return true;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[uploadthing] Failed to delete file "${fileUrl}":`,
      message
    );
    return false;
  }
}

/**
 * Xoá nhiều file cùng lúc.
 *
 * @param fileUrls - Mảng các URL cần xoá
 * @returns Số lượng file xoá thành công
 */
export async function deleteFilesFromUploadthing(
  fileUrls: string[]
): Promise<number> {
  const results = await Promise.allSettled(
    fileUrls.map((url) => deleteFileFromUploadthing(url))
  );
  return results.filter((r) => r.status === "fulfilled" && r.value).length;
}
