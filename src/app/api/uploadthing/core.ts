import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/auth";

const f = createUploadthing();

/**
 * Middleware xác thực chung — trích xuất session user.
 * Ném lỗi nếu chưa đăng nhập.
 */
const authenticate = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized — Vui lòng đăng nhập để tải file lên.");
  }
  return {
    userId: session.user.id,
    role: session.user.role ?? "USER",
  };
};

/**
 * screenshotUploader — endpoint upload ảnh minh chứng check-in.
 * - Chỉ nhận PNG, JPG, JPEG
 * - Tối đa 4MB
 * - Yêu cầu đăng nhập (bất kỳ user nào)
 */
export const ourFileRouter = {
  screenshotUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const { userId } = await authenticate();
      return { uploadedBy: userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log(
        `[uploadthing] screenshotUploader — userId=${metadata.uploadedBy}, url=${file.url}, key=${file.key}`
      );
    }),

  /**
   * documentUploader — endpoint upload tài liệu (admin).
   * - Chỉ nhận PDF, DOCX, XLSX
   * - Tối đa 8MB
   * - Yêu cầu role === "ADMIN"
   */
  documentUploader: f({
    "application/pdf": { maxFileSize: "8MB", maxFileCount: 1 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const { userId, role } = await authenticate();
      if (role !== "ADMIN") {
        throw new Error("Forbidden — Chỉ Admin mới được upload tài liệu.");
      }
      return { uploadedBy: userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log(
        `[uploadthing] documentUploader — userId=${metadata.uploadedBy}, url=${file.url}, key=${file.key}`
      );
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
