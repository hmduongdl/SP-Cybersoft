import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
          };
        }

        return null;
      },
    }),
  ],
});
