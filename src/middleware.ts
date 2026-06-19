import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export const middleware = auth((request) => {
  const { pathname } = request.nextUrl;
  const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  if (isMaintenance) {
    // Các đường dẫn ngoại lệ bắt buộc phải bỏ qua để hiển thị trang bảo trì
    const isAsset = 
      pathname.startsWith("/_next") || 
      pathname.startsWith("/api/auth") || // Giữ auth nếu cần kiểm tra admin
      pathname.includes(".") || // các file tĩnh như .png, .css
      pathname === "/maintenance";

    if (!isAsset) {
      const url = request.nextUrl.clone();
      url.pathname = "/maintenance";
      return NextResponse.rewrite(url); // Dùng rewrite để giữ nguyên URL thanh địa chỉ nhưng hiện trang bảo trì
    }
  }

  // Logic NextAuth được tự động chạy khi dùng auth wrapper
  return NextResponse.next();
});

export const config = {
  // Thay đổi matcher để cho phép middleware chạy trên mọi route, ngoại trừ các file thật sự là tĩnh
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
