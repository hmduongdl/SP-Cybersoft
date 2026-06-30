import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "100")));
    const skip = (page - 1) * limit;

    let whereClause: any = { is_archived: false };

    if (workspaceId && workspaceId !== "ALL") {
      // Quick privacy check first — avoid expensive query if unauthorized
      const wsInfo = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { is_public: true, owner_id: true }
      });
      if (!wsInfo) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
      if (!wsInfo.is_public && wsInfo.owner_id !== session.user.id) {
        return NextResponse.json({ error: "Private workspace" }, { status: 403 });
      }
      whereClause.workspace_id = workspaceId;
    } else {
      whereClause.OR = [
        { workspace: { owner_id: session.user.id, type: "PERSONAL" } },
        { assignees: { some: { user_id: session.user.id } } },
        { creator_id: session.user.id }
      ];
    }

    // Run count + findMany in parallel
    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          tags: true,
          creator: { select: { name: true, avatar_url: true } },
          assignees: {
            include: {
              user: { select: { id: true, name: true, avatar_url: true } }
            }
          },
          customProperties: {
            include: {
              definition: { select: { id: true, name: true, type: true, options: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' }
      }),
      db.task.count({ where: whereClause }),
    ]);

    // Flatten assignees for frontend
    const flattened = tasks.map(t => ({
      ...t,
      assignees: t.assignees.map(a => a.user)
    }));

    return NextResponse.json({ tasks: flattened, total, page, limit });
  } catch (error) {
    console.error("[GET /api/tasks] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, description, status, due_date, tags, workspace_id, assignee_ids } = body;

    if (!title || !workspace_id) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    let finalTags = tags && tags.length > 0 ? tags.map((t: any) => ({ id: t.id })) : [];

    // Auto-append default tags for Tech and Website workspaces
    const ws = await db.workspace.findUnique({ where: { id: workspace_id } });
    if (ws) {
      if (ws.name === "Tech") {
        let techTag = await db.tag.findFirst({ where: { workspace_id: ws.id, name: "Tech" } });
        if (!techTag) {
          techTag = await db.tag.create({
            data: { name: "Tech", color: "#3b82f6", workspace_id: ws.id, user_id: session.user.id }
          });
        }
        // Check by name to avoid duplicate when multiple "Tech" tags exist (different user_ids)
        const hasTechTag = tags?.some((t: any) => t.name === "Tech");
        if (!hasTechTag && !finalTags.some((t: any) => t.id === techTag!.id)) {
          finalTags.push({ id: techTag.id });
        }
      } else if (ws.name === "Website" || ws.name === "Web") {
        let webTag = await db.tag.findFirst({ where: { workspace_id: ws.id, name: "Website" } });
        if (!webTag) {
          webTag = await db.tag.create({
            data: { name: "Website", color: "#10b981", workspace_id: ws.id, user_id: session.user.id }
          });
        }
        // Check by name to avoid duplicate when multiple "Website" tags exist (different user_ids)
        const hasWebTag = tags?.some((t: any) => t.name === "Website");
        if (!hasWebTag && !finalTags.some((t: any) => t.id === webTag!.id)) {
          finalTags.push({ id: webTag.id });
        }
      }
    }

    const task = await db.task.create({
      data: {
        title,
        description,
        status: status || "TODO",
        due_date: due_date ? new Date(due_date) : null,
        workspace_id,
        creator_id: session.user.id,
        tags: finalTags.length > 0 ? {
          connect: finalTags
        } : undefined,
        assignees: assignee_ids && assignee_ids.length > 0 ? {
          create: assignee_ids.map((uid: string) => ({ user_id: uid }))
        } : undefined
      },
      include: {
        tags: true,
        creator: { select: { name: true, avatar_url: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, avatar_url: true } }
          }
        }
      }
    });

    // Flatten assignees for response
    const result = { ...task, assignees: task.assignees.map(a => a.user) };

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
