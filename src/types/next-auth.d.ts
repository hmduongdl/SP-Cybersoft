import type { UserRole, Team } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      hasFacebook: boolean;
      is_onboarded: boolean;
      department?: string | null;
      avatar_url?: string | null;
      facebook_link?: string | null;
      username?: string | null;
      phone?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    is_onboarded?: boolean;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    department?: string | null;
    facebook_link?: string | null;
    username?: string | null;
    phone?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    hasFacebook?: boolean;
    is_onboarded?: boolean;
    department?: string | null;
    avatar_url?: string | null;
    facebook_link?: string | null;
    username?: string | null;
    phone?: string | null;
  }
}
