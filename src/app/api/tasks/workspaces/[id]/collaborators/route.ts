import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const ws = await db.workspace.findUnique({ where: { id } });
    if (!ws) return NextResponse.json({ error: "Workspace không tồn tại" }, { status: 404 });
    if (ws.owner_id !== session.user.id) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const collaborators = await db.workspaceCollaborator.findMany({
      where: { workspace_id: id },
      include: {
        user: { select: { id: true, name: true, email: true, avatar_url: true } }
      }
    });

    return NextResponse.json({ collaborators });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { email, role } = await req.json();

    if (!email) return NextResponse.json({ error: "Thiếu email" }, { status: 400 });

    const ws = await db.workspace.findUnique({ where: { id } });
    if (!ws) return NextResponse.json({ error: "Workspace không tồn tại" }, { status: 404 });
    if (ws.owner_id !== session.user.id) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const targetUser = await db.user.findUnique({ where: { email } });
    if (!targetUser) return NextResponse.json({ error: "Không tìm thấy người dùng với email này" }, { status: 404 });

    if (targetUser.id === session.user.id) {
      return NextResponse.json({ error: "Không thể mời chính mình" }, { status: 400 });
    }

    const existing = await db.workspaceCollaborator.findUnique({
      where: { workspace_id_user_id: { workspace_id: id, user_id: targetUser.id } }
    });

    if (existing) return NextResponse.json({ error: "Người dùng đã là cộng tác viên" }, { status: 400 });

    const collab = await db.workspaceCollaborator.create({
      data: {
        workspace_id: id,
        user_id: targetUser.id,
        role: role || "MEMBER"
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar_url: true } }
      }
    });

    return NextResponse.json(collab);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const { id } = resolvedParams; // workspace_id

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) return NextResponse.json({ error: "Thiếu userId" }, { status: 400 });

    const ws = await db.workspace.findUnique({ where: { id } });
    if (!ws) return NextResponse.json({ error: "Workspace không tồn tại" }, { status: 404 });
    
    // Only owner or the user themselves can remove
    if (ws.owner_id !== session.user.id && targetUserId !== session.user.id) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    await db.workspaceCollaborator.delete({
      where: { workspace_id_user_id: { workspace_id: id, user_id: targetUserId } }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const { id } = resolvedParams; // workspace_id

    const { userId, role } = await req.json();
    if (!userId || !role) {
      return NextResponse.json({ error: "Thiếu thông tin cập nhật" }, { status: 400 });
    }

    const ws = await db.workspace.findUnique({ where: { id } });
    if (!ws) return NextResponse.json({ error: "Workspace không tồn tại" }, { status: 404 });
    if (ws.owner_id !== session.user.id) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const updatedCollab = await db.workspaceCollaborator.update({
      where: {
        workspace_id_user_id: {
          workspace_id: id,
          user_id: userId
        }
      },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true, avatar_url: true } }
      }
    });

    return NextResponse.json(updatedCollab);
  } catch (error) {
    console.error("Update collaborator role error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
