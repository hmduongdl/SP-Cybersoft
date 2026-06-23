import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "SP Cybersoft | Kỹ Trị & Đột Phá Số",
  description:
    "SP Cybersoft cung cấp các giải pháp phần mềm tùy chỉnh, hạ tầng đám mây và trải nghiệm số đẳng cấp thế giới cho các doanh nghiệp dẫn đầu.",
};

export default function HomePage() {
  return <LandingPage />;
}
