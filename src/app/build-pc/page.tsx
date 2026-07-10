import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getResolvedUserPlan } from "@/lib/plan-pause";
import BuildPcClient from "./build-pc-client";

export const dynamic = "force-dynamic";

export default async function BuildPcPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const resolved = await getResolvedUserPlan(session.user.id);
  const effectivePlan = resolved?.effectivePlan ?? "FREE";

  return (
    <div className="w-full">
      <BuildPcClient userPlan={effectivePlan} />
    </div>
  );
}
