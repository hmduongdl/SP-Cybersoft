import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "SP-Cybersoft | Song Phương Technology",
  description:
    "SP-Cybersoft chuyên cung cấp các giải pháp công nghệ, chuyển đổi số, xây dựng công cụ quản lý chuyên nghiệp.",
};

import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();
  return <LandingPage userName={session?.user?.name || null} />;
}
