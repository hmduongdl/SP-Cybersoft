import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessTask } from "@/lib/task-access";
import { leavePresence, touchPresence } from "@/lib/task-note-collab";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    if (!(await canAccessTask(session.user.id, taskId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await touchPresence(
      taskId,
      session.user.id,
      session.user.name || session.user.email || null
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[note/presence POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    await leavePresence(taskId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[note/presence DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
