import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { name, color } = await req.json();

    const tag = await db.tag.findFirst({
      where: { id, user_id: session.user.id },
    });

    if (!tag) {
      return NextResponse.json({ error: "Thẻ không tồn tại" }, { status: 404 });
    }

    const updated = await db.tag.update({
      where: { id },
      data: { name, color },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Tên thẻ đã tồn tại trong không gian làm việc này" },
        { status: 409 }
      );
    }
    console.error("Update user tag error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(req, { params });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const tag = await db.tag.findFirst({
      where: { id, user_id: session.user.id },
    });

    if (!tag) {
      return NextResponse.json({ error: "Thẻ không tồn tại" }, { status: 404 });
    }

    // Disconnect tag from all tasks, then delete
    const tasksWithTag = await db.task.findMany({
      where: { tags: { some: { id } } },
      select: { id: true },
    });

    for (const task of tasksWithTag) {
      await db.task.update({
        where: { id: task.id },
        data: { tags: { disconnect: { id } } },
      });
    }

    await db.tag.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user tag error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
