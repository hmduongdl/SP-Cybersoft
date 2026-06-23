import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

const VALID_TYPES = [
  "TEXT", "NUMBER", "SELECT", "MULTI_SELECT",
  "DATE", "CHECKBOX", "URL", "EMAIL", "PHONE",
];

// GET /api/workspaces/[id]/properties — List all custom property definitions
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    const ws = await db.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) {
      return NextResponse.json({ error: "Workspace không tồn tại" }, { status: 404 });
    }

    const properties = await db.customPropertyDefinition.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: "asc" },
    });

    return NextResponse.json({ properties });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/workspaces/[id]/properties — Create a new custom property definition
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    const ws = await db.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) {
      return NextResponse.json({ error: "Workspace không tồn tại" }, { status: 404 });
    }
    if (ws.owner_id !== session.user.id) {
      return NextResponse.json({ error: "Không có quyền chỉnh sửa workspace này" }, { status: 403 });
    }

    const body = await req.json();
    const { name, type, options } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Tên thuộc tính không được để trống" }, { status: 400 });
    }
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `Kiểu dữ liệu không hợp lệ. Hỗ trợ: ${VALID_TYPES.join(", ")}` }, { status: 400 });
    }
    if ((type === "SELECT" || type === "MULTI_SELECT") && (!options || !Array.isArray(options) || options.length === 0)) {
      return NextResponse.json({ error: "SELECT và MULTI_SELECT cần có danh sách options" }, { status: 400 });
    }

    // Check for duplicate name in the same workspace
    const existing = await db.customPropertyDefinition.findUnique({
      where: {
        workspace_id_name: { workspace_id: workspaceId, name: name.trim() },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Tên thuộc tính đã tồn tại trong workspace này" }, { status: 409 });
    }

    const prop = await db.customPropertyDefinition.create({
      data: {
        workspace_id: workspaceId,
        name: name.trim(),
        type,
        options: (type === "SELECT" || type === "MULTI_SELECT") ? options : undefined,
      },
    });

    return NextResponse.json(prop, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
