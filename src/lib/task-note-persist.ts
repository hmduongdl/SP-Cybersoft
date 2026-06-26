import { db } from "@/lib/db";
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export function extractTextFromBlockNote(blocks: any[]): string {
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

async function upsertEmbedding(noteId: string, plainText: string) {
  if (plainText.length <= 5 || !process.env.GEMINI_API_KEY) return;

  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text: plainText }] },
    taskType: TaskType.RETRIEVAL_DOCUMENT,
  });

  const embedding = result.embedding.values;
  const embeddingArrayStr = `[${embedding.join(",")}]`;

  await db.$executeRawUnsafe(
    `
    INSERT INTO "NoteEmbedding" (id, note_id, embedding)
    VALUES (gen_random_uuid(), $1, $2::vector)
    ON CONFLICT (note_id) DO UPDATE SET embedding = $2::vector;
  `,
    noteId,
    embeddingArrayStr
  );
}

export async function persistTaskNoteFromBlocks(taskId: string, content: any[]) {
  const taskNote = await db.taskNote.upsert({
    where: { task_id: taskId },
    update: { content },
    create: { task_id: taskId, content },
  });

  const plainText = extractTextFromBlockNote(content);
  await upsertEmbedding(taskNote.id, plainText);

  return taskNote;
}
