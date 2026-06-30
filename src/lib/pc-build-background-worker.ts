import { db } from "@/lib/db";
import { codexAI, defaultAI, moonshotAI, MODEL_VISION_ONLY, MODEL_CHAT_FLASH, MODEL_CHAT_PRO } from "@/lib/aibox";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import sharp from "sharp";

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
    if (!cleanStr.startsWith("{") && !cleanStr.startsWith("[")) {
      const firstObject = cleanStr.indexOf("{");
      const lastObject = cleanStr.lastIndexOf("}");
      const firstArray = cleanStr.indexOf("[");
      const lastArray = cleanStr.lastIndexOf("]");

      if (firstObject !== -1 && lastObject > firstObject) {
        cleanStr = cleanStr.slice(firstObject, lastObject + 1);
      } else if (firstArray !== -1 && lastArray > firstArray) {
        cleanStr = cleanStr.slice(firstArray, lastArray + 1);
      }
    }
    return JSON.parse(cleanStr);
  } catch (e) {
    console.error("[cleanAndParseJSON] Failed to parse:", str.slice(0, 1000), e);
    return {};
  }
};

const parseMoney = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const digits = value.replace(/\D/g, "");
    return digits ? Number.parseInt(digits, 10) : 0;
  }
  return 0;
};

const normalizeExtractionResult = (raw: any): any => {
  if (!raw) return raw;

  if (Array.isArray(raw)) {
    return { items: raw };
  }

  if (Array.isArray(raw.items)) {
    return raw;
  }

  const arrayKeys = ["products", "components", "parts", "line_items", "linh_kien", "linhKien"];
  for (const key of arrayKeys) {
    if (Array.isArray(raw[key])) {
      return {
        ...raw,
        items: raw[key],
        total_amount: parseMoney(raw.total_amount ?? raw.total ?? raw.total_price),
      };
    }
  }

  const objectKeys = ["matched_parts", "components", "parts", "pc_build", "build"];
  for (const key of objectKeys) {
    const value = raw[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const items = Object.entries(value)
        .filter(([partKey, partValue]) => partKey !== "total_price" && partValue && typeof partValue === "object")
        .map(([partKey, partValue]) => {
          const part = partValue as Record<string, unknown>;
          return {
            name: part.name || part.product_name || part.title || partKey,
            quantity: parseMoney(part.quantity ?? part.qty) || 1,
            price: parseMoney(part.price ?? part.unit_price ?? part.amount),
            total: parseMoney(part.total ?? part.total_price ?? part.price ?? part.amount),
          };
        })
        .filter((item) => typeof item.name === "string" && item.name.trim().length > 0);

      if (items.length > 0) {
        return {
          ...raw,
          items,
          total_amount: parseMoney(raw.total_amount ?? raw.total ?? raw.total_price ?? value.total_price),
        };
      }
    }
  }

  return raw;
};

const hasExtractedItems = (raw: any): boolean => {
  return !!raw && Array.isArray(raw.items) && raw.items.length > 0;
};

const ensureCompatibilityChecks = (result: any): any => {
  if (!result?.matched_parts) return result;
  if (!result.checks) {
    result.checks = {
      socket: { status: "WARN", message: "AI chưa trả về kiểm tra socket chi tiết." },
      ram: { status: "WARN", message: "AI chưa trả về kiểm tra RAM chi tiết." },
      power: { status: "WARN", message: "AI chưa trả về kiểm tra nguồn chi tiết." },
      case: { status: "WARN", message: "AI chưa trả về kiểm tra vỏ case chi tiết." },
      budget: { status: "WARN", message: "AI chưa trả về kiểm tra ngân sách chi tiết." },
    };
    result.reason = result.reason || "AI đã bóc tách cấu hình nhưng chưa trả về đầy đủ báo cáo kiểm tra kỹ thuật.";
    result.isApproved = false;
  }
  return result;
};

const hasFinalPcBuildResult = (result: any): boolean => {
  return !!result?.matched_parts;
};

const envInt = (name: string, fallback: number): number => {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const IS_VERCEL = process.env.VERCEL === "1";
const IMAGE_MAX_SIZE = envInt("PC_BUILD_IMAGE_MAX_SIZE", IS_VERCEL ? 1400 : 1600);
const IMAGE_QUALITY = envInt("PC_BUILD_IMAGE_QUALITY", IS_VERCEL ? 78 : 82);
const FAST_PATH_TIMEOUT_MS = IS_VERCEL ? 28_000 : 35_000;
const VISION_EXTRACTION_TIMEOUT_MS = IS_VERCEL ? 18_000 : 60_000;
const COMPATIBILITY_TIMEOUT_MS = IS_VERCEL ? 16_000 : 25_000;
const ENABLE_PRO_COMPATIBILITY_FALLBACK =
  !IS_VERCEL || process.env.PC_BUILD_ENABLE_PRO_FALLBACK === "true";

async function optimizeImageForVision(imageDataUrl: string): Promise<string> {
  const base64Data = imageDataUrl.split(",")[1] || imageDataUrl;
  const buffer = Buffer.from(base64Data, "base64");
  const optimizedBuffer = await sharp(buffer)
    .rotate()
    .resize({
      width: IMAGE_MAX_SIZE,
      height: IMAGE_MAX_SIZE,
      fit: "inside",
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    })
    .normalize()
    .sharpen({ sigma: 0.6 })
    .jpeg({
      quality: Math.min(92, Math.max(60, IMAGE_QUALITY)),
      mozjpeg: true,
      chromaSubsampling: "4:4:4",
    })
    .toBuffer();

  console.log(
    `[BackgroundWorker] Image optimized for OCR: ${buffer.length} bytes -> ${optimizedBuffer.length} bytes, max=${IMAGE_MAX_SIZE}, quality=${IMAGE_QUALITY}`
  );

  return `data:image/jpeg;base64,${optimizedBuffer.toString("base64")}`;
}

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
    const analysisStartedAt = Date.now();
    let imageUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    try {
      imageUrl = await optimizeImageForVision(imageUrl);
    } catch (err) {
      console.warn("[BackgroundWorker] Image optimization failed, using original:", err);
    }

    // Load Task or Exercise requirements early so the Vercel fast-path can do
    // extraction + compatibility in one vision call.
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

    let result: any = null;

    const FINAL_ANALYSIS_PROMPT = `
Bạn là hệ thống chuyên gia duyệt cấu hình PC của SP-CyberSoft.
Hãy đọc ảnh báo giá, bóc tách linh kiện, phân loại vào các danh mục chuẩn, tính tổng giá và kiểm tra tương thích với đề bài.

CHIẾN LƯỢC OCR BẮT BUỘC:
1. Đọc bảng báo giá theo từng dòng từ trên xuống dưới.
2. Chỉ lấy các dòng hàng hóa/linh kiện có tên sản phẩm và giá tiền; bỏ header, hotline, địa chỉ, logo, tổng phụ không phải linh kiện.
3. Giữ nguyên mã sản phẩm quan trọng như CPU, mainboard, RAM bus/dung lượng, VGA, SSD, PSU watt, case.
4. Giá tiền trong ảnh có thể dùng dấu "." hoặc "," để phân tách hàng nghìn; trả về số nguyên VND, không kèm ký tự tiền tệ.
5. Nếu chữ hơi mờ, ưu tiên tên linh kiện đọc được rõ nhất và không tự bịa mã sản phẩm không thấy trong ảnh.

DỮ LIỆU ĐỀ BÀI:
- Nhu cầu khách hàng: "${expectedNeed}"
- Ngân sách tối đa: ${expectedBudget > 0 ? expectedBudget.toLocaleString('vi-VN') + ' VNĐ' : 'Không giới hạn'}
- Yêu cầu cấu hình khác: "${expectedReqs}"

DANH MỤC CHUẨN:
cpu, mainboard, ram, vga, ssd, psu, case, cooler_fan, monitor, keyboard_mouse, headphone, desk_chair.

QUY TẮC:
- Nếu một danh mục không có trong báo giá, trả về { "name": "", "price": 0 }.
- total_price là tổng tiền thực tế của các linh kiện.
- Budget được WARN nếu vượt ngân sách tối đa từ 1 đến 200000 VND, FAIL nếu vượt hơn 200000 VND.
- isApproved=true chỉ khi không có FAIL nghiêm trọng ở socket/ram/power và tổng tiền <= ngân sách + 200000 VND.

BẮT BUỘC chỉ trả về JSON theo format:
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
  "isApproved": false,
  "reason": "Lý do ngắn gọn bằng tiếng Việt",
  "checks": {
    "socket": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "ram": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "power": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "case": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "budget": { "status": "PASS" | "FAIL" | "WARN", "message": "..." }
  }
}`;

    try {
      if (process.env.AIBOX_DEFAULT_API_KEY || process.env.AIBOX_API_KEY || process.env.AIBOX_CODEX_API_KEY) {
        console.log("[BackgroundWorker] Attempting Vercel fast-path single vision analysis...");
        const fastResponse = await withTimeout(
          defaultAI.chat.completions.create({
            model: MODEL_VISION_ONLY,
            messages: [
              { role: "system", content: FINAL_ANALYSIS_PROMPT },
              {
                role: "user",
                content: [
                  { type: "text", text: "Phân tích báo giá PC này và trả về JSON kết quả cuối:" },
                  { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
                ]
              }
            ],
            response_format: { type: "json_object" },
            max_tokens: 4000,
          }),
          FAST_PATH_TIMEOUT_MS
        );

        const fastContent = fastResponse.choices[0]?.message?.content || "{}";
        console.log("[BackgroundWorker] Fast-path raw preview:", fastContent.slice(0, 500));
        const fastResult = ensureCompatibilityChecks(cleanAndParseJSON(fastContent));
        if (hasFinalPcBuildResult(fastResult)) {
          result = fastResult;
          console.log("[BackgroundWorker] Fast-path analysis completed successfully.");
        } else {
          console.warn("[BackgroundWorker] Fast-path returned unusable result:", JSON.stringify(fastResult).slice(0, 1000));
        }
      }
    } catch (err: any) {
      console.warn("[BackgroundWorker] Fast-path analysis failed, falling back:", err.message || err);
    }

    if (!result) {
    if (IS_VERCEL && Date.now() - analysisStartedAt > 30_000) {
      throw new Error("Fast-path AI không trả về kết quả kịp trong giới hạn Vercel, dừng fallback để tránh timeout và tốn thêm token.");
    }

    // 1. Call Kimi/Gemini Vision to extract the items as a list of raw elements
    let extractedRaw: any = null;
    let extractionError: any = null;

    const extractionPrompt = `Bạn là trợ lý kế toán chuyên nghiệp. Hãy phân tích hình ảnh báo giá này, trích xuất tất cả các mục linh kiện, đơn giá, số lượng và thành tiền.
Đọc bảng từ trên xuống dưới, chỉ lấy dòng hàng hóa/linh kiện có tên sản phẩm và giá tiền; bỏ logo, header, hotline, địa chỉ, ghi chú.
Giữ nguyên mã sản phẩm quan trọng, không tự bịa phần không đọc rõ. Giá tiền trả về dạng số nguyên VND.
Trả về kết quả dưới định dạng JSON cấu trúc sau:
{ "items": [{ "name": "...", "quantity": 0, "price": 0, "total": 0 }], "currency": "VND", "total_amount": 0 }
Nếu thông tin nào không rõ ràng, hãy để là null.`;

    const extractionAttempts = [
      async () => {
        if (!process.env.MOONSHOT_API_KEY) {
          throw new Error("No MOONSHOT_API_KEY configured in environment");
        }
        console.log("[BackgroundWorker] Attempting extraction with direct Moonshot Kimi API via base64...");
        
        const response = await withTimeout(
          moonshotAI.chat.completions.create({
            model: "kimi-k2.5",
            messages: [
              { role: "system", content: extractionPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: "Trích xuất thông tin từ bảng báo giá này:" },
                  { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
                ]
              }
            ],
            max_tokens: 4000,
          }),
          VISION_EXTRACTION_TIMEOUT_MS
        );

        const aiContent = response.choices[0]?.message?.content || "{}";
        console.log("[BackgroundWorker] Moonshot extraction raw preview:", aiContent.slice(0, 500));
        return normalizeExtractionResult(cleanAndParseJSON(aiContent));
      }
    ];

    for (const attempt of extractionAttempts) {
      try {
        extractedRaw = normalizeExtractionResult(await attempt());
        if (hasExtractedItems(extractedRaw)) {
          extractionError = null;
          console.log("[BackgroundWorker] Successfully extracted parts from image.");
          break;
        }
        console.warn("[BackgroundWorker] Extraction returned no usable items:", JSON.stringify(extractedRaw).slice(0, 1000));
      } catch (err: any) {
        console.warn(`[BackgroundWorker] Extraction attempt failed:`, err.message || err);
        extractionError = err;
      }
    }

    if (!hasExtractedItems(extractedRaw)) {
      throw new Error(`Tất cả các cổng trích xuất AI Vision đều thất bại. Lỗi cuối cùng: ${extractionError?.message || "Không xác định"}`);
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
          COMPATIBILITY_TIMEOUT_MS
        );
        const content = response.choices[0]?.message?.content || "{}";
        console.log("[BackgroundWorker] DeepSeek Flash raw preview:", content.slice(0, 500));
        return cleanAndParseJSON(content);
      },
      ...(ENABLE_PRO_COMPATIBILITY_FALLBACK ? [
      // Attempt 2: DeepSeek Pro (API Box) - backup if Flash is slow/failing
      async () => {
        console.log("[BackgroundWorker] Attempting compatibility check with DeepSeek Pro...");
        const response = await withTimeout(
          defaultAI.chat.completions.create({
            model: MODEL_CHAT_PRO,
            messages: [{ role: "user", content: DEEPSEEK_PROMPT }],
            response_format: { type: "json_object" },
          }),
          COMPATIBILITY_TIMEOUT_MS
        );
        const content = response.choices[0]?.message?.content || "{}";
        console.log("[BackgroundWorker] DeepSeek Pro raw preview:", content.slice(0, 500));
        return cleanAndParseJSON(content);
      }
      ] : [])
    ];

    for (const attempt of compatibilityAttempts) {
      try {
        result = await attempt();
        if (hasFinalPcBuildResult(result)) {
          result = ensureCompatibilityChecks(result);
          compatibilityError = null;
          console.log("[BackgroundWorker] Compatibility check completed successfully.");
          break;
        }
        console.warn("[BackgroundWorker] Compatibility returned unusable result:", JSON.stringify(result).slice(0, 1000));
      } catch (err: any) {
        console.warn("[BackgroundWorker] Compatibility attempt failed:", err.message || err);
        compatibilityError = err;
      }
    }

    if (!hasFinalPcBuildResult(result)) {
      throw new Error(`Tất cả các cổng phân tích tương thích AI đều thất bại. Lỗi cuối cùng: ${compatibilityError?.message || "Không xác định"}`);
    }
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
          ai_feedback: "Gặp lỗi hệ thống trong quá trình AI phân tích background.",
          parts_answer: {
            is_analyzing: false,
            error: "Lỗi phân tích hóa đơn từ AI background."
          }
        }
      });
    }
  }
}
