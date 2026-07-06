import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getEffectivePlan } from "@/lib/plan-utils";
import SeoToolsClient from "./seo-tools-client";
import { PlanGate } from "@/components/shared/PlanGate";

export const dynamic = "force-dynamic";

export default async function SeoToolsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, plan: true, plan_expires_at: true },
  });

  const effectivePlan = getEffectivePlan(
    user?.role ?? "USER",
    user?.plan ?? "FREE",
    user?.plan_expires_at ?? null
  );

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
