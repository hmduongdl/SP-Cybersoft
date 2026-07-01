import { NextRequest, NextResponse } from "next/server";
import { searchSimilarNotes } from "@/lib/rag-helper";
import { aibox, MODEL_CHAT_FLASH } from "@/lib/aibox";

export async function POST(req: NextRequest) {
  try {
    const { message, workspaceId, history } = await req.json();

    if (!message || !workspaceId) {
      return NextResponse.json({ error: "Missing message or workspaceId" }, { status: 400 });
    }

    // 1. Tìm ngữ cảnh từ RAG
    const similarNotes = await searchSimilarNotes(message, workspaceId, 5);

    // 2. Format Context
    let contextString = "";
    if (similarNotes && similarNotes.length > 0) {
      contextString = similarNotes
        .map(
          (note, index) =>
            `[Tài liệu ${index + 1}]\n- ID Công việc: ${note.task_id}\n- Tên công việc: ${note.task_title}\n- Ghi chú: ${note.note_content}`
        )
        .join("\n\n");
    } else {
      contextString = "Không có thông tin ghi chú nào liên quan trong workspace này.";
    }

    // 3. Xây dựng System Prompt
    const systemPrompt = `Bạn là trợ lý ảo cá nhân quản lý công việc, thông minh và thân thiện.
Nhiệm vụ của bạn là trả lời câu hỏi của người dùng dựa trên thông tin ngữ cảnh được cung cấp bên dưới.
Nếu câu hỏi không nằm trong ngữ cảnh, hãy dùng kiến thức chung để trả lời nhưng nhớ báo cho người dùng biết là bạn không tìm thấy dữ liệu trong ghi chú.

YÊU CẦU ĐẶC BIỆT:
- Khi bạn trích dẫn hoặc nhắc đến một công việc cụ thể lấy từ ngữ cảnh, bạn PHẢI trích nguồn dưới dạng "[task:MÃ_ID_CÔNG_VIỆC]" (ví dụ: [task:12345-abcde...]).
- LUÔN trả lời cực kỳ ngắn gọn, đúng trọng tâm, tối đa 2-3 câu.
- TUYỆT ĐỐI KHÔNG dùng bảng biểu (markdown tables) trong câu trả lời. Chỉ dùng bullet list ngắn hoặc văn xuôi.

--- NGỮ CẢNH TÌM ĐƯỢC ---
${contextString}
-------------------------`;

    // 4. Khởi tạo DeepSeek Flash model qua ai-box
    const response = await aibox.chat.completions.create({
      model: MODEL_CHAT_FLASH,
      messages: [
        { role: "system", content: systemPrompt },
        ...(history?.map((msg: any) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        })) || []),
        { role: "user", content: message },
      ],
      stream: true,
      max_tokens: 1000,
    });

    // 5. Pipe luồng dữ liệu (SSE)
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const chunkText = chunk.choices?.[0]?.delta?.content || "";
            if (chunkText) {
              controller.enqueue(`data: ${JSON.stringify({ content: chunkText })}\n\n`);
            }
          }
          controller.enqueue("data: [DONE]\n\n");
          controller.close();
        } catch (err) {
          console.error("Lỗi khi truyền stream:", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Streaming error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}