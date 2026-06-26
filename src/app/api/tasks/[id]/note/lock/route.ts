import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessTask } from "@/lib/task-access";
import { claimBlockLock, releaseUserLocks } from "@/lib/task-note-collab";

export async function POST(
  req: NextRequest,
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

    const { blockId } = await req.json();
    if (!blockId || typeof blockId !== "string") {
      return NextResponse.json({ error: "Missing blockId" }, { status: 400 });
    }

    const result = await claimBlockLock(
      taskId,
      blockId,
      session.user.id,
      session.user.name || session.user.email || null
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: "Block locked", lockedBy: result.lockedBy },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[note/lock POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
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

    const blockId = req.nextUrl.searchParams.get("blockId") || undefined;
    await releaseUserLocks(taskId, session.user.id, blockId || undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[note/lock DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
