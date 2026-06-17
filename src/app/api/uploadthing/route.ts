import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

/**
 * Route handler cho Uploadthing.
 * Thư viện tự động đọc biến môi trường UPLOADTHING_TOKEN để xác thực.
 *
 * - POST /api/uploadthing — nhận file upload (multipart)
 * - GET  /api/uploadthing — xử lý callback xác thực
 */
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
