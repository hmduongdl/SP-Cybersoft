import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getResolvedUserPlan } from "@/lib/plan-pause";
import SeoToolsClient from "./seo-tools-client";
import { PlanGate } from "@/components/shared/PlanGate";

export const dynamic = "force-dynamic";

export default async function SeoToolsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const resolved = await getResolvedUserPlan(session.user.id);
  const effectivePlan = resolved?.effectivePlan ?? "FREE";

  if (effectivePlan !== "MAX" && effectivePlan !== "PRO") {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[60vh]">
        <PlanGate requiredPlan="PRO" currentPlan={effectivePlan}>
          <></>
        </PlanGate>
      </div>
    );
  }

  return (
    <div className="w-full">
      <SeoToolsClient />
    </div>
  );
}
