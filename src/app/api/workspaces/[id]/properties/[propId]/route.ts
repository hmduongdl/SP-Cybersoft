import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

// DELETE /api/workspaces/[id]/properties/[propId] — Delete a custom property definition
// Prisma cascade: deletes all CustomPropertyValue rows referencing this definition
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; propId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId, propId } = await params;

    const ws = await db.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) {
      return NextResponse.json({ error: "Workspace không tồn tại" }, { status: 404 });
    }
    if (ws.owner_id !== session.user.id) {
      return NextResponse.json({ error: "Không có quyền chỉnh sửa workspace này" }, { status: 403 });
    }

    const prop = await db.customPropertyDefinition.findUnique({
      where: { id: propId },
    });
    if (!prop) {
      return NextResponse.json({ error: "Thuộc tính không tồn tại" }, { status: 404 });
    }
    if (prop.workspace_id !== workspaceId) {
      return NextResponse.json({ error: "Thuộc tính không thuộc workspace này" }, { status: 400 });
    }

    await db.customPropertyDefinition.delete({ where: { id: propId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
