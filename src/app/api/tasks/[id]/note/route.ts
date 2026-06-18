import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Hàm đệ quy trích xuất text từ JSON của BlockNote
function extractTextFromBlockNote(blocks: any[]): string {
  let text = "";
  for (const block of blocks) {
    if (block.content) {
      if (Array.isArray(block.content)) {
        for (const inline of block.content) {
          if (inline.type === "text") {
            text += inline.text + " ";
          }
        }
      } else if (typeof block.content === "string") {
        text += block.content + " ";
      }
    }
    if (block.children && Array.isArray(block.children)) {
      text += extractTextFromBlockNote(block.children) + " ";
    }
    text += "\n";
  }
  return text.trim();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = id;
    const body = await req.json();
    const { content } = body; // Array of BlockNote blocks

    if (!content || !Array.isArray(content)) {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }

    // 1. Lưu nội dung JSONB vào TaskNote
    const taskNote = await prisma.taskNote.upsert({
      where: { task_id: taskId },
      update: { content },
      create: { task_id: taskId, content },
    });

    // 2. Trích xuất plain text
    const plainText = extractTextFromBlockNote(content);

    // 3. Tạo Vector Embeddings bằng Gemini
    if (plainText.length > 5 && process.env.GEMINI_API_KEY) {
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await model.embedContent({
        content: { role: "user", parts: [{ text: plainText }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
      });
      
      const embedding = result.embedding.values;
      const embeddingArrayStr = `[${embedding.join(",")}]`;

      // 4. Lưu/Upsert vào pgvector table NoteEmbedding
      await prisma.$executeRawUnsafe(`
        INSERT INTO "NoteEmbedding" (id, note_id, embedding)
        VALUES (gen_random_uuid(), $1, $2::vector)
        ON CONFLICT (note_id) DO UPDATE SET embedding = $2::vector;
      `, taskNote.id, embeddingArrayStr);
    }

    return NextResponse.json({ success: true, note: taskNote });
  } catch (error) {
    console.error("Error saving task note:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
