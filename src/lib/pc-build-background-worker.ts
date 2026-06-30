import { db } from "@/lib/db";
import { codexAI, defaultAI, MODEL_VISION_ONLY, MODEL_CHAT_FLASH } from "@/lib/aibox";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

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

    // 1. Call Kimi Vision to extract the items as a list of raw elements
    const response = await codexAI.chat.completions.create({
      model: MODEL_VISION_ONLY,
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
    });

    const aiContent = response.choices[0]?.message?.content || "{}";
    const extractedRaw = cleanAndParseJSON(aiContent);

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

    // 3. Call DeepSeek to match and perform compatibility check
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
2. Kiểm tra kỹ thuật tương thích phần cứng:
   Hãy đánh giá tính tương thích và hợp lệ dựa trên các yếu tố sau:
   a. Socket (CPU & Mainboard): Socket CPU và Mainboard có tương thích không? (ví dụ Intel LGA1700, AMD AM5).
   b. RAM (DDR4/DDR5 & Mainboard): RAM và khe RAM trên mainboard có khớp thế hệ DDR không?
   c. Power (Nguồn PSU & VGA/CPU): Công suất nguồn có đủ cấp điện cho CPU + VGA không?
   d. Case Size & Mainboard: Kích thước vỏ case có vừa với mainboard không?
   e. Budget (Ngân sách & Chênh lệch giá): Tổng giá thực tế có vượt ngân sách tối đa không?
3. Đánh giá duyệt cấu hình:
   - Đặt "isApproved": true nếu thỏa mãn: tổng giá <= ngân sách, các linh kiện tương thích tốt (không bị FAIL các kiểm tra socket, ram, psu), và đáp ứng được nhu cầu khách hàng. Ngược lại đặt false.
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
    "socket": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "ram": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "power": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "case": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "budget": { "status": "PASS" | "FAIL" | "WARN", "message": "..." }
  }
}
`;

    const deepseekResponse = await defaultAI.chat.completions.create({
      model: MODEL_CHAT_FLASH,
      messages: [{ role: "user", content: DEEPSEEK_PROMPT }],
      response_format: { type: "json_object" },
    });

    const deepseekContent = deepseekResponse.choices[0]?.message?.content || "{}";
    const result = JSON.parse(deepseekContent);

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
