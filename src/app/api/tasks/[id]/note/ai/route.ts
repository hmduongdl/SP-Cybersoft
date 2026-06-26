import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canAccessTask } from "@/lib/task-access";
import { getActiveViewers } from "@/lib/task-note-collab";
import { persistTaskNoteFromBlocks } from "@/lib/task-note-persist";
import {
  markdownToBlockNoteBlocks,
  mergeTaskNoteWithAI,
  rewriteTaskNoteWithAI,
} from "@/lib/task-note-ai";

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
    const { action, localContent } = body as {
      action?: string;
      localContent?: unknown[];
    };

    if (action !== "sync" && action !== "rewrite") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!localContent || !Array.isArray(localContent)) {
      return NextResponse.json({ error: "Invalid localContent" }, { status: 400 });
    }

    if (!process.env.AIBOX_API_KEY) {
      return NextResponse.json(
        { error: "AI chưa được cấu hình (AIBOX_API_KEY)" },
        { status: 503 }
      );
    }

    const [task, serverNote, viewers] = await Promise.all([
      db.task.findUnique({
        where: { id: taskId },
        select: { title: true },
      }),
      db.taskNote.findUnique({
        where: { task_id: taskId },
        select: {
          content: true,
          last_edited_by_name: true,
        },
      }),
      getActiveViewers(taskId).catch(() => []),
    ]);

    const otherViewerNames = viewers
      .filter((v) => v.userId !== session.user!.id)
      .map((v) => v.userName || "Ai đó");

    let markdown: string;

    if (action === "sync") {
      markdown = await mergeTaskNoteWithAI({
        taskTitle: task?.title,
        serverContent: (serverNote?.content as unknown[]) ?? null,
        localContent,
        serverEditedBy: serverNote?.last_edited_by_name,
        otherViewerNames,
      });
    } else {
      markdown = await rewriteTaskNoteWithAI({
        taskTitle: task?.title,
        content: localContent,
      });
    }

    const blocks = markdownToBlockNoteBlocks(markdown);
    const savedNote = await persistTaskNoteFromBlocks(taskId, blocks as any[], {
      id: session.user.id,
      name: session.user.name || session.user.email || null,
    });

    return NextResponse.json({
      success: true,
      content: blocks,
      note: savedNote,
    });
  } catch (error) {
    console.error("[POST note/ai] error:", error);
    return NextResponse.json(
      { error: "AI xử lý thất bại — thử lại sau" },
      { status: 500 }
    );
  }
}
