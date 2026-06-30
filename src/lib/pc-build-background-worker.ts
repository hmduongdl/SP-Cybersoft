import { db } from "@/lib/db";
import { codexAI, defaultAI, moonshotAI, MODEL_VISION_ONLY, MODEL_CHAT_FLASH, MODEL_CHAT_PRO } from "@/lib/aibox";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`API call timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

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
    console.error("[cleanAndParseJSON] Failed to parse:", str, e);
    return {};
  }
};

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

export async function processBackgroundPcBuild(
  id: string,
  type: "checkin" | "submission",
  imageBase64: string,
  pc_task_id: string
) {
  console.log(`[BackgroundWorker] Starting PC Build analysis for ${type} ${id}...`);

  try {
    const imageUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    // 1. Call Kimi/Gemini Vision to extract the items as a list of raw elements
    let extractedRaw: any = null;
    let extractionError: any = null;

    const extractionAttempts = [
      // Attempt 1: Direct Moonshot (Kimi API) if configured (Uploads to Kimi Files API first to avoid base64 unsupported errors)
      async () => {
        if (!process.env.MOONSHOT_API_KEY) {
          throw new Error("No MOONSHOT_API_KEY configured in environment");
        }
        console.log("[BackgroundWorker] Attempting extraction with direct Moonshot Kimi API via files upload...");
        
        // Convert base64 into standard file buffer to upload
        const base64Data = imageUrl.split(",")[1] || imageUrl;
        const buffer = Buffer.from(base64Data, "base64");
        
        const formData = new FormData();
        const blob = new Blob([buffer], { type: "image/jpeg" });
        formData.append("file", blob, "invoice.jpg");
        formData.append("purpose", "extract");

        const fileRes = await withTimeout(
          fetch("https://api.moonshot.cn/v1/files", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.MOONSHOT_API_KEY}`
            },
            body: formData
          }),
          15000 // 15s timeout for upload
        );

        if (!fileRes.ok) {
          const errText = await fileRes.text();
          throw new Error(`Kimi File Upload failed: ${errText}`);
        }

        const fileData = await fileRes.json();
        const fileId = fileData.id;
        console.log(`[BackgroundWorker] Uploaded file to Moonshot, ID: ${fileId}`);

        try {
          const response = await withTimeout(
            moonshotAI.chat.completions.create({
              model: "kimi-k2.5",
              messages: [
                {
                  role: "system",
                  content: `Bạn là trợ lý kế toán chuyên nghiệp. Hãy phân tích hình ảnh báo giá này, trích xuất tất cả các mục linh kiện, đơn giá, số lượng và thành tiền. 
                  Trả về kết quả dưới định dạng JSON cấu trúc sau: 
                  { "items": [{ "name": "...", "quantity": 0, "price": 0, "total": 0 }], "currency": "VND", "total_amount": 0 }
                  Nếu thông tin nào không rõ ràng, hãy để là null.`
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
            }),
            25000 // 25s timeout
          );

          // Clean up file in background
          fetch(`https://api.moonshot.cn/v1/files/${fileId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${process.env.MOONSHOT_API_KEY}` }
          }).catch(err => console.warn("[BackgroundWorker] Kimi delete file failed:", err));

          const aiContent = response.choices[0]?.message?.content || "{}";
          return cleanAndParseJSON(aiContent);
        } catch (compErr) {
          // Attempt deletion if chat completion failed
          fetch(`https://api.moonshot.cn/v1/files/${fileId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${process.env.MOONSHOT_API_KEY}` }
          }).catch(() => {});
          throw compErr;
        }
      },

      // Attempt 2: defaultAI (API Box default key)
      async () => {
        console.log("[BackgroundWorker] Attempting extraction with defaultAI (API Box Main)...");
        
        const modelsToTry = [MODEL_VISION_ONLY];
        let lastErr: any = null;

        for (const model of modelsToTry) {
          try {
            console.log(`[BackgroundWorker] trying model ${model} with defaultAI...`);
            const response = await withTimeout(
              defaultAI.chat.completions.create({
                model: model,
                messages: [
                  {
                    role: "system",
                    content: `Bạn là trợ lý kế toán chuyên nghiệp. Hãy phân tích hình ảnh báo giá này, trích xuất tất cả các mục linh kiện, đơn giá, số lượng và thành tiền. 
                    Trả về kết quả dưới định dạng JSON cấu trúc sau: 
                    { "items": [{ "name": "...", "quantity": 0, "price": 0, "total": 0 }], "currency": "VND", "total_amount": 0 }
                    Nếu thông tin nào không rõ ràng, hãy để là null.`
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
              }),
              25000 // 25s timeout per model
            );
            const aiContent = response.choices[0]?.message?.content || "{}";
            const parsed = cleanAndParseJSON(aiContent);
            if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
              return parsed;
            }
          } catch (e: any) {
            console.warn(`[BackgroundWorker] defaultAI model ${model} failed:`, e.message || e);
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
          console.log("[BackgroundWorker] Successfully extracted parts from image.");
          break;
        }
      } catch (err: any) {
        console.warn(`[BackgroundWorker] Extraction attempt failed:`, err.message || err);
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

    if (type === "checkin") {
      const task = await db.pcBuildTask.findUnique({ where: { id: pc_task_id } });
      if (task) {
        expectedBudget = task.max_budget;
        expectedNeed = task.customer_need;
        expectedReqs = task.requirements;
      }
    } else {
      const exercise = await db.pcExercise.findUnique({ where: { id: pc_task_id } });
      if (exercise) {
        const reqs = exercise.requirements as any;
        expectedBudget = Number(reqs?.budget) || 0;
        expectedNeed = `${exercise.title} - ${exercise.description} (${reqs?.useCase || ""})`;
        expectedReqs = `Ràng buộc: ${Array.isArray(reqs?.constraints) ? reqs.constraints.join(", ") : ""}`;
      }
    }

    // 3. Call AI to match and perform compatibility check
    const DEEPSEEK_PROMPT = `
Bạn là hệ thống chuyên gia tự động hóa phân loại và duyệt cấu hình PC chuyên nghiệp của công ty SP-CyberSoft.
Nhiệm vụ của bạn là phân tích danh sách linh kiện thô trích xuất từ hóa đơn (dưới dạng JSON), phân loại chúng vào các danh mục biểu mẫu chuẩn, tính toán tổng giá tiền và kiểm tra kỹ thuật khả năng tương thích của cấu hình, đối chiếu chặt chẽ với nhu cầu và ngân sách của đề bài.

DỮ LIỆU ĐỀ BÀI (NẾU CÓ):
- Nhu cầu khách hàng: "${expectedNeed}"
- Ngân sách tối đa: ${expectedBudget > 0 ? expectedBudget.toLocaleString('vi-VN') + ' VNĐ' : 'Không giới hạn'}
- Yêu cầu cấu hình khác: "${expectedReqs}"

LINH KIỆN THÔ TRÍCH XUẤT TỪ HÓA ĐƠN:
${JSON.stringify(extractedRaw, null, 2)}

QUY TẮC PHÂN LOẠI LINH KIỆN:
Phân loại chuẩn xác vào các danh mục sau: cpu, mainboard, ram, vga, ssd, psu, case, cooler_fan (tản nhiệt khí/nước hoặc quạt case), monitor, keyboard_mouse, headphone, desk_chair.
Nếu một danh mục không có trong hóa đơn, hãy trả về: { "name": "", "price": 0 }.

QUY TẮC KIỂM TRA TƯƠNG THÍCH KỸ THUẬT (HÃY ĐÁNH GIÁ CHÍNH XÁC):
1. Socket (CPU & Mainboard):
   - CPU Intel Core thế hệ 12, 13, 14 (LGA1700) tương thích với Mainboard H610, B660, B760, Z690, Z790.
   - CPU Intel Core thế hệ 10, 11 (LGA1200) tương thích với Mainboard H410, H510, B460, B560, Z490, Z590.
   - CPU AMD Ryzen socket AM4 (Ryzen 1000 - 5000) đi với Mainboard A320, B450, B550, X570.
   - CPU AMD Ryzen socket AM5 (Ryzen 7000 - 9000) đi với Mainboard A620, B650, X670.
2. RAM (DDR4 / DDR5 & Mainboard):
   - RAM DDR4 tương thích với Mainboard hỗ trợ DDR4. RAM DDR5 tương thích với Mainboard hỗ trợ DDR5.
   - Nếu Mainboard hỗ trợ DDR4 nhưng chọn RAM DDR5 (hoặc ngược lại) -> Báo FAIL.
3. Power (Nguồn PSU & VGA/CPU):
   - Đảm bảo công suất nguồn (Watts) đủ tải cho CPU + VGA và có khoảng an toàn tối thiểu 100W-150W.
   - RTX 3050/4060: tối thiểu 450W - 500W.
   - RTX 3060/4060 Ti: tối thiểu 550W.
   - RTX 3070/4070: tối thiểu 650W.
   - RTX 3080/4080/4090: tối thiểu 750W - 850W.
4. Case Size & Mainboard:
   - Vỏ case Mini-Tower hoặc ITX nhỏ gọn có thể không vừa Mainboard ATX lớn (chỉ vừa m-ATX, ITX).
   - Vỏ case Mid-Tower / Full-Tower thông thường đều vừa tất cả kích thước Mainboard (ATX, m-ATX, ITX).
5. Budget (Ngân sách):
   - Tổng tiền thực tế của cấu hình (matched_parts.total_price) cho phép vượt quá ngân sách tối đa của đề bài một chút từ 100,000 VND đến 200,000 VND.
   - Nếu tổng tiền thực tế vượt quá ngân sách tối đa trong khoảng từ 1 VND đến 200,000 VND -> Đánh giá trạng thái budget là "WARN" (Cảnh báo) kèm ghi chú vượt nhẹ nhưng vẫn hợp lệ.
   - Chỉ báo "FAIL" ở phần budget nếu tổng tiền vượt quá ngân sách nhiều hơn 200,000 VND.

QUY TẮC DUYỆT BÀI (isApproved):
- Đặt "isApproved": true nếu thỏa mãn:
  - Tổng giá (total_price) <= Ngân sách đề bài + 200,000 VND (cho phép chênh lệch vượt tối đa 200k).
  - Không bị FAIL ở bất kỳ kiểm tra kỹ thuật nghiêm trọng nào (Socket, RAM, Power).
  - Cấu hình đáp ứng tốt nhu cầu khách hàng (Ví dụ: nhu cầu thiết kế đồ họa 3D nhưng không có VGA rời hoặc CPU quá yếu -> FAIL).
- Ngược lại đặt "isApproved": false.

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
    "socket": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "ram": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "power": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "case": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "budget": { "status": "PASS" | "FAIL" | "WARN", "message": "..." }
  }
}
`;

    let result: any = null;
    let compatibilityError: any = null;

    const compatibilityAttempts = [
      // Attempt 1: DeepSeek Flash (API Box)
      async () => {
        console.log("[BackgroundWorker] Attempting compatibility check with DeepSeek Flash...");
        const response = await withTimeout(
          defaultAI.chat.completions.create({
            model: MODEL_CHAT_FLASH,
            messages: [{ role: "user", content: DEEPSEEK_PROMPT }],
            response_format: { type: "json_object" },
          }),
          12000 // 12s timeout
        );
        const content = response.choices[0]?.message?.content || "{}";
        return JSON.parse(content);
      },
      // Attempt 2: DeepSeek Pro (API Box) - backup if Flash is slow/failing
      async () => {
        console.log("[BackgroundWorker] Attempting compatibility check with DeepSeek Pro...");
        const response = await withTimeout(
          defaultAI.chat.completions.create({
            model: MODEL_CHAT_PRO,
            messages: [{ role: "user", content: DEEPSEEK_PROMPT }],
            response_format: { type: "json_object" },
          }),
          12000 // 12s timeout
        );
        const content = response.choices[0]?.message?.content || "{}";
        return JSON.parse(content);
      },
      // Attempt 3: Direct Moonshot if configured
      async () => {
        if (!process.env.MOONSHOT_API_KEY) {
          throw new Error("No MOONSHOT_API_KEY for compatibility fallback");
        }
        console.log("[BackgroundWorker] Attempting compatibility check with direct Moonshot Kimi...");
        const response = await withTimeout(
          moonshotAI.chat.completions.create({
            model: "kimi-k2.5",
            messages: [{ role: "user", content: DEEPSEEK_PROMPT }],
            response_format: { type: "json_object" },
          }),
          12000 // 12s timeout
        );
        const content = response.choices[0]?.message?.content || "{}";
        return JSON.parse(content);
      }
    ];

    for (const attempt of compatibilityAttempts) {
      try {
        result = await attempt();
        if (result && result.matched_parts && result.checks) {
          compatibilityError = null;
          console.log("[BackgroundWorker] Compatibility check completed successfully.");
          break;
        }
      } catch (err: any) {
        console.warn("[BackgroundWorker] Compatibility attempt failed:", err.message || err);
        compatibilityError = err;
      }
    }

    if (!result || !result.matched_parts || !result.checks) {
      throw new Error(`Tất cả các cổng phân tích tương thích AI đều thất bại. Lỗi cuối cùng: ${compatibilityError?.message || "Không xác định"}`);
    }

    // Format output data to include partId: ""
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

    const finalStatus = result.isApproved ? "AUTO_APPROVED" : "PENDING";
    const feedback = `${result.reason || ""}\n\n[Báo cáo tương thích]\n- Socket: ${result.checks?.socket?.message || ""}\n- RAM: ${result.checks?.ram?.message || ""}\n- PSU: ${result.checks?.power?.message || ""}\n- Case: ${result.checks?.case?.message || ""}\n- Ngân sách: ${result.checks?.budget?.message || ""}`;

    // 4. Update database record
    if (type === "checkin") {
      const checkin = await db.checkin.findUnique({ where: { id } });
      const currentBuildData = (checkin?.build_data as any) || {};
      const isDraft = currentBuildData.is_draft === true;

      await db.checkin.update({
        where: { id },
        data: {
          status: isDraft ? "PENDING" : finalStatus,
          build_data: {
            ...formattedData,
            checks: result.checks || {},
            reason: result.reason || "",
            is_analyzing: false,
            is_draft: isDraft,
            is_approved: !!result.isApproved,
            explanation: currentBuildData.explanation || "",
          },
        },
      });
    } else {
      const submission = await db.pcSubmission.findUnique({ where: { id } });
      const currentParts = (submission?.parts_answer as any) || {};
      const isDraft = currentParts.is_draft === true;

      // Map extractedParts to match submissions endpoint array format
      const parts_answer = Object.entries(formattedData)
        .filter(([k, v]) => k !== "total_price" && v && (v as any).name)
        .map(([k, v]) => ({
          category: k,
          name: (v as any).name,
          price: Number((v as any).price) || 0,
          reason: "",
        }));

      await db.pcSubmission.update({
        where: { id },
        data: {
          status: isDraft ? "PENDING" : finalStatus,
          parts_answer: {
            parts: parts_answer,
            checks: result.checks || {},
            reason: result.reason || "",
            total_price: formattedData.total_price || 0,
            is_draft: isDraft,
            is_approved: !!result.isApproved,
            is_analyzing: false,
            temp_ai_score: result.isApproved ? 100 : 70,
            temp_ai_feedback: feedback,
          },
          ai_score: isDraft ? null : (result.isApproved ? 100 : 70),
          ai_feedback: isDraft ? null : feedback,
        },
      });
    }

    console.log(`[BackgroundWorker] Finished PC Build analysis for ${type} ${id} with status ${finalStatus}.`);
    
    // Revalidate cache tags
    revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");
    revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
  } catch (error: any) {
    console.error(`[BackgroundWorker] Failed to process ${type} ${id}:`, error);

    // Rollback or mark error status in DB so client is not stuck forever
    if (type === "checkin") {
      await db.checkin.update({
        where: { id },
        data: {
          status: "PENDING",
          build_data: {
            is_analyzing: false,
            error: "Lỗi phân tích hóa đơn từ AI background."
          }
        }
      });
    } else {
      await db.pcSubmission.update({
        where: { id },
        data: {
          status: "PENDING",
          ai_feedback: "Gặp lỗi hệ thống trong quá trình AI phân tích background."
        }
      });
    }
  }
}
