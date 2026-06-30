/**
 * Shared AI Vision Check module.
 *
 * Dùng quy trình 2 bước:
 *  1. Gemini (vision) trích xuất: tên người share, tiêu đề bài, trạng thái công khai, giao diện FB hợp lệ.
 *  2. Flash (text) đánh giá mức khớp và cho điểm confidence.
 *
 * Dùng chung cho cả /api/checkins (auto-approve) và /api/admin/ai-scan (on-demand).
 */

import { codexAI, defaultAI, moonshotAI, MODEL_VISION_ONLY, MODEL_CHAT_FLASH, MODEL_CHAT_PRO } from "@/lib/aibox";

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

const VISION_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`AI vision timeout after ${ms}ms`)), ms)
    ),
  ]);
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

  // ── Bước 1: Kimi/Gemini trích xuất thông tin từ ảnh ─────────────────────────
  // ── Bước 1: Kimi/Gemini trích xuất thông tin từ ảnh ─────────────────────────
  let extracted: any = null;
  let extractionError: any = null;

  const extractionAttempts = [
    // Attempt 1: codexAI (API Box Codex Key) inside time window
    async () => {
      if (!isCodexTimeWindow()) {
        throw new Error("Codex API is restricted outside of 18:00 - 20:00 GMT+7");
      }
      console.log("[ai-vision-check] Attempting extraction with codexAI (API Box)...");
      const res = await withTimeout(
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
      );
      const aiContent = res.choices[0]?.message?.content || "{}";
      return cleanAndParseJSON(aiContent);
    },

    // Attempt 2: Direct Moonshot (Kimi) if configured
    async () => {
      if (!process.env.MOONSHOT_API_KEY) {
        throw new Error("No MOONSHOT_API_KEY configured for vision check");
      }
      console.log("[ai-vision-check] Attempting extraction with direct Moonshot Kimi API...");
      const res = await withTimeout(
        moonshotAI.chat.completions.create({
          model: "kimi-k2.5",
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
      );
      const aiContent = res.choices[0]?.message?.content || "{}";
      return cleanAndParseJSON(aiContent);
    },

    // Attempt 3: defaultAI (API Box default key)
    async () => {
      console.log("[ai-vision-check] Attempting extraction with defaultAI (API Box Main)...");
      const res = await withTimeout(
        defaultAI.chat.completions.create({
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
  const decisionResponse = await withTimeout(
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

TIÊU CHÍ ĐÁNH GIÁ:
1. Tên người share có nét tương đồng với tên nhân viên (viết tắt, nickname hay tên khác vẫn được, miễn là hợp lý).
2. Tiêu đề/nội dung bài trong ảnh phải khớp hoặc liên quan chặt chẽ đến bài cần share.
3. Nếu giao diện trông giả mạo (is_social_ui = false) → isValid = false.
4. Nếu bài không ở chế độ Công khai (is_public_mode = false) → giảm confidence xuống ≤ 60.

Trả về JSON: { "isValid": boolean, "confidence": number (0–100), "reason": "Lý do ngắn gọn bằng tiếng Việt" }`,
        },
      ],
      response_format: { type: "json_object" },
    }),
    VISION_TIMEOUT_MS
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
