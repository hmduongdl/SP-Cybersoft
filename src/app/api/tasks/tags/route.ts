import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });

    let whereClause: any = {};
    if (workspaceId !== "ALL") {
      whereClause.workspace_id = workspaceId;
    } else {
      const userWorkspaces = await db.workspace.findMany({ 
        where: { 
          OR: [
            { owner_id: session.user.id },
            { is_public: true },
            { collaborators: { some: { user_id: session.user.id } } }
          ]
        }, 
        select: { id: true } 
      });
      const userWsIds = userWorkspaces.map(w => w.id);
      whereClause.workspace_id = { in: userWsIds };
    }

    const tags = await db.tag.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ tags });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
