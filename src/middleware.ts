import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

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
  const isOnboardingPage = pathname === "/onboarding";

  if (isLoginPage && session?.user) {
    if (session.user.is_first_login) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (session?.user) {
    if (session.user.is_first_login && !isOnboardingPage && !pathname.startsWith("/api")) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    if (!session.user.is_first_login && isOnboardingPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (!isProtectedRoute(pathname) && !isOnboardingPage) {
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
  matcher: ["/admin/:path*", "/dashboard/:path*", "/calendar", "/posts", "/login", "/onboarding"],
};
