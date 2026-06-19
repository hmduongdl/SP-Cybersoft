import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { title, description, status, due_date, workspace_id, creator_id } = body;

    const task = await db.task.findUnique({
      where: { id },
      include: { workspace: true }
    });

    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updatedTask = await db.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(due_date !== undefined && { due_date: due_date ? new Date(due_date) : null }),
        ...(workspace_id && { workspace_id }),
        ...(creator_id && { creator_id })
      },
      include: {
        creator: { select: { name: true, avatar_url: true } }
      }
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const task = await db.task.findUnique({
      where: { id },
      include: { workspace: true }
    });

    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // "Workspace Tech và Website là thuộc về công ty, các thành viên user thường có quyền viết, thêm nhưng k có quyền xoá, còn personal thì thoải mái"
    if ((task.workspace.name === "Tech" || task.workspace.name === "Website" || task.workspace.name === "Web") && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Bạn không có quyền xóa công việc trong không gian của công ty" }, { status: 403 });
    }

    await db.task.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
