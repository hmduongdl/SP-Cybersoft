import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

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

    const customCount = await db.workspace.count({ where: { owner_id: session.user.id, type: "CUSTOM" } });
    if (customCount >= 5) {
      return NextResponse.json({ error: "Bạn đã đạt giới hạn tối đa 5 không gian làm việc tự tạo!" }, { status: 400 });
    }

    const ws = await db.workspace.create({
      data: { name, icon, color, owner_id: session.user.id, type: "CUSTOM" }
    });

    return NextResponse.json(ws);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
