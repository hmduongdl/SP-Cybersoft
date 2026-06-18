import type { UserRole, Team } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      hasFacebook: boolean;
      /** true nếu user đã điền đầy đủ thông tin hồ sơ */
      is_verified: boolean;
      department?: string | null;
      avatar_url?: string | null;
      facebook_link?: string | null;
      username?: string | null;
      phone?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    /** true nếu user đã điền đầy đủ thông tin hồ sơ */
    is_verified?: boolean;
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
    /** true nếu user đã điền đầy đủ thông tin hồ sơ */
    is_verified?: boolean;
    department?: string | null;
    avatar_url?: string | null;
    facebook_link?: string | null;
    username?: string | null;
    phone?: string | null;
  }
}
