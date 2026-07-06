import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { getEffectivePlan, PLAN_FEATURES } from "@/lib/plan-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaces = await db.workspace.findMany({
      where: {
        OR: [
          { owner_id: session.user.id },
          { collaborators: { some: { user_id: session.user.id } } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    // Deduplicate by ID — a user may own a workspace matching both owner_id and name filters
    const uniqueMap = new Map<string, typeof workspaces[number]>();
    workspaces.forEach(ws => uniqueMap.set(ws.id, ws));
    const uniqueWorkspaces = Array.from(uniqueMap.values());

    return NextResponse.json({ workspaces: uniqueWorkspaces });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, icon, color } = body;
    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

    // Lấy thông tin plan của user
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, plan: true, plan_expires_at: true }
    });

    const effectivePlan = getEffectivePlan(
      user?.role ?? "USER",
      user?.plan ?? "FREE",
      user?.plan_expires_at ?? null
    );

    const maxWorkspaces = PLAN_FEATURES[effectivePlan].maxWorkspaces;

    const customCount = await db.workspace.count({ where: { owner_id: session.user.id, type: "CUSTOM" } });
    if (customCount >= maxWorkspaces) {
      return NextResponse.json({
        error: `Bạn đã đạt giới hạn tối đa ${maxWorkspaces} không gian làm việc đối với gói ${effectivePlan}!`
      }, { status: 400 });
    }

    const ws = await db.workspace.create({
      data: { name, icon, color, owner_id: session.user.id, type: "CUSTOM" }
    });

    return NextResponse.json(ws);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
