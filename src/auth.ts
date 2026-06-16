import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Username and password",
      credentials: {
        username: { label: "Tên đăng nhập", type: "text" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "").trim();
        const password = String(credentials?.password ?? "");

        if (!username || !password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { username },
        });

        if (user && user.password) {
          const isValidPassword = password === user.password;

          if (!isValidPassword) {
            return null;
          }

          return {
            id: user.id,
            name: user.name || user.full_name,
            email: user.email || user.gmail,
            image: user.avatar_url,
            role: user.role,
            is_first_login: user.is_first_login,
          };
        }

        // Fallback for admin using env vars (using ADMIN_USERNAME if available, or defaulting to ADMIN_EMAIL)
        const adminUsername = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || "admin";
        if (
          adminUsername === username &&
          process.env.ADMIN_PASSWORD === password
        ) {
          const adminUser = await db.user.upsert({
            where: { username: adminUsername },
            update: {
              password: password,
              role: "ADMIN",
            },
            create: {
              username: adminUsername,
              name: "Administrator",
              email: process.env.ADMIN_EMAIL || "admin@example.com",
              password: password,
              role: "ADMIN",
              department: "HR",
              is_first_login: false,
            },
          });

          return {
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            image: adminUser.avatar_url,
            role: adminUser.role,
            is_first_login: adminUser.is_first_login,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return true; // Simple allow for now, adjust if active status is re-added
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
});

