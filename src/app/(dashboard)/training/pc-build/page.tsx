import { auth } from "@/auth";
import { redirect } from "next/navigation";
import PcBuildTrainingClient from "./pc-build-training-client";

export const dynamic = "force-dynamic";

export default async function PcBuildTrainingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <PcBuildTrainingClient />;
}
