import { db } from "@/lib/db";
import { aibox } from "@/lib/aibox";

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
  if (plainText.length <= 5) return;

  const res = await aibox.embeddings.create({
    model: "text-embedding-ada-002",
    input: plainText,
  });

  const embedding = res.data[0].embedding;
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

export async function persistTaskNoteFromBlocks(
  taskId: string,
  content: any[],
  editor?: { id: string; name: string | null }
) {
  const existing = await db.taskNote.findUnique({
    where: { task_id: taskId },
    select: { revision: true },
  });
  const nextRevision = (existing?.revision ?? 0) + 1;

  const taskNote = await db.taskNote.upsert({
    where: { task_id: taskId },
    update: {
      content,
      revision: nextRevision,
      last_edited_by_id: editor?.id ?? null,
      last_edited_by_name: editor?.name ?? null,
    },
    create: {
      task_id: taskId,
      content,
      revision: 1,
      last_edited_by_id: editor?.id ?? null,
      last_edited_by_name: editor?.name ?? null,
    },
  });

  const plainText = extractTextFromBlockNote(content);
  try {
    await upsertEmbedding(taskNote.id, plainText);
  } catch (err) {
    console.error("[task-note-persist] embedding failed (note still saved):", err);
  }

  return taskNote;
}
