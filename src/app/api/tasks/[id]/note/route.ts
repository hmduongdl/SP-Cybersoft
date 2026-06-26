import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canAccessTask } from "@/lib/task-access";
import { persistTaskNoteFromBlocks } from "@/lib/task-note-persist";
import {
  cleanupExpiredCollabState,
  getActiveLocks,
  getActiveViewers,
} from "@/lib/task-note-collab";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const allowed = await canAccessTask(session.user.id, taskId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await cleanupExpiredCollabState(taskId);

    const [note, locks, viewers] = await Promise.all([
      db.taskNote.findUnique({
        where: { task_id: taskId },
        select: { id: true, content: true, updatedAt: true },
      }),
      getActiveLocks(taskId),
      getActiveViewers(taskId),
    ]);

    return NextResponse.json({ note, locks, viewers });
  } catch (error) {
    console.error("Error fetching task note:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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
    const allowed = await canAccessTask(session.user.id, taskId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content || !Array.isArray(content)) {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }

    const taskNote = await persistTaskNoteFromBlocks(taskId, content);

    return NextResponse.json({ success: true, note: taskNote });
  } catch (error) {
    console.error("Error saving task note:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
