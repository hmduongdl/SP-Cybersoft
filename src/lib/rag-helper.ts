import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function searchSimilarNotes(query: string, workspaceId: string, limit: number = 5) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  // 1. Tạo vector cho câu hỏi (RETRIEVAL_QUERY)
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text: query }] },
    taskType: TaskType.RETRIEVAL_QUERY,
  });
  
  const embedding = result.embedding.values;
  const embeddingArrayStr = `[${embedding.join(",")}]`;

  // 2. Truy vấn Cosine Similarity trên pgvector, lọc theo workspace_id của task
  // Vector similarity search operator in pgvector is <=> for cosine distance.
  // We join NoteEmbedding -> TaskNote -> Task to filter by workspace_id
  const similarNotes = await prisma.$queryRawUnsafe<any[]>(`
    SELECT 
      n.id AS note_id,
      t.id AS task_id,
      t.title AS task_title,
      n.content AS note_content,
      1 - (e.embedding <=> $1::vector) AS similarity
    FROM "NoteEmbedding" e
    JOIN "TaskNote" n ON e.note_id = n.id
    JOIN "Task" t ON n.task_id = t.id
    WHERE t.workspace_id = $2 AND t.is_archived = false
    ORDER BY e.embedding <=> $1::vector ASC
    LIMIT $3;
  `, embeddingArrayStr, workspaceId, limit);

  return similarNotes;
}
