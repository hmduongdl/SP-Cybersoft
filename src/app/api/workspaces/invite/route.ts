import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, email, role } = await req.json();

    if (!workspaceId || !email) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const ws = await db.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) {
      return NextResponse.json({ error: "Workspace không tồn tại" }, { status: 404 });
    }

    if (ws.owner_id !== session.user.id) {
      return NextResponse.json({ error: "Chỉ chủ sở hữu mới có quyền mời thành viên" }, { status: 403 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy người dùng có email này trong hệ thống" }, { status: 404 });
    }

    if (user.id === session.user.id) {
      return NextResponse.json({ error: "Không thể thêm chính bạn vào workspace" }, { status: 400 });
    }

    const existing = await db.workspaceCollaborator.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Người dùng này đã là thành viên của workspace" }, { status: 409 });
    }

    const collaborator = await db.workspaceCollaborator.create({
      data: {
        workspace_id: workspaceId,
        user_id: user.id,
        role: role || "MEMBER",
      },
    });

    return NextResponse.json(collaborator, { status: 201 });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
