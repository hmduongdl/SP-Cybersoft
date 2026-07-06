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

    // Cho phép trang chủ và trang đăng nhập trong quá trình bảo trì
    const isPublicPage = pathname === "/" || pathname.startsWith("/login");

    if (!isAsset && !isPublicPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/maintenance";
      return NextResponse.rewrite(url); // Dùng rewrite để giữ nguyên URL thanh địa chỉ nhưng hiện trang bảo trì
    }

    // During maintenance mode, skip the auth check below
    return NextResponse.next();
  }

  // Extra layer: redirect to /login if still not authenticated.
  // Middleware from NextAuth's authorized callback should have caught this,
  // but sometimes it doesn't due to race conditions or beta version quirks.
  const isLoggedIn = !!request.auth?.user;
  const isPublicPath =
    pathname === "/login" ||
    pathname === "/login/" ||
    pathname === "/maintenance" ||
    pathname === "/";

  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    // Truyền callbackUrl để sau khi đăng nhập redirect về trang gốc
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Thay đổi matcher để cho phép middleware chạy trên mọi route, ngoại trừ các file thật sự là tĩnh
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
