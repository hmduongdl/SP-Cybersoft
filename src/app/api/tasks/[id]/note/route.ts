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

    let locks: Awaited<ReturnType<typeof getActiveLocks>> = [];
    let viewers: Awaited<ReturnType<typeof getActiveViewers>> = [];

    try {
      await cleanupExpiredCollabState(taskId);
      [locks, viewers] = await Promise.all([
        getActiveLocks(taskId),
        getActiveViewers(taskId),
      ]);
    } catch (collabErr) {
      console.warn("[GET note] collab state skipped:", collabErr);
    }

    const note = await db.taskNote.findUnique({
      where: { task_id: taskId },
      select: {
        id: true,
        content: true,
        revision: true,
        updatedAt: true,
        last_edited_by_id: true,
        last_edited_by_name: true,
      },
    });

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

    // Check company workspace assignment permissions
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        workspace: { select: { name: true, type: true } },
        assignees: { select: { user_id: true } }
      }
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isCompanyWorkspace =
      task.workspace.type === "WEBSITE" ||
      task.workspace.type === "TECH" ||
      ["Tech", "Website", "Web"].includes(task.workspace.name);

    if (isCompanyWorkspace && session.user.role !== "ADMIN") {
      const isAssignee = task.assignees.some(a => a.user_id === session.user.id);
      if (!isAssignee) {
        return NextResponse.json(
          { error: "Bạn không có quyền chỉnh sửa ghi chú trong không gian của công ty khi chưa được phân công nhiệm vụ." },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { content } = body;

    if (!content || !Array.isArray(content)) {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }

    const taskNote = await persistTaskNoteFromBlocks(taskId, content, {
      id: session.user.id,
      name: session.user.name || session.user.email || null,
    });

    return NextResponse.json({ success: true, note: taskNote });
  } catch (error) {
    console.error("Error saving task note:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
