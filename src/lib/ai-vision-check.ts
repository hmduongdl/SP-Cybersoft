/**
 * Shared AI Vision Check module.
 *
 * Dùng quy trình 2 bước:
 *  1. Gemini (vision) trích xuất: tên người share, tiêu đề bài, trạng thái công khai, giao diện FB hợp lệ.
 *  2. Flash (text) đánh giá mức khớp và cho điểm confidence.
 *
 * Dùng chung cho cả /api/checkins (auto-approve) và /api/admin/ai-scan (on-demand).
 */

import { aibox, MODEL_VISION_ONLY, MODEL_CHAT_FLASH } from "@/lib/aibox";

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
  const geminiResponse = await withTimeout(
    aibox.chat.completions.create({
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

  const extracted = cleanAndParseJSON(
    geminiResponse.choices[0]?.message?.content || "{}"
  );

  const extractedUsername: string | null = extracted.extracted_username || null;
  const extractedTitle: string | null = extracted.extracted_title || null;
  const isFacebookUI = Boolean(extracted.is_social_ui);
  const isPublicMode = Boolean(extracted.is_public_mode);

  // ── Bước 2: Flash đánh giá mức khớp ───────────────────────────────────
  const decisionResponse = await withTimeout(
    aibox.chat.completions.create({
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
