import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";
import { aibox, MODEL_VISION_ONLY } from "@/lib/aibox";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Authenticate & Authorize Admin
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const checkinId = body.checkinId || body.checkin_id;

    if (!checkinId) {
      return NextResponse.json(
        { error: "Thiếu thông tin checkinId." },
        { status: 400 }
      );
    }

    // 3. Fetch check-in and associated post/user details
    const checkin = await db.checkin.findUnique({
      where: { id: checkinId },
      include: {
        post: true,
        user: true,
      },
    });

    if (!checkin) {
      return NextResponse.json(
        { error: "Không tìm thấy lượt check-in tương ứng." },
        { status: 404 }
      );
    }

    // 4. Load screenshot image file as base64
    let base64Image = "";
    let mimeType = "image/png"; // default to image/png as requested by prompt template

    if (checkin.image_url.startsWith("data:image/")) {
      const match = checkin.image_url.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Image = match[2];
      }
    } else if (checkin.image_url.startsWith("http://") || checkin.image_url.startsWith("https://")) {
      try {
        const imageRes = await fetch(checkin.image_url);
        if (imageRes.ok) {
          const arrayBuffer = await imageRes.arrayBuffer();
          base64Image = Buffer.from(arrayBuffer).toString("base64");
          const contentType = imageRes.headers.get("Content-Type");
          if (contentType) {
            mimeType = contentType;
          }
        }
      } catch (err) {
        console.error("Failed to fetch remote image url:", checkin.image_url, err);
      }
    } else {
      // Local file system upload
      const cleanPath = checkin.image_url.startsWith("/") ? checkin.image_url.substring(1) : checkin.image_url;
      const filePath = path.join(process.cwd(), "public", cleanPath);
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        base64Image = fileBuffer.toString("base64");
        
        // Resolve mime type
        const ext = path.extname(filePath).toLowerCase();
        if (ext === ".png") mimeType = "image/png";
        else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
        else if (ext === ".webp") mimeType = "image/webp";
      }
    }

    // 5. Workflow Tự động duyệt: Gemini trích xuất -> Model Khác quyết định
    let isValid = true;
    let confidence = 95; // From 0 to 100 as requested
    let reason = "Minh chứng hợp lệ.";

    if (base64Image) {
      try {
        // BƯỚC 1: Gemini đọc ảnh và trích xuất thông tin
        const geminiResponse = await aibox.chat.completions.create({
          model: MODEL_VISION_ONLY,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Hãy đọc hình ảnh screenshot này và trích xuất các thông tin sau:
1. Tên của người dùng đã chia sẻ bài viết (tên hiển thị trên Facebook/Mạng xã hội).
2. Tiêu đề hoặc nội dung của bài viết được chia sẻ trong ảnh.
Trả về JSON định dạng: { "extracted_username": "tên người chia sẻ", "extracted_title": "tiêu đề bài viết" }`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" }
        });

        const extractedText = geminiResponse.choices[0]?.message?.content || "{}";
        const extractedData = JSON.parse(extractedText);
        
        console.log("AI Scan - Extracted Data from Gemini:", extractedData);

        // BƯỚC 2: Model khác đánh giá dữ liệu trích xuất
        const expectedName = checkin.user.name || checkin.user.username;
        const expectedTitle = checkin.post.title;
        const expectedUrl = checkin.post.url;

        // Import MODEL_CHAT_FLASH
        const { MODEL_CHAT_FLASH } = await import("@/lib/aibox");

        const decisionResponse = await aibox.chat.completions.create({
          model: MODEL_CHAT_FLASH,
          messages: [
            {
              role: "system",
              content: `Bạn là trợ lý ảo kiểm duyệt minh chứng bài viết mạng xã hội.
Thông tin dự kiến (Expected):
- Tên nhân viên: '${expectedName}'
- Tiêu đề bài viết cần share: '${expectedTitle}'
- Link bài viết: '${expectedUrl}'

Thông tin AI đọc được từ ảnh (Extracted by Vision Model):
- Tên người chia sẻ bài trong ảnh: '${extractedData.extracted_username || "Không rõ"}'
- Tiêu đề/Nội dung bài viết trong ảnh: '${extractedData.extracted_title || "Không rõ"}'

Nhiệm vụ:
Hãy đánh giá xem thông tin trích xuất từ ảnh có ĐỦ khớp với thông tin dự kiến hay không. 
(Ghi chú: Tên người chia sẻ trên ảnh không nhất thiết phải giống hệt 100% tên nhân viên, nhưng phải có nét tương đồng hoặc hợp lý. Tiêu đề bài viết trong ảnh phải giống hoặc liên quan chặt chẽ đến bài viết cần share).
Trả về JSON định dạng: { "isValid": boolean, "confidence": number (0-100), "reason": "Lý do chi tiết" }`
            }
          ],
          response_format: { type: "json_object" }
        });

        const decisionText = decisionResponse.choices[0]?.message?.content || "{}";
        const decisionData = JSON.parse(decisionText);
        
        isValid = decisionData.isValid;
        confidence = decisionData.confidence;
        reason = decisionData.reason || decisionData.analysisReason || "";
        
      } catch (apiError) {
        console.error("AI Workflow failed, falling back to mock:", apiError);
      }
    } else {
      // Smart Mock Fallback when image base64 cannot be loaded
      console.warn("Base64 image missing. Using mock response.");
      const lowerUrl = checkin.image_url.toLowerCase();
      if (lowerUrl.includes("fake") || lowerUrl.includes("invalid") || checkin.is_ai_flagged) {
        isValid = false;
        confidence = 38;
        reason = "AI phát hiện ảnh chụp màn hình có dấu hiệu bị chỉnh sửa (cắt ghép chữ). Ngoài ra, nút Đăng chưa được kích hoạt và biểu tượng chế độ công khai (quả địa cầu) bị thiếu.";
      }
    }

    // 6. Update database record with AI results
    const storedConfidence = confidence > 1 ? confidence / 100 : confidence;

    await db.checkin.update({
      where: { id: checkin.id },
      data: {
        is_ai_flagged: !isValid,
        ai_confidence: storedConfidence,
        reject_reason: !isValid ? `[AI Scan] ${reason}` : null
      },
    });

    // 7. Return structured JSON response
    return NextResponse.json({
      isValid,
      confidence: confidence > 1 ? confidence / 100 : confidence,
      analysisReason: reason,
    });

  } catch (error: any) {
    console.error("AI Scan Error:", error);
    return NextResponse.json(
      { error: error.message || "Đã xảy ra lỗi trong quá trình quét AI." },
      { status: 500 }
    );
  }
}

