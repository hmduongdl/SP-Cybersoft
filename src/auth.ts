import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On session update (after profile save), query DB for fresh data
      if (trigger === "update") {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, avatar_url: true, department: true, is_first_login: true },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.picture = dbUser.avatar_url;
          token.department = dbUser.department ?? "";
          token.avatar_url = dbUser.avatar_url;
        }
        if (session?.is_first_login !== undefined) {
          token.is_first_login = session.is_first_login;
        }
        return token;
      }

      // Initial login — copy user data to token
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
        session.user.role = token.role as "ADMIN" | "USER";
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

        const user = await db.user.findFirst({
          where: {
            OR: [
              { username: username },
              { email: username }
            ]
          },
        });

        if (user && user.password) {
          const isValidPassword = await bcrypt.compare(password, user.password);

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
            department: user.department,
            avatar_url: user.avatar_url,
          };
        }

        // Fallback for admin using env vars (using ADMIN_USERNAME if available, or defaulting to ADMIN_EMAIL)
        const adminUsername = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || "admin";
        if (
          adminUsername === username &&
          process.env.ADMIN_PASSWORD === password
        ) {
          const passwordHash = await bcrypt.hash(password, 10);
          const adminUser = await db.user.upsert({
            where: { username: adminUsername },
            update: {
              password: passwordHash,
              role: "ADMIN",
            },
            create: {
              username: adminUsername,
              name: "Administrator",
              email: process.env.ADMIN_EMAIL || "admin@example.com",
              password: passwordHash,
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
            department: adminUser.department,
            avatar_url: adminUser.avatar_url,
          };
        }

        return null;
      },
    }),
  ],
});
