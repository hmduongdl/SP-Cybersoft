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

    // Tạm thời disable AI Chat cho user thường không có quyền admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Tính năng AI Chat hiện đang tạm khóa đối với thành viên để phục vụ quá trình bảo trì/huấn luyện." },
        { status: 403 }
      );
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
      select: { name: true, department: true }
    });

    const userName = dbUser?.name || session.user.name || "Thành viên";
    const userDept = dbUser?.department || "Other";

    // 4.2. Truy vấn các bài đăng (Posts) đang hoạt động trong vòng 24h qua
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activePosts = await db.post.findMany({
      where: {
        start_at: { gte: oneDayAgo },
        is_archived: false,
      },
      select: {
        id: true,
        title: true,
        url: true,
        start_at: true,
        checkins: {
          where: { user_id: userId },
          select: { status: true, reject_reason: true },
        },
      },
    });

    // 4.3. Phân loại tasks của User để làm Context cho AI
    const completedTasks = activePosts.filter(p => p.checkins.length > 0 && p.checkins[0].status !== "REJECTED");
    const pendingTasks = activePosts.filter(p => p.checkins.length === 0);
    const rejectedTasks = activePosts.filter(p => p.checkins.length > 0 && p.checkins[0].status === "REJECTED");

    // 4.4. Xây dựng chuỗi Context thời gian thực
    const realTimeContext = `
[THÔNG TIN THỜI GIAN THỰC TỪ HỆ THỐNG]
- Người dùng đang chat: ${userName}
- Phòng ban: ${userDept}
- Thời gian hệ thống hiện tại: ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
- Tình hình thực hiện nhiệm vụ Like & Share của người dùng hôm nay:
  * Số nhiệm vụ cần làm (trong 24h qua): ${activePosts.length} bài.
  * Số bài ĐÃ HOÀN THÀNH: ${completedTasks.length} bài. ${completedTasks.map(t => `(Tiêu đề: "${t.title}", Trạng thái: ${t.checkins[0].status})`).join(", ")}
  * Số bài CHƯA HOÀN THÀNH (Cần share ngay): ${pendingTasks.length} bài. ${pendingTasks.map(t => `(Tiêu đề: "${t.title}", Link gốc: ${t.url})`).join(", ")}
  * Số bài BỊ TỪ CHỐI (Cần nộp lại bằng chứng): ${rejectedTasks.length} bài. ${rejectedTasks.map(t => `(Tiêu đề: "${t.title}", Lý do từ chối: ${t.checkins[0].reject_reason || "Không có lý do cụ thể"})`).join(", ")}
`;

    const systemPromptContent = `Bạn là "Trợ lý AI TeamSync" - một trợ lý ảo thông minh, thân thiện và tận tụy, chuyên hỗ trợ truyền thông nội bộ và giám sát công việc Like & Share bài viết cho doanh nghiệp Kinetic HR (hay còn gọi là TeamSync HR).

Nhiệm vụ của bạn:
1. Giải đáp thắc mắc của nhân viên về các bài viết cần chia sẻ.
2. Hướng dẫn nhân viên cách lấy link, cách chụp màn hình đúng chuẩn (chế độ công khai quả địa cầu, không mờ nhòe).
3. Báo cáo nhanh cho nhân viên biết họ còn bao nhiêu bài chưa nộp bằng chứng check-in, bài nào sắp hết hạn 24h.
4. Hướng dẫn Admin cách duyệt bài, cách xuất file Excel, cách sử dụng tính năng AI Scan kiểm chéo ảnh.

Luật lệ nghiệp vụ tối cao của hệ thống (Bạn phải ghi nhớ để trả lời chính xác):
- Thời hạn check-in: Đúng 24 tiếng kể từ khi Admin lên lịch bài viết (start_at). Quá 24h hệ thống sẽ khóa nộp bài tự động.
- Cơ chế EXIF: Ảnh tải lên từ thiết bị di động có chứa thông tin ngày giờ chụp (DateTimeOriginal) khớp với cửa sổ 24h sẽ được tự động duyệt (AUTO_APPROVED).
- Trạng thái PENDING: Nếu ảnh chụp bằng máy tính (không có EXIF) hoặc ảnh bị xóa metadata, bài nộp sẽ chuyển sang trạng thái PENDING chờ Admin duyệt thủ công. Admin sẽ soi ảnh hoặc click vào link profile Facebook cá nhân của nhân sự để kiểm tra chéo.
- Tính năng AI Scan: Chỉ chạy khi Admin chủ động bấm nút "AI Kiểm tra" trên hàng đợi duyệt. AI Scan sử dụng mô hình Vision để đọc ảnh chụp màn hình, đối chiếu link bài gốc và chấm điểm tin cậy từ 0 đến 100%.

Giọng điệu và phong cách:
- Chuyên nghiệp, lịch sự, sử dụng ngôn từ công sở thân thiện, ấm áp.
- Trả lời ngắn gọn, scannable (dùng gạch đầu dòng, bôi đậm các mốc thời gian quan trọng).
- Tuyệt đối không ảo tưởng số liệu. Nếu không được cung cấp dữ liệu động về tasks của user, hãy lịch sự báo: "Hiện tại tôi chưa nhận được dữ liệu tasks thời gian thực của bạn từ hệ thống, bạn vui lòng f5 hoặc liên hệ HR nhé!".
- Nếu nhận được các câu hỏi ngoài lề (không liên quan đến truyền thông nội bộ, Like & Share bài viết, hoặc hệ thống Kinetic HR), hãy lịch sự từ chối và hướng người dùng quay lại chủ đề chính.`;

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

    // 8. Gọi AI-Box với streaming (dùng payload thay vì messages gốc)
    const response = await aibox.chat.completions.create({
      model,
      messages: payload,
      max_tokens: maxTokens,
      stream: true,
    });

    const encoder = new TextEncoder();
    let outputChars = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              outputChars += content.length;
              controller.enqueue(encoder.encode(content));
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
