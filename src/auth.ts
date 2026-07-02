import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      // On session update trigger
      if (trigger === "update" && session) {
        if (session?.is_verified !== undefined) {
          token.is_verified = session.is_verified;
        }
        if (session?.avatar_url !== undefined) {
          token.avatar_url = session.avatar_url;
          token.picture = session.avatar_url;
        }
      }

      // Initial login — copy user data to token
      if (user && user.id) {
        token.id = user.id;
        token.role = user.role ? user.role : "USER";
        token.is_verified = user.is_verified ?? false;
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

      // Fetch fresh data from database on every request to avoid cached stale data
      if (token.id) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: {
              name: true,
              username: true,
              email: true,
              avatar_url: true,
              role: true,
              department: true,
              facebook_profile_url: true,
              is_verified: true,
              trust_score: true,
              wallet_balance: true,
              pc_score: true,
            },
          });
          if (dbUser) {
            token.name = dbUser.name;
            token.picture = dbUser.avatar_url;
            token.avatar_url = dbUser.avatar_url;
            token.role = dbUser.role || "USER";
            token.department = dbUser.department || "";
            token.is_verified = dbUser.is_verified;
            token.username = dbUser.username || null;
            token.email = dbUser.email;
            token.trust_score = dbUser.trust_score;
            token.wallet_balance = dbUser.wallet_balance;
            token.pc_score = dbUser.pc_score;
            token.facebook_link = dbUser.facebook_profile_url || null;
          }
        } catch {
          console.warn("jwt: không thể query DB, giữ nguyên token.");
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.name = token.name as string;
        session.user.department = token.department as string;
        session.user.avatar_url = token.avatar_url as string | null;
        session.user.username = token.username as string | null;
        session.user.phone = token.phone as string | null;
        session.user.facebook_link = token.facebook_link as string | null;
        session.user.is_verified = token.is_verified as boolean;
        session.user.trust_score = token.trust_score as number;
        session.user.wallet_balance = token.wallet_balance as number;
        session.user.pc_score = token.pc_score as number;
        if (token.picture) {
          session.user.image = token.picture as string;
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
        const identifier = String(credentials?.username ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!identifier || !password) {
          return null;
        }

        const user = await db.user.findFirst({
          where: {
            OR: [
              { username: identifier },
              { email: identifier }
            ]
          },
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            password: true,
            role: true,
            is_verified: true,
            is_active: true,
            department: true,
            avatar_url: true,
            facebook_profile_url: true,
          },
        });

        if (user && user.password) {
          const isValidPassword = await bcrypt.compare(password, user.password);

          if (!isValidPassword) {
            return null;
          }

          if (!user.is_active) {
            throw new Error("ACCOUNT_LOCKED");
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.avatar_url,
            role: user.role,
            is_verified: user.is_verified,
            department: user.department,
            avatar_url: user.avatar_url,
            username: user.username,
            phone: null,
            facebook_link: user.facebook_profile_url,
          };
        }

        // Fallback for admin using env vars
        const adminUsername = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || "admin";
        if (
          adminUsername.toLowerCase() === identifier &&
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
              department: "SALES",
              is_verified: true,
            },
            select: {
              id: true,
              username: true,
              name: true,
              email: true,
              role: true,
              is_verified: true,
              department: true,
              avatar_url: true,
              facebook_profile_url: true,
            },
          });

          return {
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            image: adminUser.avatar_url,
            role: adminUser.role,
            is_verified: adminUser.is_verified,
            department: adminUser.department,
            avatar_url: adminUser.avatar_url,
            username: adminUser.username,
            phone: null,
            facebook_link: adminUser.facebook_profile_url,
          };
        }

        return null;
      },
    }),
  ],
});
