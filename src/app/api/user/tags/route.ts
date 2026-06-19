import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Thiếu workspaceId" }, { status: 400 });
    }

    let whereClause: any = {
      user_id: session.user.id,
    };

    if (workspaceId !== "ALL") {
      whereClause.workspace_id = workspaceId;
    } else {
      const userWorkspaces = await db.workspace.findMany({
        where: {
          OR: [
            { owner_id: session.user.id },
            { is_public: true },
            { collaborators: { some: { user_id: session.user.id } } },
          ],
        },
        select: { id: true },
      });
      whereClause.workspace_id = { in: userWorkspaces.map((w) => w.id) };
    }

    const tags = await db.tag.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Get user tags error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, color, workspaceId } = body;

    if (!name || !workspaceId) {
      return NextResponse.json({ error: "Thiếu dữ liệu bắt buộc" }, { status: 400 });
    }

    const existingTag = await db.tag.findFirst({
      where: {
        name,
        workspace_id: workspaceId,
        user_id: session.user.id,
      },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: "Thẻ này đã tồn tại trong không gian làm việc" },
        { status: 409 }
      );
    }

    const tag = await db.tag.create({
      data: {
        name,
        color: color || "#3b82f6",
        workspace_id: workspaceId,
        user_id: session.user.id,
      },
    });

    return NextResponse.json(tag);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Thẻ này đã tồn tại trong không gian làm việc" },
        { status: 409 }
      );
    }
    console.error("Create user tag error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
