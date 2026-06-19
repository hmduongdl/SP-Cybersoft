import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const ws = await db.workspace.findUnique({ where: { id } });
    if (!ws) {
      return NextResponse.json({ error: "Workspace không tồn tại" }, { status: 404 });
    }

    if (ws.owner_id !== session.user.id) {
      return NextResponse.json({ error: "Không có quyền xóa" }, { status: 403 });
    }

    if (ws.is_default) {
      return NextResponse.json({ error: "Không thể xóa workspace mặc định" }, { status: 403 });
    }

    await db.workspace.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete workspace error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { name, description, icon, color } = await req.json();

    const ws = await db.workspace.findUnique({ where: { id } });
    if (!ws) {
      return NextResponse.json({ error: "Workspace không tồn tại" }, { status: 404 });
    }

    if (ws.owner_id !== session.user.id) {
      return NextResponse.json({ error: "Không có quyền chỉnh sửa" }, { status: 403 });
    }

    if (ws.is_default) {
      return NextResponse.json({ error: "Không thể chỉnh sửa workspace mặc định" }, { status: 403 });
    }

    const updated = await db.workspace.update({
      where: { id },
      data: { name, description, icon, color },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update workspace error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
