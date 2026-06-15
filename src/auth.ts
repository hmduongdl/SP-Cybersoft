import NextAuth from "next-auth";
import Facebook from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";

type FacebookProfile = {
  id: string;
  name?: string;
  email?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
};

async function getHasFacebook(userId: string) {
  const account = await db.account.findFirst({
    where: {
      userId,
      provider: "facebook",
    },
    select: {
      id: true,
    },
  });

  return Boolean(account);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
      authorization: {
        params: {
          scope: "email,public_profile",
        },
      },
      profile(profile: FacebookProfile) {
        return {
          id: profile.id,
          name: profile.name ?? null,
          email: profile.email ?? `${profile.id}@facebook.local`,
          image: profile.picture?.data?.url ?? null,
        };
      },
    }),
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!email || !password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email },
        });

        if (user?.passwordHash) {
          const isValidPassword = await bcrypt.compare(password, user.passwordHash);

          if (!isValidPassword || !user.active) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
          };
        }

        if (
          process.env.ADMIN_EMAIL?.toLowerCase() === email &&
          process.env.ADMIN_PASSWORD === password
        ) {
          const passwordHash = await bcrypt.hash(password, 12);
          const adminUser = await db.user.upsert({
            where: { email },
            update: {
              passwordHash,
              role: "ADMIN",
              active: true,
            },
            create: {
              email,
              passwordHash,
              role: "ADMIN",
              active: true,
              name: "Administrator",
            },
          });

          return {
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            image: adminUser.image,
            role: adminUser.role,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      const existingUser = await db.user.findUnique({
        where: { email: user.email },
        select: { active: true },
      });

      return existingUser?.active ?? true;
    },
    async jwt({ token, user }) {
      if (user && user.id) {
        token.id = user.id;
        token.role = "role" in user && user.role ? user.role : "USER";
        token.hasFacebook = await getHasFacebook(user.id);
      }

      if (token.id && token.hasFacebook === undefined) {
        token.hasFacebook = await getHasFacebook(token.id as string);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.hasFacebook = Boolean(token.hasFacebook);
      }

      return session;
    },
  },
});
