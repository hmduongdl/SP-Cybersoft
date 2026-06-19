import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    let whereClause: any = { is_archived: false };
    if (workspaceId && workspaceId !== "ALL") {
      whereClause.workspace_id = workspaceId;
    } else {
      const userWorkspaces = await db.workspace.findMany({ where: { owner_id: session.user.id }, select: { id: true } });
      const userWsIds = userWorkspaces.map(w => w.id);
      whereClause.workspace_id = { in: userWsIds };
    }

    const tasks = await db.task.findMany({
      where: whereClause,
      include: {
        tags: true,
        creator: { select: { name: true, avatar_url: true } },
        workspace: { select: { is_public: true, owner_id: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Check privacy if specific workspace requested
    if (workspaceId && workspaceId !== "ALL" && tasks.length > 0) {
      const ws = tasks[0].workspace;
      if (!ws.is_public && ws.owner_id !== session.user.id) {
         return NextResponse.json({ error: "Private workspace" }, { status: 403 });
      }
    } else if (workspaceId && workspaceId !== "ALL") {
      const wsInfo = await db.workspace.findUnique({ where: { id: workspaceId }, select: { is_public: true, owner_id: true } });
      if (wsInfo && !wsInfo.is_public && wsInfo.owner_id !== session.user.id) {
         return NextResponse.json({ error: "Private workspace" }, { status: 403 });
      }
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, description, status, due_date, tags, workspace_id } = body;

    if (!title || !workspace_id) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const task = await db.task.create({
      data: {
        title,
        description,
        status: status || "TODO",
        due_date: due_date ? new Date(due_date) : null,
        workspace_id,
        creator_id: session.user.id,
        tags: tags && tags.length > 0 ? {
          connect: tags.map((t: any) => ({ id: t.id }))
        } : undefined
      },
      include: {
        tags: true,
        creator: { select: { name: true, avatar_url: true } }
      }
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
