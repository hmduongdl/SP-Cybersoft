import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFeatureQuotaStatus } from "@/lib/plan-quota";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quotas = await getFeatureQuotaStatus(session.user.id);
  return NextResponse.json(quotas);
}
