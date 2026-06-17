import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

// Export both default and named to satisfy Next.js static analysis in different environments
export default auth;
export const middleware = auth;

export const config = {
  // Bảo vệ toàn bộ các trang ngoại trừ login, api, assets, và static files
  matcher: ["/((?!api/uploadthing|api|_next/static|_next/image|favicon.ico|login|images).*)"],
};
