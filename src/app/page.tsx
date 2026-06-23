import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "SP Cybersoft | Kỹ Trị & Đột Phá Số",
  description:
    "SP Cybersoft cung cấp các giải pháp phần mềm tùy chỉnh, hạ tầng đám mây và trải nghiệm số đẳng cấp thế giới cho các doanh nghiệp dẫn đầu.",
};

import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();
  return <LandingPage userName={session?.user?.name || null} />;
}
