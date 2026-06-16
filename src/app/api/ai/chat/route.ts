import { NextRequest, NextResponse } from "next/server";
import { aibox, MODEL_CHAT_PRO, MODEL_CHAT_FLASH, VISION_ONLY_MODELS } from "@/lib/aibox";
import { auth } from "@/auth";
import { checkAndResetQuota, recordTokenUsage } from "@/lib/ai-quota";

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

    // 5. Ước tính chi phí token đầu vào
    const totalInputChars = prunedMessages.reduce(
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

    // 8. Gọi AI-Box với streaming (dùng prunedMessages thay vì messages gốc)
    const response = await aibox.chat.completions.create({
      model,
      messages: prunedMessages,
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
