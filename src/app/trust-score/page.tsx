import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TrustScoreClient from "./trust-score-client";

export const metadata = {
  title: "Lịch sử Trust Score | SP-CyberSoft",
};

export default async function TrustScorePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <TrustScoreClient />;
}
