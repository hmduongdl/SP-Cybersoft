import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authConfig = {
  pages: {
    signIn: "/login", // Trang đăng nhập tùy chỉnh
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdminRoute = nextUrl.pathname.startsWith("/admin");
      
      if (isOnAdminRoute) {
        if (isLoggedIn && auth.user.role === "ADMIN") return true;
        return false; // Chặn truy cập nếu không phải Admin
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session) {
        if (session.is_first_login !== undefined) {
          token.is_first_login = session.is_first_login;
        }
        if (session.name !== undefined) {
          token.name = session.name;
        }
        if (session.image !== undefined) {
          token.picture = session.image;
        }
      }

      if (user && user.id) {
        token.id = user.id;
        token.role = "role" in user && user.role ? user.role : "USER";
        token.is_first_login = "is_first_login" in user ? user.is_first_login : false;
        token.hasFacebook = false;
        token.picture = user.image;
        token.name = user.name;
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
