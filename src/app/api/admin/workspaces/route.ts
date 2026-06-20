import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaces = await db.workspace.findMany({
      where: { owner_id: session.user.id },
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ workspaces });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, description, icon, color, owner_id } = body;
    if (!name || !owner_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const customCount = await db.workspace.count({ where: { owner_id, type: "CUSTOM" } });
    if (customCount >= 5) {
      return NextResponse.json({ error: "Bạn đã đạt giới hạn tối đa 5 không gian làm việc tự tạo!" }, { status: 400 });
    }

    const ws = await db.workspace.create({
      data: { name, description, icon, color, owner_id, type: "CUSTOM" }
    });
    return NextResponse.json(ws);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const ws = await db.workspace.findUnique({ where: { id } });
    if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (ws.is_default) {
      return NextResponse.json({ error: "Không thể xóa không gian mặc định của hệ thống!" }, { status: 400 });
    }

    await db.workspace.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
