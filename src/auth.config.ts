import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authConfig = {
  pages: {
    signIn: "/login", // Trang đăng nhập tùy chỉnh
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      
      // Nếu chưa đăng nhập, NextAuth sẽ tự động chuyển hướng về trang /login
      if (!isLoggedIn) return false;

      const isFirstLogin = auth?.user?.is_first_login;
      const isOnboardingRoute = nextUrl.pathname.startsWith("/onboarding");

      // Xử lý chuyển hướng Onboarding
      if (isFirstLogin && !isOnboardingRoute) {
        return Response.redirect(new URL("/onboarding", nextUrl));
      }
      if (!isFirstLogin && isOnboardingRoute) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Bảo vệ các đường dẫn Admin
      const isOnAdminRoute = nextUrl.pathname.startsWith("/admin");
      if (isOnAdminRoute) {
        if (auth.user?.role === "ADMIN") return true;
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user && user.id) {
        token.id = user.id;
        token.role = user.role ? user.role : "USER";
        token.is_first_login = user.is_first_login ?? false;
        token.hasFacebook = false;
        token.picture = user.image;
        token.name = user.name;
        token.department = user.department ?? "";
        token.avatar_url = user.avatar_url ?? null;
      }

      if (token.id && token.hasFacebook === undefined) {
        token.hasFacebook = false;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.is_first_login = token.is_first_login as boolean;
        session.user.hasFacebook = false;
        session.user.department = token.department as string;
        session.user.avatar_url = token.avatar_url as string | null;
        if (token.picture) {
          session.user.image = token.picture as string;
        }
        if (token.name) {
          session.user.name = token.name as string;
        }
      }

      return session;
    },
  },
  providers: [
    // Khai báo cấu hình rỗng cho Credentials, logic validate sẽ nằm ở file Node runtime auth.ts
    Credentials({}),
  ],
} satisfies NextAuthConfig;
