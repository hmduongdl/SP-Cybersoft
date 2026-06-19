import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ collaboratorId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { collaboratorId } = resolvedParams;

    const collaborator = await db.workspaceCollaborator.findUnique({
      where: { id: collaboratorId },
      include: { workspace: true },
    });

    if (!collaborator) {
      return NextResponse.json({ error: "Không tìm thấy thành viên này trong workspace" }, { status: 404 });
    }

    if (collaborator.workspace.owner_id !== session.user.id) {
      return NextResponse.json({ error: "Chỉ chủ sở hữu mới có quyền xóa thành viên" }, { status: 403 });
    }

    await db.workspaceCollaborator.delete({ where: { id: collaboratorId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove collaborator error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
