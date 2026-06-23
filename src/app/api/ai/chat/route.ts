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
    const { messages, usePro, currentPath } = await req.json();

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
- Đang truy cập URL/Tab: ${currentPath || "Không xác định"}
`;

    const systemPromptContent = `Bạn là "TaskMaster AI" - Trợ lý quản lý công việc và phân tích hiệu suất cá nhân tại hệ thống SP-CyberSoft.
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

4. THUẬT TOÁN ĐÁNH GIÁ ĐỘ KHẨN CẤP CỦA CÔNG VIỆC:
   Khi người dùng yêu cầu tư vấn xem nên làm việc gì trước, hãy áp dụng "Ma trận Eisenhower" kết hợp quét Deadline, Từ khóa, và Thẻ Tags:
   - Phân loại độ gấp theo Deadline (Hạn chót):
     * Quá hạn (Overdue): ĐỎ (Tối khẩn cấp). Cần làm ngay lập tức.
     * Trong vòng 24h tới: CAM (Khẩn cấp).
     * Trong tuần này: VÀNG (Bình thường).
     * Không có ngày hạn: XÁM (Không gấp).
   - Quét Từ khóa (Keywords) trong Tiêu đề hoặc Ghi chú:
     * Cộng thêm điểm ưu tiên/khẩn cấp nếu có các từ: "gấp", "ngay", "lỗi", "bug", "fix", "sếp giục", "ASAP", "client".
   - Quét Thẻ Tags:
     * Các task mang tag "Hotfix", "Server", "Hợp đồng" luôn có độ ưu tiên cao hơn, gấp hơn các tag khác.
     * Các task mang tag "Ý tưởng" (Idea), "UI/UX", "Đọc tài liệu" có độ ưu tiên thấp hơn (ít gấp hơn).
   - Phân loại Ma trận Eisenhower:
     * Tối khẩn cấp (Làm ngay): Các task ĐÃ QUÁ HẠN hoặc hết hạn trong vòng 24 giờ tới, hoặc các task chứa từ khóa khẩn cấp hoặc mang tag ưu tiên cao (Hotfix, Server, Hợp đồng).
     * Quan trọng nhưng chưa gấp (Lên lịch): Các task có deadline trong 3-7 ngày tới.
     * Không gấp, không quan trọng (Làm cuối): Task không có deadline, hoặc tag thuộc loại "Ý tưởng", "UI/UX", "Tham khảo".
     * Task nhẹ nhàng (Quick wins): Nếu user nói họ đang mệt hoặc chỉ có ít thời gian, hãy quét tìm các task có tiêu đề ngắn, các task mang tính chất thủ tục (Gửi email, check tin nhắn, gửi báo cáo) để đề xuất họ làm trước lấy động lực.

5. SỰ THẤU CẢM VÀ QUẢN LÝ QUÁ TẢI (BURNOUT MANAGEMENT):
   Nếu người dùng than phiền "mệt mỏi", "stress", "ngập đầu" hoặc quá tải trước bảng Kanban nhiều task:
   - Hãy an ủi họ 1 câu ngắn gọn, thể hiện sự thấu cảm.
   - Tuyệt đối không được liệt kê một danh sách dài dằng dặc (như 10 hay 20 task) bắt họ làm.
   - CHỈ đề xuất duy nhất 1 công việc quan trọng nhất cần làm ngay lúc này để họ tập trung.
   - Chủ động đề nghị hỗ trợ dời lịch: "Nếu anh/chị mệt, tôi có thể tự động dời các task không gấp sang tuần sau. Anh/chị có muốn tôi làm vậy không?"

6. GIẢI THÍCH VÀ HIỂU HỆ THỐNG:
   - Bạn hiểu biết sâu sắc và giải thích chi tiết toàn bộ về hệ thống SP-CyberSoft Check-in Tool cho người dùng:
     * Workspace (Không gian làm việc): Có 4 loại: PERSONAL (Cá nhân), TECH (Kỹ thuật công ty), WEBSITE (Website công ty), CUSTOM (Tự tạo bởi user).
     * Check-in bài viết: Nhân sự liên kết link bài viết Facebook cá nhân (auto-check) hoặc upload ảnh chụp màn hình check-in (manual-check) để xác minh công việc hoàn thành.
     * Quản lý task: Kanban & List view, quản lý tags, chỉnh sửa, lưu trữ nháp ghi chú (Quick Note).
     * Điểm uy tín (Trust Score) và Sao hy vọng (Hope Stars) nhận được từ các checkin chuẩn.

7. HỖ TRỢ THEO NGỮ CẢNH (TAB/PAGE CONTEXT) & KỊCH BẢN CỤ THỂ:
   - Khi người dùng đang ở tab/URL nào, bạn hãy ưu tiên trả lời và cung cấp các công cụ tương ứng.
   - TRANG QUẢN LÝ CÔNG VIỆC (/tasks): Dùng các hàm liệt kê task quá hạn, lấy danh sách hôm nay, đánh giá hiệu suất.
   - TRANG BÁO CÁO (/reports): 
     * Khi hỏi "Có thể kiểm tra các công việc tôi đã hoàn thành trong tháng này không?": Hãy lấy danh sách task đã hoàn thành trong tháng, kết hợp ước lượng số bài đã share.
     * Khi hỏi "Hiệu suất tổng quan tháng này thế nào?": Hãy đưa ra đánh giá khách quan dựa trên dữ liệu.
   - TRANG LỊCH BIỂU (/timetable):
     * Khi hỏi "Lịch làm việc hôm nay của tôi có gì?": Liệt kê task hôm nay, ĐỒNG THỜI hỏi người dùng có cần bổ sung thêm công việc gì không. Nếu có, nhận list bổ sung và tạo task mới vào workspace cá nhân (Personal). LƯU Ý QUAN TRỌNG: Tuyệt đối không được thêm, hiển thị hay đề xuất "giờ nghỉ trưa" vào lịch.
     * Khi hỏi "Giúp tôi soạn báo cáo công việc cuối ngày của hôm nay": Lấy lịch sử công việc hoàn thành trong ngày (hàm get_daily_summary) và soạn thành một báo cáo chuyên nghiệp.
   - TRANG CHUNG / DASHBOARD MẶC ĐỊNH:
     * Khi hỏi "Tóm tắt công việc hôm nay của tôi?": Lấy danh sách task được assign trong hôm nay, sắp xếp theo mức độ ưu tiên và deadline.
     * Khi hỏi "Chỉ số hiệu suất hiện tại của tôi?": Tóm tắt ngắn gọn.
     * Khi hỏi "Có task nào khẩn cấp cần xử lý không?": Quét các task quá hạn hoặc deadline gần nhất.

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
      },
      {
        type: "function",
        function: {
          name: "get_tasks",
          description: "Lấy danh sách các task công việc của người dùng theo bộ lọc (overdue: quá hạn, today: trong hôm nay, all: tất cả).",
          parameters: {
            type: "object",
            properties: {
              filter: { type: "string", enum: ["overdue", "today", "all"], description: "Bộ lọc cần lấy" }
            },
            required: ["filter"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_task",
          description: "Tạo một task công việc mới cho người dùng.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Tiêu đề công việc" },
              due_date: { type: "string", description: "Ngày hết hạn (định dạng YYYY-MM-DD)" },
              workspace_id: { type: "string", description: "ID của Workspace. Nếu không truyền, hệ thống sẽ tự động tạo ở Workspace Cá nhân mặc định." }
            },
            required: ["title"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "reschedule_task",
          description: "Đổi ngày hạn (deadline) của một công việc.",
          parameters: {
            type: "object",
            properties: {
              task_id: { type: "string", description: "ID của task cần dời lịch" },
              new_date: { type: "string", description: "Ngày hết hạn mới (định dạng YYYY-MM-DD)" }
            },
            required: ["task_id", "new_date"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "summarize_completed_tasks",
          description: "Lấy danh sách các task đã hoàn thành (DONE) trong khoảng thời gian để báo cáo hiệu suất (today: hôm nay, week: tuần này, month: tháng này).",
          parameters: {
            type: "object",
            properties: {
              date_range: { type: "string", enum: ["today", "week", "month"], description: "Khoảng thời gian muốn xem" }
            },
            required: ["date_range"]
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
          } else if (fnName === "get_tasks") {
            const { filter } = fnArgs;
            const userWorkspaces = await db.workspace.findMany({ 
              where: {
                OR: [
                  { owner_id: userId },
                  { name: { in: ["Tech", "Website", "Web"] } },
                  { collaborators: { some: { user_id: userId } } }
                ]
              }, 
              select: { id: true } 
            });
            const userWsIds = userWorkspaces.map(w => w.id);
            let whereClause: any = {
              is_archived: false,
              workspace_id: { in: userWsIds }
            };

            const now = new Date();
            const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" });
            const dateStr = formatter.format(now);
            const startOfDay = new Date(`${dateStr}T00:00:00.000+07:00`);
            const endOfDay = new Date(`${dateStr}T23:59:59.999+07:00`);

            if (filter === "overdue") {
              whereClause.due_date = { lt: now };
              whereClause.status = { not: "DONE" };
            } else if (filter === "today") {
              whereClause.due_date = {
                gte: startOfDay,
                lte: endOfDay
              };
            }

            const tasks = await db.task.findMany({
              where: whereClause,
              include: {
                tags: true,
                workspace: { select: { id: true, name: true, type: true } }
              },
              orderBy: { due_date: "asc" }
            });

            result = JSON.stringify({
              tasks: tasks.map(t => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
                due_date: t.due_date,
                workspace_id: t.workspace.id,
                workspace_name: t.workspace.name,
                workspace_type: t.workspace.type,
                tags: t.tags.map(tag => ({ id: tag.id, name: tag.name }))
              }))
            });
          } else if (fnName === "create_task") {
            const { title, due_date, workspace_id } = fnArgs;
            let targetWorkspaceId = workspace_id;
            if (!targetWorkspaceId) {
              const personalWs = await db.workspace.findFirst({
                where: { owner_id: userId, type: "PERSONAL" }
              });
              if (!personalWs) {
                result = JSON.stringify({ error: "Không tìm thấy không gian Cá nhân để tạo task." });
              } else {
                targetWorkspaceId = personalWs.id;
              }
            }

            if (targetWorkspaceId) {
              // Auto-append default tags for Tech and Website workspaces
              const ws = await db.workspace.findUnique({ where: { id: targetWorkspaceId } });
              let finalTags: any[] = [];
              if (ws) {
                if (ws.name === "Tech") {
                  let techTag = await db.tag.findFirst({ where: { workspace_id: ws.id, name: "Tech" } });
                  if (!techTag) {
                    techTag = await db.tag.create({
                      data: { name: "Tech", color: "#3b82f6", workspace_id: ws.id, user_id: userId }
                    });
                  }
                  finalTags.push({ id: techTag.id });
                } else if (ws.name === "Website" || ws.name === "Web") {
                  let webTag = await db.tag.findFirst({ where: { workspace_id: ws.id, name: "Web" } });
                  if (!webTag) {
                    webTag = await db.tag.create({
                      data: { name: "Web", color: "#10b981", workspace_id: ws.id, user_id: userId }
                    });
                  }
                  finalTags.push({ id: webTag.id });
                }
              }

              const task = await db.task.create({
                data: {
                  title,
                  status: "TODO",
                  due_date: due_date ? new Date(due_date) : null,
                  workspace_id: targetWorkspaceId,
                  creator_id: userId,
                  tags: finalTags.length > 0 ? {
                    connect: finalTags
                  } : undefined
                },
                include: {
                  tags: true,
                  workspace: true
                }
              });

              result = JSON.stringify({
                success: true,
                message: `Tạo task "${task.title}" thành công trong không gian "${task.workspace.name}".`,
                task: {
                  id: task.id,
                  title: task.title,
                  due_date: task.due_date,
                  status: task.status,
                  workspace: task.workspace.name
                }
              });
            }
          } else if (fnName === "reschedule_task") {
            const { task_id, new_date } = fnArgs;
            const task = await db.task.findUnique({
              where: { id: task_id },
              include: { workspace: true }
            });

            if (!task) {
              result = JSON.stringify({ error: "Không tìm thấy công việc này." });
            } else {
              const updated = await db.task.update({
                where: { id: task_id },
                data: { due_date: new_date ? new Date(new_date) : null },
                include: { workspace: true }
              });
              result = JSON.stringify({
                success: true,
                message: `Đã dời deadline của task "${updated.title}" sang ngày ${new_date || "Không giới hạn"}.`,
                task: {
                  id: updated.id,
                  title: updated.title,
                  due_date: updated.due_date,
                  workspace: updated.workspace.name
                }
              });
            }
          } else if (fnName === "summarize_completed_tasks") {
            const { date_range } = fnArgs;
            const now = new Date();
            const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" });
            const dateStr = formatter.format(now);
            const todayStart = new Date(`${dateStr}T00:00:00.000+07:00`);

            let startDate = todayStart;
            if (date_range === "week") {
              const vnTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
              const currentDay = vnTime.getDay(); // 0 is Sunday, 1 is Monday, ...
              const diff = vnTime.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
              const startOfWeek = new Date(vnTime.setDate(diff));
              const weekStartStr = formatter.format(startOfWeek);
              startDate = new Date(`${weekStartStr}T00:00:00.000+07:00`);
            } else if (date_range === "month") {
              const vnTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
              const startOfMonth = new Date(vnTime.getFullYear(), vnTime.getMonth(), 1);
              const monthStartStr = formatter.format(startOfMonth);
              startDate = new Date(`${monthStartStr}T00:00:00.000+07:00`);
            }

            const tasks = await db.task.findMany({
              where: {
                creator_id: userId,
                status: "DONE",
                is_archived: false,
                updatedAt: { gte: startDate }
              },
              include: {
                workspace: { select: { name: true } }
              },
              orderBy: { updatedAt: "desc" }
            });

            result = JSON.stringify({
              count: tasks.length,
              tasks: tasks.map(t => ({
                id: t.id,
                title: t.title,
                completed_at: t.updatedAt,
                workspace: t.workspace.name
              }))
            });
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
              const words = fallbackText.split(" ");
              for (let i = 0; i < words.length; i++) {
                controller.enqueue(encoder.encode(words[i] + (i < words.length - 1 ? " " : "")));
                await new Promise(resolve => setTimeout(resolve, 20));
              }
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
