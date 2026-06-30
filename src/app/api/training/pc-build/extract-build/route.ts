import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { codexAI, defaultAI, moonshotAI, MODEL_VISION_ONLY, MODEL_CHAT_FLASH, MODEL_CHAT_PRO } from "@/lib/aibox";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
    const pc_task_id = typeof body.pc_task_id === "string" ? body.pc_task_id.trim() : "";

    if (!imageBase64) {
      return NextResponse.json({ error: "Không tìm thấy dữ liệu ảnh" }, { status: 400 });
    }

    const imageUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

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

    // 1. Call Kimi/Gemini Vision to extract the items as a list of raw elements (Accountant Role)
    let extractedRaw: any = null;
    let extractionError: any = null;

    const extractionAttempts = [
      // Attempt 1: Direct Moonshot (Kimi) if configured (Uploads to Kimi Files API first to avoid base64 unsupported errors)
      async () => {
        if (!process.env.MOONSHOT_API_KEY) {
          throw new Error("No MOONSHOT_API_KEY configured for extract-build");
        }
        console.log("[extract-build] Attempting extraction with direct Moonshot Kimi API via files upload...");
        
        const base64Data = imageUrl.split(",")[1] || imageUrl;
        const buffer = Buffer.from(base64Data, "base64");
        
        const formData = new FormData();
        const blob = new Blob([buffer], { type: "image/jpeg" });
        formData.append("file", blob, "invoice.jpg");
        formData.append("purpose", "extract");

        const fileRes = await fetch("https://api.moonshot.cn/v1/files", {
          method: "POST",
          headers: { "Authorization": `Bearer ${process.env.MOONSHOT_API_KEY}` },
          body: formData
        });

        if (!fileRes.ok) {
          const errText = await fileRes.text();
          throw new Error(`Kimi File Upload failed: ${errText}`);
        }

        const fileData = await fileRes.json();
        const fileId = fileData.id;
        console.log(`[extract-build] Uploaded file to Moonshot, ID: ${fileId}`);

        try {
          const response = await moonshotAI.chat.completions.create({
            model: "kimi-k2.5",
            messages: [
              {
                role: "system",
                content: `Bạn là trợ lý kế toán chuyên nghiệp. Hãy phân tích hình ảnh báo giá này, trích xuất tất cả các mục linh kiện, đơn giá, số lượng và thành tiền. 
                Trả về kết quả dưới định dạng JSON cấu trúc sau: 
                { "items": [{ "name": "...", "quantity": 0, "price": 0, "total": 0 }], "currency": "VND", "total_amount": 0 }
                If thông tin nào không rõ ràng, hãy để là null.`
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Trích xuất thông tin từ bảng báo giá này:" },
                  { type: "image_url", image_url: { url: fileId } }
                ]
              }
            ],
            max_tokens: 4000,
          });

          // Cleanup
          fetch(`https://api.moonshot.cn/v1/files/${fileId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${process.env.MOONSHOT_API_KEY}` }
          }).catch(() => {});

          const aiContent = response.choices[0]?.message?.content || "{}";
          return cleanAndParseJSON(aiContent);
        } catch (compErr) {
          fetch(`https://api.moonshot.cn/v1/files/${fileId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${process.env.MOONSHOT_API_KEY}` }
          }).catch(() => {});
          throw compErr;
        }
      },

      // Attempt 3: defaultAI (API Box default key)
      async () => {
        console.log("[extract-build] Attempting extraction with defaultAI (API Box Main)...");
        
        const modelsToTry = [MODEL_VISION_ONLY, "gpt-4o-mini", "gemini-1.5-flash"];
        let lastErr: any = null;

        for (const model of modelsToTry) {
          try {
            console.log(`[extract-build] trying model ${model} with defaultAI...`);
            const response = await defaultAI.chat.completions.create({
              model: model,
              messages: [
                {
                  role: "system",
                  content: `Bạn là trợ lý kế toán chuyên nghiệp. Hãy phân tích hình ảnh báo giá này, trích xuất tất cả các mục linh kiện, đơn giá, số lượng và thành tiền. 
                  Trả về kết quả dưới định dạng JSON cấu trúc sau: 
                  { "items": [{ "name": "...", "quantity": 0, "price": 0, "total": 0 }], "currency": "VND", "total_amount": 0 }
                  If thông tin nào không rõ ràng, hãy để là null.`
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: "Trích xuất thông tin từ bảng báo giá này:" },
                    { type: "image_url", image_url: { url: imageUrl } }
                  ]
                }
              ],
              max_tokens: 4000,
            });
            const aiContent = response.choices[0]?.message?.content || "{}";
            const parsed = cleanAndParseJSON(aiContent);
            if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
              return parsed;
            }
          } catch (e: any) {
            console.warn(`[extract-build] defaultAI model ${model} failed:`, e.message || e);
            lastErr = e;
          }
        }
        throw lastErr || new Error("All models failed on defaultAI");
      }
    ];

    for (const attempt of extractionAttempts) {
      try {
        extractedRaw = await attempt();
        if (extractedRaw && Array.isArray(extractedRaw.items) && extractedRaw.items.length > 0) {
          extractionError = null;
          console.log("[extract-build] Successfully extracted raw parts from image.");
          break;
        }
      } catch (err: any) {
        console.warn("[extract-build] Extraction attempt failed:", err.message || err);
        extractionError = err;
      }
    }

    if (!extractedRaw || !Array.isArray(extractedRaw.items)) {
      throw new Error(`Tất cả các cổng trích xuất AI Vision đều thất bại. Lỗi cuối cùng: ${extractionError?.message || "Không xác định"}`);
    }

    // 2. Load Task or Exercise requirements
    let expectedBudget = 0;
    let expectedNeed = "Không có";
    let expectedReqs = "Không có";

    if (pc_task_id) {
      // Try pcBuildTask table first
      const task = await db.pcBuildTask.findUnique({ where: { id: pc_task_id } });
      if (task) {
        expectedBudget = task.max_budget;
        expectedNeed = task.customer_need;
        expectedReqs = task.requirements;
      } else {
        // Try pcExercise table instead
        const exercise = await db.pcExercise.findUnique({ where: { id: pc_task_id } });
        if (exercise) {
          const reqs = exercise.requirements as any;
          expectedBudget = Number(reqs?.budget) || 0;
          expectedNeed = `${exercise.title} - ${exercise.description} (${reqs?.useCase || ""})`;
          expectedReqs = `Ràng buộc: ${Array.isArray(reqs?.constraints) ? reqs.constraints.join(", ") : ""}. Gợi ý: ${Array.isArray(reqs?.hints) ? reqs.hints.join(", ") : ""}`;
        }
      }
    }

    // 3. Call DeepSeek to match and classify raw extracted items & perform compatibility check
    const DEEPSEEK_PROMPT = `
Bạn là hệ thống tự động hóa phân loại và duyệt cấu hình PC của công ty SP-CyberSoft.
Nhiệm vụ của bạn là phân tích danh sách linh kiện thô trích xuất từ hóa đơn (dưới dạng JSON), phân loại chúng vào các danh mục biểu mẫu chuẩn, tính toán tổng giá tiền và kiểm tra kỹ thuật khả năng tương thích của cấu hình, so sánh với đề bài.

DỮ LIỆU ĐỀ BÀI (NẾU CÓ):
- Nhu cầu khách hàng: "${expectedNeed}"
- Ngân sách tối đa: ${expectedBudget > 0 ? expectedBudget.toLocaleString('vi-VN') + ' VNĐ' : 'Không giới hạn'}
- Yêu cầu cấu hình khác: "${expectedReqs}"

LINH KIỆN THÔ TRÍCH XUẤT TỪ HÓA ĐƠN:
${JSON.stringify(extractedRaw, null, 2)}

NHIỆM VỤ CỦA BẠN:
1. Phân loại linh kiện:
   Duyệt qua danh sách linh kiện thô từ hóa đơn và phân loại chuẩn xác vào các danh mục sau:
   - cpu, mainboard, ram, vga, ssd, psu, case, cooler_fan, monitor, keyboard_mouse, headphone, desk_chair.
   Trả về thông tin dưới dạng: { "name": "Tên chi tiết linh kiện", "price": số_tiền (chỉ lấy số nguyên, ví dụ: 2500000) }.
   Nếu danh mục nào không có hoặc không được đề cập trong hóa đơn, hãy để mặc định là { "name": "", "price": 0 }.
   Lưu ý:
   - Danh mục keyboard_mouse có thể kết hợp từ Bàn phím và Chuột trong hóa đơn nếu cả hai cùng xuất hiện.
   - Các linh kiện phụ kiện như headphone hay bàn ghế (furniture) nếu có hãy xếp vào headphone hoặc desk_chair tương ứng.
2. Kiểm tra kỹ thuật tương thích phần cứng:
   Hãy đánh giá tính tương thích và hợp lệ dựa trên các yếu tố sau:
   a. Socket (CPU & Mainboard): Ví dụ LGA1700 của Intel đi với main H610/B760/Z790; AM5 của AMD đi với main A620/B650; LGA1200 đi với main H410/H510/B460/B560,... CPU và Mainboard có tương thích socket không?
   b. RAM (DDR4/DDR5 & Mainboard): RAM DDR4 chỉ lắp được mainboard DDR4, RAM DDR5 chỉ lắp được mainboard DDR5. Đọc tên mainboard và RAM xem có bị lệch thế hệ DDR không?
   c. Power (Nguồn PSU & VGA/CPU): Công suất nguồn có đủ tải cho CPU + VGA không? (Ví dụ: i5 + RTX 4060 cần nguồn từ 550W trở lên; i7 + RTX 4070 cần nguồn từ 650W trở lên; cấu hình văn phòng không VGA rời cần nguồn 350W-450W trở lên).
   d. Case Size & Mainboard: Kích thước vỏ case có vừa với mainboard không? (Ví dụ main ATX lắp vào case Mini-ITX là không vừa).
   e. Budget (Ngân sách & Chênh lệch giá): Tổng giá thực tế có vượt ngân sách tối đa không? Cho phép vượt quá ngân sách tối đa của đề bài một chút từ 100,000 VND đến 200,000 VND (nếu vượt trong khoảng này đặt trạng thái check budget là "WARN" kèm giải thích, nếu vượt quá 200,000 VND mới đặt là "FAIL"). Giá của linh kiện so với giá thị trường chung có bị chênh lệch/đội giá vô lý không?
3. Đánh giá duyệt cấu hình (chỉ áp dụng nếu có đề bài):
   - Đặt "isApproved": true nếu thỏa mãn: tổng giá <= ngân sách + 200,000 VND (cho phép chênh lệch vượt tối đa 200k), các linh kiện tương thích tốt (không bị FAIL các kiểm tra socket, ram, psu), và đáp ứng được nhu cầu khách hàng. Ngược lại đặt false.
   - Ghi nhận xét ngắn gọn trong "reason".

BẮT BUỘC TRẢ VỀ JSON THEO ĐỊNH DẠNG SAU:
{
  "matched_parts": {
    "cpu": { "name": "...", "price": 0 },
    "mainboard": { "name": "...", "price": 0 },
    "ram": { "name": "...", "price": 0 },
    "vga": { "name": "...", "price": 0 },
    "ssd": { "name": "...", "price": 0 },
    "psu": { "name": "...", "price": 0 },
    "case": { "name": "...", "price": 0 },
    "cooler_fan": { "name": "...", "price": 0 },
    "monitor": { "name": "...", "price": 0 },
    "keyboard_mouse": { "name": "...", "price": 0 },
    "headphone": { "name": "...", "price": 0 },
    "desk_chair": { "name": "...", "price": 0 },
    "total_price": 0
  },
  "isApproved": boolean,
  "reason": "Giải thích tổng quan lý do duyệt hoặc từ chối ngắn gọn bằng tiếng Việt",
  "checks": {
    "socket": { "status": "PASS" | "FAIL" | "WARN", "message": "Thông điệp nhận xét về Socket CPU & Main" },
    "ram": { "status": "PASS" | "FAIL" | "WARN", "message": "Thông điệp nhận xét về tương thích RAM DDR4/DDR5" },
    "power": { "status": "PASS" | "FAIL" | "WARN", "message": "Thông điệp nhận xét về công suất nguồn PSU" },
    "case": { "status": "PASS" | "FAIL" | "WARN", "message": "Thông điệp nhận xét về kích thước vỏ case & mainboard" },
    "budget": { "status": "PASS" | "FAIL" | "WARN", "message": "Thông điệp nhận xét về ngân sách và chênh lệch giá tiền" }
  }
}
`;

    let result: any = null;
    let compatibilityError: any = null;

    const compatibilityAttempts = [
      // Attempt 1: DeepSeek Flash (API Box)
      async () => {
        console.log("[extract-build] Attempting compatibility check with DeepSeek Flash...");
        const response = await defaultAI.chat.completions.create({
          model: MODEL_CHAT_FLASH,
          messages: [{ role: "user", content: DEEPSEEK_PROMPT }],
          response_format: { type: "json_object" },
        });
        const content = response.choices[0]?.message?.content || "{}";
        return JSON.parse(content);
      },
      // Attempt 2: DeepSeek Pro (API Box)
      async () => {
        console.log("[extract-build] Attempting compatibility check with DeepSeek Pro...");
        const response = await defaultAI.chat.completions.create({
          model: MODEL_CHAT_PRO,
          messages: [{ role: "user", content: DEEPSEEK_PROMPT }],
          response_format: { type: "json_object" },
        });
        const content = response.choices[0]?.message?.content || "{}";
        return JSON.parse(content);
      },
      // Attempt 3: Direct Moonshot (Kimi) if configured
      async () => {
        if (!process.env.MOONSHOT_API_KEY) {
          throw new Error("No MOONSHOT_API_KEY for compatibility fallback");
        }
        console.log("[extract-build] Attempting compatibility check with direct Moonshot Kimi...");
        const response = await moonshotAI.chat.completions.create({
          model: "kimi-k2.5",
          messages: [{ role: "user", content: DEEPSEEK_PROMPT }],
          response_format: { type: "json_object" },
        });
        const content = response.choices[0]?.message?.content || "{}";
        return JSON.parse(content);
      }
    ];

    for (const attempt of compatibilityAttempts) {
      try {
        result = await attempt();
        if (result && result.matched_parts && result.checks) {
          compatibilityError = null;
          console.log("[extract-build] Compatibility check completed successfully.");
          break;
        }
      } catch (err: any) {
        console.warn("[extract-build] Compatibility attempt failed:", err.message || err);
        compatibilityError = err;
      }
    }

    if (!result || !result.matched_parts || !result.checks) {
      throw new Error(`Tất cả các cổng phân tích tương thích AI đều thất bại. Lỗi cuối cùng: ${compatibilityError?.message || "Không xác định"}`);
    }

    // Format output data to include partId: "" to satisfy client types
    const formattedData: any = {};
    if (result.matched_parts) {
      for (const [key, val] of Object.entries(result.matched_parts)) {
        if (key === 'total_price') {
          formattedData[key] = val;
        } else {
          const v = val as any;
          formattedData[key] = {
            name: v.name || "",
            price: v.price || 0,
            partId: ""
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: formattedData,
      autoApprove: result.isApproved,
      reason: result.reason,
      checks: result.checks || {}
    });

  } catch (error: unknown) {
    console.error("[extract-build]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Lỗi khi trích xuất dữ liệu từ ảnh", details: message },
      { status: 500 }
    );
  }
}
