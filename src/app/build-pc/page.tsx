import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getEffectivePlan } from "@/lib/plan-utils";
import BuildPcClient from "./build-pc-client";

export const dynamic = "force-dynamic";

export default async function BuildPcPage() {
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

  return (
    <div className="w-full">
      <BuildPcClient userPlan={effectivePlan} />
    </div>
  );
}
