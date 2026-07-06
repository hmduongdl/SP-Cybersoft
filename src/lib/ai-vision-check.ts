/**
 * Shared AI Vision Check module.
 *
 * Dùng quy trình 2 bước:
 *  1. Gemini (vision) trích xuất: tên người share, tiêu đề bài, trạng thái công khai, giao diện FB hợp lệ.
 *  2. Flash (text) đánh giá mức khớp và cho điểm confidence.
 *
 * Dùng chung cho cả /api/checkins (auto-approve) và /api/admin/ai-scan (on-demand).
 */

import { codexAI, defaultAI, openaiAI, MODEL_VISION_ONLY, MODEL_CHAT_FLASH, MODEL_CHAT_PRO } from "@/lib/aibox";

function isCodexTimeWindow(): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      hour12: false,
    });
    const hourStr = formatter.format(now);
    const hour = parseInt(hourStr, 10);
    return hour >= 18 && hour < 20;
  } catch (e) {
    console.error("[isCodexTimeWindow] Error parsing timezone:", e);
    return false;
  }
}

export interface VisionCheckInput {
  base64Image: string;
  mimeType: string;
  expectedName: string;
  expectedTitle: string;
  expectedUrl?: string | null;
}

export interface VisionCheckResult {
  isValid: boolean;
  /** 0–1 */
  confidence: number;
  reason: string;
  extractedUsername: string | null;
  extractedTitle: string | null;
  /** Gemini phát hiện giao diện FB/mạng xã hội thật (không bị fake/cắt ghép) */
  isFacebookUI: boolean;
  /** Có hiển thị chế độ Công khai / Public trong ảnh */
  isPublicMode: boolean;
}

const VISION_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`AI vision timeout after ${ms}ms`)), ms)
    ),
  ]);
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 2000,
  factor = 2
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isTransient =
      error?.status === 429 ||
      error?.statusCode === 429 ||
      error?.message?.includes("429") ||
      error?.message?.includes("rate limit") ||
      error?.message?.includes("timeout") ||
      error?.status >= 500 ||
      !error?.status;

    if (retries > 0 && isTransient) {
      console.warn(`[Retry] AI Vision check transient error/rate-limit. Retrying in ${delayMs}ms... (Remaining: ${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return retryWithBackoff(fn, retries - 1, delayMs * factor, factor);
    }
    throw error;
  }
}

export async function runVisionCheck(
  input: VisionCheckInput
): Promise<VisionCheckResult> {
  const { base64Image, mimeType, expectedName, expectedTitle, expectedUrl } = input;

  // Helper function to extract and parse JSON from Markdown wrappers if present
  const cleanAndParseJSON = (str: string): any => {
    try {
      let cleanStr = str.trim();
      if (cleanStr.startsWith("```")) {
        const match = cleanStr.match(/^(?:```(?:json)?\n?)([\s\S]*?)(?:\n?```)$/i);
        if (match && match[1]) {
          cleanStr = match[1].trim();
        }
      }
      return JSON.parse(cleanStr);
    } catch (e) {
      console.error("[cleanAndParseJSON] Failed to parse JSON:", str, e);
      return {};
    }
  };

  // ── Bước 1: Gemini / AI Box trích xuất thông tin từ ảnh ────────────────────
  let extracted: any = null;
  let extractionError: any = null;

  const extractionAttempts = [
    // Attempt 1: Gemini 2.5 Flash (qua v98store)
    async () => {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY not configured for vision check");
      }
      console.log("[ai-vision-check] Attempting extraction via Gemini 2.5 Flash (v98store)...");

      const res = await retryWithBackoff(() =>
        withTimeout(
          openaiAI.chat.completions.create({
            model: MODEL_VISION_ONLY,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Đọc ảnh chụp màn hình này và trả về JSON với các trường sau:
1. "extracted_username": Tên hiển thị của người đã đăng/chia sẻ bài viết trong ảnh.
2. "extracted_title": Tiêu đề hoặc nội dung chính của bài viết trong ảnh.
3. "is_public_mode": true nếu ảnh hiển thị biểu tượng/chữ "Công khai" / "Public" / icon quả địa cầu (globe), ngược lại false.
4. "is_social_ui": true nếu đây là giao diện mạng xã hội thật (Facebook, Zalo, LinkedIn...) — không bị cắt ghép, chỉnh sửa hoặc giả mạo rõ ràng; false nếu nghi ngờ.
Trả về đúng định dạng JSON trong cặp dấu ngoặc nhọn, không kèm giải thích.`,
                  },
                  {
                    type: "image_url",
                    image_url: { url: `data:${mimeType};base64,${base64Image}` },
                  },
                ],
              },
            ],
            max_tokens: 1500,
          }),
          VISION_TIMEOUT_MS
        )
      );

      const aiContent = res.choices[0]?.message?.content || "{}";
      return cleanAndParseJSON(aiContent);
    },
    // Attempt 2: AI Box fallback
    async () => {
      if (!process.env.AIBOX_DEFAULT_API_KEY && !process.env.AIBOX_API_KEY && !process.env.AIBOX_CODEX_API_KEY) {
        throw new Error("No AIBOX API key configured for vision check");
      }
      console.log("[ai-vision-check] Attempting extraction via AIBOX vision (fallback)...");

      const res = await retryWithBackoff(() =>
        withTimeout(
          codexAI.chat.completions.create({
            model: MODEL_VISION_ONLY,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Đọc ảnh chụp màn hình này và trả về JSON với các trường sau:
1. "extracted_username": Tên hiển thị của người đã đăng/chia sẻ bài viết trong ảnh.
2. "extracted_title": Tiêu đề hoặc nội dung chính của bài viết trong ảnh.
3. "is_public_mode": true nếu ảnh hiển thị biểu tượng/chữ "Công khai" / "Public" / icon quả địa cầu (globe), ngược lại false.
4. "is_social_ui": true nếu đây là giao diện mạng xã hội thật (Facebook, Zalo, LinkedIn...) — không bị cắt ghép, chỉnh sửa hoặc giả mạo rõ ràng; false nếu nghi ngờ.
Trả về đúng định dạng JSON trong cặp dấu ngoặc nhọn, không kèm giải thích.`,
                  },
                  {
                    type: "image_url",
                    image_url: { url: `data:${mimeType};base64,${base64Image}` },
                  },
                ],
              },
            ],
            max_tokens: 1500,
          }),
          VISION_TIMEOUT_MS
        )
      );

      const aiContent = res.choices[0]?.message?.content || "{}";
      return cleanAndParseJSON(aiContent);
    }
  ];

  for (const attempt of extractionAttempts) {
    try {
      extracted = await attempt();
      if (extracted && (extracted.extracted_username || extracted.extracted_title)) {
        extractionError = null;
        break;
      }
    } catch (err: any) {
      console.warn("[ai-vision-check] Vision extraction attempt failed:", err.message || err);
      extractionError = err;
    }
  }

  if (!extracted) {
    throw new Error(`Tất cả các cổng AI Vision check đều thất bại. Lỗi cuối cùng: ${extractionError?.message || "Không xác định"}`);
  }

  const extractedUsername: string | null = extracted.extracted_username || null;
  const extractedTitle: string | null = extracted.extracted_title || null;
  const isFacebookUI = Boolean(extracted.is_social_ui);
  const isPublicMode = Boolean(extracted.is_public_mode);

  // ── Bước 2: Flash đánh giá mức khớp ───────────────────────────────────
  const decisionResponse = await retryWithBackoff(() => 
    withTimeout(
      defaultAI.chat.completions.create({
        model: MODEL_CHAT_FLASH,
        messages: [
          {
            role: "system",
            content: `Bạn là hệ thống kiểm duyệt minh chứng chia sẻ bài viết mạng xã hội tại công ty SP-CyberSoft.

THÔNG TIN DỰ KIẾN:
- Tên nhân viên: "${expectedName}"
- Tiêu đề bài viết cần share: "${expectedTitle}"
${expectedUrl ? `- Link bài viết: "${expectedUrl}"` : ""}

THÔNG TIN TRÍCH XUẤT TỪ ẢNH:
- Tên người chia sẻ trong ảnh: "${extractedUsername ?? "Không rõ"}"
- Tiêu đề/nội dung bài trong ảnh: "${extractedTitle ?? "Không rõ"}"
- Giao diện trông như mạng xã hội thật: ${isFacebookUI}
- Có hiển thị chế độ Công khai / Public: ${isPublicMode}

TIÊU CHÍ ĐÁNH GIÁ ĐỂ DUYỆT TỰ ĐỘNG (BẮT BUỘC):
1. TÊN NGƯỜI DÙNG: Tên người chia sẻ trong ảnh BẮT BUỘC phải trùng khớp hoặc gần giống (chứa một phần tên) với tên nhân viên (VD: "Hoang Long" với "Lê Nguyễn Hoàng Long" là HỢP LỆ). Nếu trong ảnh không có tên nhân viên này hoặc tên hoàn toàn sai lệch -> LẬP TỨC từ chối (isValid = false, confidence = 0).
2. NỘI DUNG/TIÊU ĐỀ: Tiêu đề hoặc nội dung bài trong ảnh phải tương tự với tiêu đề bài cần share trên web hoặc có chứa nội dung liên quan.
3. Nếu 2 điều kiện TÊN và NỘI DUNG trên đều hợp lệ, thì duyệt tự động luôn (isValid = true, confidence >= 90).
4. Các yếu tố khác như chế độ Công khai (is_public_mode) hoặc giao diện (is_social_ui) chỉ dùng để tham khảo, nếu tên và nội dung đã khớp thì vẫn ưu tiên DUYỆT.

Trả về JSON: { "isValid": boolean, "confidence": number (0–100), "reason": "Lý do ngắn gọn bằng tiếng Việt" }`,
          },
        ],
        response_format: { type: "json_object" },
      }),
      VISION_TIMEOUT_MS
    )
  );

  const decision = JSON.parse(
    decisionResponse.choices[0]?.message?.content || "{}"
  );

  const rawConfidence = Number(decision.confidence ?? 0);
  const confidence = Math.min(1, Math.max(0, rawConfidence > 1 ? rawConfidence / 100 : rawConfidence));

  return {
    isValid: Boolean(decision.isValid),
    confidence,
    reason: String(decision.reason || ""),
    extractedUsername,
    extractedTitle,
    isFacebookUI,
    isPublicMode,
  };
}
