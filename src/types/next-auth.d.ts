import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      hasFacebook: boolean;
      is_first_login: boolean;
      department?: string | null;
      avatar_url?: string | null;
      facebook_profile_url?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    is_first_login?: boolean;
    full_name?: string | null;
    gmail?: string | null;
    avatar_url?: string | null;
    department?: string | null;
    facebook_profile_url?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    hasFacebook?: boolean;
    is_first_login?: boolean;
    department?: string | null;
    avatar_url?: string | null;
    facebook_profile_url?: string | null;
  }
}

