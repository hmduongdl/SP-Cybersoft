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

    const tag = await db.tag.findUnique({ where: { id } });
    if (!tag) {
      return NextResponse.json({ error: "Thẻ không tồn tại" }, { status: 404 });
    }

    await db.tag.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tag error:", error);
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
    const { name, color } = await req.json();

    const tag = await db.tag.findUnique({ where: { id } });
    if (!tag) {
      return NextResponse.json({ error: "Thẻ không tồn tại" }, { status: 404 });
    }

    const updated = await db.tag.update({
      where: { id },
      data: { name, color },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update tag error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
