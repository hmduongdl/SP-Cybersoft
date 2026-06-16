import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      if (!isLoggedIn) return false;

      const pathname = nextUrl.pathname;

      // Chuyển hướng route /onboarding về dashboard (Onboarding là popup modal)
      if (pathname.startsWith("/onboarding")) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Admin routes — yêu cầu role ADMIN
      if (pathname.startsWith("/admin")) {
        if (auth.user?.role === "ADMIN") return true;
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Protected routes — yêu cầu đăng nhập
      const isProtectedRoute =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/calendar") ||
        pathname.startsWith("/posts");

      if (isProtectedRoute) {
        // User chưa onboard → giữ ở dashboard để hiển thị popup Onboarding
        if (!auth.user?.is_onboarded && !pathname.startsWith("/dashboard")) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user && user.id) {
        token.id = user.id;
        token.role = user.role ? user.role : "USER";
        token.is_onboarded = user.is_onboarded ?? false;
        token.hasFacebook = false;
        token.picture = user.image;
        token.name = user.name;
        token.department = user.department ?? "";
        token.avatar_url = user.avatar_url ?? null;
        token.username = user.username ?? null;
        token.phone = user.phone ?? null;
        token.facebook_link = user.facebook_link ?? null;
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
        session.user.is_onboarded = token.is_onboarded as boolean;
        session.user.hasFacebook = false;
        session.user.department = token.department as string;
        session.user.avatar_url = token.avatar_url as string | null;
        session.user.username = token.username as string | null;
        session.user.phone = token.phone as string | null;
        session.user.facebook_link = token.facebook_link as string | null;
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
    Credentials({}),
  ],
} satisfies NextAuthConfig;
