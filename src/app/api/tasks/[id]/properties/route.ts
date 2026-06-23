import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

const TEXT_TYPES = ["TEXT", "SELECT", "MULTI_SELECT", "URL", "EMAIL", "PHONE"];

// POST /api/tasks/[id]/properties — Upsert a custom property value for a task
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const body = await req.json();
    const { definition_id, value } = body;

    if (!definition_id) {
      return NextResponse.json({ error: "Thiếu definition_id" }, { status: 400 });
    }

    // Verify task exists and user has access
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { workspace: true },
    });
    if (!task) {
      return NextResponse.json({ error: "Task không tồn tại" }, { status: 404 });
    }

    // Verify property definition exists and belongs to the task's workspace
    const definition = await db.customPropertyDefinition.findUnique({
      where: { id: definition_id },
    });
    if (!definition) {
      return NextResponse.json({ error: "Thuộc tính không tồn tại" }, { status: 404 });
    }
    if (definition.workspace_id !== task.workspace_id) {
      return NextResponse.json({ error: "Thuộc tính không thuộc workspace của task này" }, { status: 400 });
    }

    // Build the data object based on type — only set the matching column, null the rest
    const data: Record<string, unknown> = {
      value_text: null,
      value_number: null,
      value_boolean: null,
      value_date: null,
    };

    const { type } = definition;

    if (type === "NUMBER") {
      const num = Number(value);
      if (value !== null && value !== undefined && value !== "" && isNaN(num)) {
        return NextResponse.json({ error: "Giá trị NUMBER không hợp lệ" }, { status: 400 });
      }
      data.value_number = (value === null || value === undefined || value === "") ? null : num;
    } else if (type === "CHECKBOX") {
      data.value_boolean = Boolean(value);
    } else if (type === "DATE") {
      if (value) {
        const d = new Date(value);
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: "Giá trị DATE không hợp lệ" }, { status: 400 });
        }
        data.value_date = d;
      } else {
        data.value_date = null;
      }
    } else if (TEXT_TYPES.includes(type)) {
      // SELECT stores the single selected option as text
      // MULTI_SELECT stores JSON.stringify(array)
      if (type === "MULTI_SELECT" && Array.isArray(value)) {
        data.value_text = JSON.stringify(value);
      } else if (value !== null && value !== undefined) {
        data.value_text = String(value);
      } else {
        data.value_text = null;
      }
    } else {
      return NextResponse.json({ error: `Kiểu dữ liệu "${type}" không được hỗ trợ` }, { status: 400 });
    }

    const propValue = await db.customPropertyValue.upsert({
      where: {
        task_id_definition_id: { task_id: taskId, definition_id },
      },
      create: {
        task_id: taskId,
        definition_id,
        ...data,
      },
      update: data,
      include: {
        definition: { select: { id: true, name: true, type: true } },
      },
    });

    return NextResponse.json(propValue);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
