import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

/**
 * Route handler cho Uploadthing.
 * Thư viện tự động đọc biến môi trường UPLOADTHING_TOKEN để xác thực.
 *
 * - POST /api/uploadthing — nhận file upload (multipart)
 * - GET  /api/uploadthing — xử lý callback xác thực
 */
const { GET: _GET, POST: _POST } = createRouteHandler({
  router: ourFileRouter,
});

/** Wrapper bắt lỗi không mong muốn để tránh crash 500 */
const wrapHandler = (handler: (...args: any[]) => Promise<Response>) => {
  return async (...args: any[]): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("[uploadthing] Unhandled error:", err);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  };
};

export const GET = wrapHandler(_GET);
export const POST = wrapHandler(_POST);
