import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, color, workspace_id } = body;

    if (!name || !workspace_id) {
      return NextResponse.json({ error: "Thiếu dữ liệu bắt buộc" }, { status: 400 });
    }

    // Prevent duplicates across users in the same workspace
    const existingTag = await db.tag.findFirst({
      where: {
        name,
        workspace_id,
      }
    });

    if (existingTag) {
      return NextResponse.json(existingTag);
    }

    const tag = await db.tag.create({
      data: {
        name,
        color: color || "#3b82f6",
        workspace_id,
        user_id: session.user.id,
      },
    });

    revalidatePath("/tasks");
    return NextResponse.json(tag);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Thẻ này đã tồn tại trong không gian làm việc" }, { status: 400 });
    }
    console.error("Create tag error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
