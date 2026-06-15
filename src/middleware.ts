import { NextResponse } from "next/server";

import { auth } from "@/auth";

const authOnlyRoutes = ["/dashboard", "/calendar", "/posts"];

function isProtectedRoute(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    authOnlyRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
  );
}

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const session = req.auth;
  const isLoginPage = pathname === "/login";

  if (isLoginPage && session?.user) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/calendar", "/posts", "/login"],
};
