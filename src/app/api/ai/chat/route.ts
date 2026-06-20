import { NextRequest, NextResponse } from "next/server";
import { aibox, MODEL_CHAT_PRO, MODEL_CHAT_FLASH, VISION_ONLY_MODELS } from "@/lib/aibox";
import { auth } from "@/auth";
import { checkAndResetQuota, recordTokenUsage } from "@/lib/ai-quota";
import { db } from "@/lib/db";

// ─── Constants ───────────────────────────────────────────────────────────────
const CHARACTER_LIMIT = 16000;

// ─── Sliding Window Context Pruning ─────────────────────────────────────────
/**
 * Giữ lại System Prompt ở đầu, duyệt từ tin nhắn mới nhất đến cũ nhất,
 * cộng dồn ký tự và loại bỏ các tin nhắn cũ ở giữa khi vượt quá characterLimit.
 */
function pruneMessages(messages: any[], characterLimit: number): any[] {
  if (!messages || messages.length === 0) return [];

  // Tách system messages riêng
  const systemMessages: any[] = [];
  const nonSystemMessages: any[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemMessages.push(msg);
    } else {
      nonSystemMessages.push(msg);
    }
  }

  // Duyệt từ dưới lên (mới nhất → cũ nhất), giữ lại nếu còn dung lượng
  let totalChars = systemMessages.reduce(
    (sum, m) => sum + (m.content?.length ?? 0),
    0
  );
  const keptMessages: any[] = [];

  for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
    const msg = nonSystemMessages[i];
    const contentLength = msg.content?.length ?? 0;

    if (totalChars + contentLength <= characterLimit) {
      keptMessages.unshift(msg);
      totalChars += contentLength;
    } else {
      break; // Loại bỏ các tin nhắn cũ hơn
    }
  }

  return [...systemMessages, ...keptMessages];
}

// ─── Single Message Validation ──────────────────────────────────────────────
/**
 * Kiểm tra nếu user gửi một tin nhắn đơn lẻ vượt quá hạn mức ký tự cho phép.
 */
function validateSingleMessage(messages: any[]): string | null {
  for (const msg of messages) {
    if (msg.role === "user") {
      const contentLength = msg.content?.length ?? 0;
      if (contentLength > CHARACTER_LIMIT) {
        return `Tin nhắn của bạn vượt quá giới hạn ${CHARACTER_LIMIT.toLocaleString()} ký tự. Vui lòng rút gọn nội dung trước khi gửi.`;
      }
    }
  }
  return null;
}

// ─── POST Handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // 1. Xác thực người dùng
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    const { messages, usePro } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Tin nhắn không hợp lệ." },
        { status: 400 }
      );
    }

    // 3. Kiểm tra tin nhắn đơn lẻ vượt quá hạn mức ký tự
    const validationError = validateSingleMessage(messages);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // 4. Áp dụng Sliding Window Pruning để cắt tỉa ngữ cảnh
    const prunedMessages = pruneMessages(messages, CHARACTER_LIMIT);

    // 4.1. Lấy thông tin người dùng từ Database để làm bối cảnh
    const userId = session.user.id;
    const dbUser = await db.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });
    const userName = dbUser?.name || session.user.name || "Thành viên";

    // Lấy danh sách workspace
    const userWorkspaces = await db.workspace.findMany({
      where: { owner_id: userId },
      select: { id: true, name: true, type: true }
    });
    const workspaces_list_with_types = userWorkspaces.map(w => `[ID: ${w.id}, Tên: ${w.name}, Loại: ${w.type}]`).join(", ");

    // 4.4. Xây dựng chuỗi Context thời gian thực
    const realTimeContext = `
[THÔNG TIN NGỮ CẢNH HIỆN TẠI (CONTEXT)]
- Người dùng đang chat: ${userName}
- Thời gian hiện tại: ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
- Danh sách Workspace của người dùng: ${workspaces_list_with_types}
`;

    const systemPromptContent = `Bạn là "TaskMaster AI" - Trợ lý quản lý công việc và phân tích hiệu suất cá nhân tại hệ thống SPS AI.
Nhiệm vụ của bạn là giúp người dùng quản lý thời gian, đánh giá năng suất và thực thi các lệnh thao tác công việc (đánh dấu hoàn thành, xóa task) thay cho người dùng.

LUẬT LỆ VẬN HÀNH TỐI CAO BẠN BẮT BUỘC PHẢI TUÂN THỦ:
1. QUYỀN HẠN THAO TÁC (WORKSPACE PERMISSIONS):
   - Bạn CHỈ ĐƯỢC PHÉP thực thi lệnh "Xóa task" hoặc "Chỉnh sửa nội dung task" nếu task đó thuộc không gian cá nhân (Loại: PERSONAL) hoặc không gian tự tạo (Loại: CUSTOM).
   - Tuyệt đối NGHIÊM CẤM thực thi lệnh "Xóa task" nếu task đó thuộc không gian của Công ty (Loại: WEBSITE hoặc TECH). Nếu người dùng ra lệnh xóa task ở các không gian này, bạn phải từ chối lịch sự: "Xin lỗi, đây là nhiệm vụ thuộc không gian công ty. Tôi chỉ có quyền thao tác trên không gian cá nhân của bạn để đảm bảo an toàn dữ liệu chung."
   - Bạn được phép "Đánh dấu hoàn thành (DONE)" hoặc "Chuyển trạng thái (IN_PROGRESS)" cho TẤT CẢ các task ở mọi không gian, miễn là task đó do user đang phụ trách.

2. ĐÁNH GIÁ HIỆU SUẤT (PERFORMANCE REVIEW):
   - Khi người dùng yêu cầu đánh giá tháng: Hãy sử dụng công cụ \`evaluate_monthly_performance\` để lấy dữ liệu. Hãy nhận xét khách quan, khen ngợi nếu tỷ lệ hoàn thành cao (>80%), và nhắc nhở động viên nếu có nhiều task quá hạn.
   - Khi người dùng hỏi hôm nay làm được gì: Hãy dùng công cụ \`get_daily_summary\` để liệt kê ngắn gọn các task đã chuyển sang trạng thái DONE trong ngày. Ghi nhận sự nỗ lực của họ.

3. LƯU TRỮ VÀ GHI NHỚ LỊCH SỬ:
   - Các thao tác bạn thực hiện thay người dùng sẽ tự động được hệ thống lưu vết (Audit Log). Bạn hãy báo cáo rõ với người dùng sau khi thực hiện xong: "Tôi đã đánh dấu hoàn thành task [Tên Task]. Hệ thống đã ghi nhận lịch sử của bạn."

PHONG CÁCH TRẢ LỜI:
- Quyết đoán, ngắn gọn, dùng gạch đầu dòng rõ ràng.
- Nếu không chắc chắn người dùng muốn xóa task nào, BẮT BUỘC phải hỏi lại để xác nhận tên task trước khi gọi hàm xóa.`;

    const systemPrompt = {
      role: "system",
      content: systemPromptContent
    };

    const liveContextPrompt = {
      role: "system",
      content: realTimeContext
    };

    // Tạo mảng payload gửi đi: [System Vai Trò, System Dữ liệu động, ...Lịch sử chat của user]
    const payload = [systemPrompt, liveContextPrompt, ...prunedMessages];

    // 5. Ước tính chi phí token đầu vào
    const totalInputChars = payload.reduce(
      (sum: number, msg: any) => sum + (msg.content?.length || 0),
      0
    );
    const estimatedCost = Math.ceil(totalInputChars / 2) || 1;

    // 6. Kiểm tra & tự động reset hạn mức token hàng ngày
    const quota = await checkAndResetQuota(session.user.id, estimatedCost);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: "Daily quota exceeded", message: quota.message },
        { status: 429 }
      );
    }

    // 7. Xác định model và max_tokens
    const model = usePro ? MODEL_CHAT_PRO : MODEL_CHAT_FLASH;

    // Chặn tuyệt đối việc dùng vision models (gemini) cho chat text
    if (VISION_ONLY_MODELS.includes(model)) {
      return NextResponse.json(
        { error: "Model này chỉ hỗ trợ đọc ảnh (vision), không được dùng cho chat text." },
        { status: 400 }
      );
    }

    const maxTokens = usePro ? 3000 : 1500;

    const tools = [
      {
        type: "function",
        function: {
          name: "evaluate_monthly_performance",
          description: "Lấy thống kê số lượng task hoàn thành, quá hạn và đang làm trong tháng hiện tại để đánh giá năng suất.",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "get_daily_summary",
          description: "Lấy danh sách các task mà người dùng đã đánh dấu hoàn thành (DONE) hoặc tạo mới trong ngày hôm nay.",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "update_task_status",
          description: "Đánh dấu trạng thái của một công việc (TODO, IN_PROGRESS, DONE).",
          parameters: {
            type: "object",
            properties: {
              task_id: { type: "string", description: "ID của task cần cập nhật" },
              status: { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE"] }
            },
            required: ["task_id", "status"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_task",
          description: "Xóa vĩnh viễn một công việc. Chỉ áp dụng cho task thuộc PERSONAL hoặc CUSTOM workspace.",
          parameters: {
            type: "object",
            properties: {
              task_id: { type: "string", description: "ID của task cần xóa" }
            },
            required: ["task_id"]
          }
        }
      }
    ];

    // 8. Gọi AI-Box để kiểm tra Function Calling
    let finalPayload = [...payload];
    const initialResponse = await aibox.chat.completions.create({
      model,
      messages: finalPayload,
      max_tokens: maxTokens,
      tools: tools as any,
      stream: false, // Gọi không stream trước để lấy tool calls
    });

    const choice = initialResponse.choices[0];
    let streamResponse: AsyncIterable<any> | null = null;
    let fallbackText = choice.message?.content || "";

    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      finalPayload.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const tc = toolCall as any;
        const fnName = tc.function?.name;
        const fnArgs = JSON.parse(tc.function?.arguments || "{}");
        let result = "";

        try {
          if (fnName === "evaluate_monthly_performance") {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const tasks = await db.task.findMany({ where: { creator_id: userId, createdAt: { gte: startOfMonth } } });
            const completed = tasks.filter(t => t.status === "DONE").length;
            const pending = tasks.filter(t => t.status !== "DONE").length;
            const overdue = tasks.filter(t => t.due_date && t.due_date < now && t.status !== "DONE").length;
            result = JSON.stringify({ completed, pending, overdue, total: tasks.length });
          } else if (fnName === "get_daily_summary") {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tasks = await db.task.findMany({ where: { creator_id: userId, updatedAt: { gte: startOfDay }, status: "DONE" } });
            result = JSON.stringify({ done_tasks_today: tasks.map(t => ({ id: t.id, title: t.title })) });
          } else if (fnName === "update_task_status") {
            await db.task.update({ where: { id: fnArgs.task_id }, data: { status: fnArgs.status as any } });
            result = JSON.stringify({ success: true, message: `Task ${fnArgs.task_id} updated to ${fnArgs.status}` });
          } else if (fnName === "delete_task") {
            const task = await db.task.findUnique({ where: { id: fnArgs.task_id }, include: { workspace: true } });
            if (!task) {
              result = JSON.stringify({ error: "Task not found" });
            } else if (task.workspace.type === "WEBSITE" || task.workspace.type === "TECH") {
              result = JSON.stringify({ error: "Permission denied. Cannot delete task in company workspace." });
            } else {
              await db.task.delete({ where: { id: fnArgs.task_id } });
              result = JSON.stringify({ success: true, message: "Task deleted successfully" });
            }
          }
        } catch (err: any) {
          result = JSON.stringify({ error: err.message });
        }

        finalPayload.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: fnName,
          content: result
        });
      }

      // Gọi lại với luồng stream để trả kết quả cuối cùng
      streamResponse = await aibox.chat.completions.create({
        model,
        messages: finalPayload,
        max_tokens: maxTokens,
        stream: true,
      }) as any;
    }

    const encoder = new TextEncoder();
    let outputChars = fallbackText.length;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (streamResponse) {
            outputChars = 0; // reset
            for await (const chunk of streamResponse) {
              const content = chunk.choices[0]?.delta?.content || "";
              if (content) {
                outputChars += content.length;
                controller.enqueue(encoder.encode(content));
              }
            }
          } else {
            // Stream the text that was returned from the first synchronous call
            if (fallbackText) {
              controller.enqueue(encoder.encode(fallbackText));
            }
          }
          controller.close();

          // 9. Ghi nhận token đã tiêu hao sau khi stream hoàn tất
          const tokensUsed = Math.ceil(outputChars / 2) || 1;
          await recordTokenUsage(session.user.id, tokensUsed);
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Error in AI chat API route:", error);

    const status = error?.status || 500;
    const errorMessage = error?.message || "";
    const isQuotaError =
      status === 429 ||
      status === 402 ||
      errorMessage.includes("quota") ||
      errorMessage.includes("limit") ||
      errorMessage.includes("balance") ||
      errorMessage.includes("insufficient");

    if (isQuotaError) {
      return NextResponse.json(
        {
          error: "Dịch vụ AI hiện đang quá tải hoặc hết hạn mức sử dụng. Vui lòng liên hệ Admin.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Có lỗi xảy ra khi xử lý yêu cầu chat AI. Vui lòng thử lại sau." },
      { status }
    );
  }
}
