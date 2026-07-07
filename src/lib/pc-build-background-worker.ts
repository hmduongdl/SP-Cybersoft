import { db } from "@/lib/db";
import { defaultAI, openaiAI, googleGeminiAI, MODEL_VISION_ONLY, MODEL_CHAT_FLASH, MODEL_CHAT_PRO } from "@/lib/aibox";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import sharp from "sharp";
import * as XLSX from "xlsx";

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label = "API"): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`[${label}] API call timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 1500,
  factor = 1.5,
  startTime = Date.now()
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isTimeout = error?.message?.includes("timeout");
    const isTransient =
      error?.status === 429 ||
      error?.statusCode === 429 ||
      error?.message?.includes("429") ||
      error?.message?.includes("rate limit") ||
      isTimeout ||
      error?.status >= 500 ||
      !error?.status;

    const elapsed = Date.now() - startTime;
    const timeLimitExceeded = IS_VERCEL && elapsed > 25_000;

    if (retries > 0 && isTransient && !timeLimitExceeded) {
      console.warn(`[Retry] PC Build AI call transient error/rate-limit. Retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return retryWithBackoff(fn, retries - 1, delayMs * factor, factor, startTime);
    }

    throw error;
  }
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
    // Attempt direct parse first
    try {
      return JSON.parse(cleanStr);
    } catch (_) {
      // Try auto-repair for truncated JSON: find last complete top-level closing brace
      const lastBrace = cleanStr.lastIndexOf("},");
      if (lastBrace > 0) {
        // Close open arrays/objects after last complete entry
        let repaired = cleanStr.slice(0, lastBrace + 1);
        // Count unclosed brackets
        let open = 0;
        for (const ch of repaired) { if (ch === "{" || ch === "[") open++; else if (ch === "}" || ch === "]") open--; }
        for (let i = 0; i < open; i++) repaired += "}";
        try { return JSON.parse(repaired); } catch (_2) { /* fall through */ }
      }
      console.error("[cleanAndParseJSON] Failed to parse (even after repair):", cleanStr.slice(0, 500));
      return {};
    }
  } catch (e) {
    console.error("[cleanAndParseJSON] Outer error:", e);
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
  const hasDiscreteGpu = Boolean(String(result.matched_parts?.vga?.name || "").trim());
  const defaultChecks = {
    socket: { status: "WARN", message: "AI chưa trả về kiểm tra socket chi tiết." },
    display_output: { status: "WARN", message: "AI chưa trả về kiểm tra khả năng xuất hình khi không có VGA rời." },
    ram: { status: "WARN", message: "AI chưa trả về kiểm tra RAM chi tiết." },
    power: { status: "WARN", message: "AI chưa trả về kiểm tra nguồn chi tiết." },
    case: { status: "WARN", message: "AI chưa trả về kiểm tra vỏ case chi tiết." },
    requirement_fit: { status: "WARN", message: "AI chưa trả về đánh giá mức độ đáp ứng yêu cầu đề bài." },
    budget: { status: "WARN", message: "AI chưa trả về kiểm tra ngân sách chi tiết." },
    peripherals: { status: "WARN", message: "AI chưa trả về kiểm tra tản nhiệt rời, LCD/màn hình, bàn phím và chuột." },
  };
  if (!result.checks) {
    result.checks = defaultChecks;
    result.reason = result.reason || "AI đã bóc tách cấu hình nhưng chưa trả về đầy đủ báo cáo kiểm tra kỹ thuật.";
    result.isApproved = false;
  }
  for (const [key, fallback] of Object.entries(defaultChecks)) {
    if (!result.checks[key]) {
      result.checks[key] = fallback;
      if (key === "requirement_fit" || (key === "display_output" && !hasDiscreteGpu)) {
        result.isApproved = false;
        result.reason =
          key === "requirement_fit"
            ? "Chưa đủ căn cứ xác nhận cấu hình đáp ứng đúng yêu cầu đề bài."
            : "Chưa đủ căn cứ xác nhận CPU có thể xuất hình khi không có card đồ họa rời.";
      }
    }
  }
  return result;
};

const BUDGET_OVERAGE_LIMIT_RATIO = 0.02;
const STRICT_PC_BUILD_REVIEW_RULES = `
QUY TẮC CHẤM ĐIỂM NGHIÊM KHẮC:
- Sai hoặc thiếu bất kỳ ràng buộc bắt buộc nào của đề bài thì requirement_fit phải FAIL, isApproved=false, điểm phải thấp.
- Không được duyệt nương tay vì cấu hình "có vẻ dùng được"; phải bám sát đúng nhu cầu, ngân sách và yêu cầu tối thiểu.
- Thiếu tản nhiệt rời, LCD/màn hình, bàn phím hoặc chuột đều là lỗi cần ghi nhận nếu đề không nói rõ là không yêu cầu.
- Bài có lỗi kỹ thuật nghiêm trọng như sai socket, RAM sai chuẩn, nguồn thiếu, không xuất hình phải bị từ chối và đánh giá rất thấp.
- Hạn chế tối đa điểm 100. Chỉ cho 100 khi cấu hình đáp ứng rất sát đề, tất cả check PASS, tổng giá không vượt ngân sách gốc và không có cảnh báo đáng kể.
- Không tiết lộ thang điểm, hệ số phạt, công thức chấm hoặc số điểm bị trừ trong reason/feedback; chỉ nêu lỗi cụ thể và cách sửa.
`;

const formatVND = (amount: number): string => `${Math.round(amount).toLocaleString("vi-VN")} VNĐ`;

const getApprovedBudgetLimit = (budget: number): number => {
  return budget > 0 ? Math.floor(budget * (1 + BUDGET_OVERAGE_LIMIT_RATIO)) : 0;
};

const enforceRequirementFitGate = (result: any): any => {
  const requirementStatus = String(result?.checks?.requirement_fit?.status || "").toUpperCase();
  if (requirementStatus === "FAIL") {
    result.isApproved = false;
    result.reason = result.reason || "Không đạt vì cấu hình chưa đáp ứng đúng yêu cầu bắt buộc của đề bài.";
  }
  const criticalCheckLabels: Record<string, string> = {
    display_output: "CPU không có khả năng xuất hình trong khi cấu hình không có card đồ họa rời",
    socket: "CPU và mainboard không tương thích socket",
    ram: "RAM không tương thích với mainboard",
    power: "nguồn không đáp ứng cấu hình",
    case: "vỏ máy không tương thích với linh kiện đã chọn",
  };
  let hasBlockingFailure = requirementStatus === "FAIL";
  for (const [key, label] of Object.entries(criticalCheckLabels)) {
    if (String(result?.checks?.[key]?.status || "").toUpperCase() === "FAIL") {
      hasBlockingFailure = true;
      result.isApproved = false;
      result.reason = result.reason || `Không đạt vì ${label}.`;
      break;
    }
  }
  return result;
};

const enforcePcBuildBudgetLimit = (result: any, expectedBudget: number): any => {
  if (!result?.matched_parts) return result;

  const budget = Number(expectedBudget) || 0;
  const total = Number(result.matched_parts.total_price ?? result.total_price) || 0;
  if (budget <= 0 || total <= 0) return result;

  const approvedLimit = getApprovedBudgetLimit(budget);
  const overBudgetAmount = total - budget;
  const overLimitAmount = total - approvedLimit;
  result.checks = result.checks || {};

  if (total <= budget) {
    result.checks.budget = {
      status: "PASS",
      message: `Tổng giá ${formatVND(total)} nằm trong ngân sách ${formatVND(budget)}.`,
    };
    return result;
  }

  if (total <= approvedLimit) {
    result.checks.budget = {
      status: "WARN",
      message: `Tổng giá ${formatVND(total)} vượt ngân sách ${formatVND(overBudgetAmount)}, nhưng vẫn trong giới hạn cho phép 2% (${formatVND(approvedLimit)}).`,
    };
    return result;
  }

  result.checks.budget = {
    status: "FAIL",
    message: `Tổng giá ${formatVND(total)} vượt quá giới hạn cho phép 2% trên ngân sách. Mức tối đa được duyệt là ${formatVND(approvedLimit)}, đang vượt ${formatVND(overLimitAmount)}.`,
  };
  result.isApproved = false;
  result.reason = `Không đạt vì tổng giá ${formatVND(total)} vượt quá giới hạn 2% trên ngân sách ${formatVND(budget)}.`;

  return result;
};

const normalizeForRequirementMatch = (value: unknown): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

const hasNamedPart = (part: unknown): boolean => {
  const value = part && typeof part === "object" ? part as Record<string, unknown> : {};
  return Boolean(String(value.name || "").trim()) || Number(value.price || 0) > 0;
};

const isPartExplicitlyNotRequired = (requirementsText: string, keywords: string[]): boolean => {
  const normalized = normalizeForRequirementMatch(requirementsText);
  return keywords.some((keyword) => {
    const term = normalizeForRequirementMatch(keyword);
    return new RegExp(`(khong|ko|k)\\s*(can|yeu cau|bat buoc|kem|lay|mua)[^.,;\\n]{0,50}${term}`).test(normalized) ||
      new RegExp(`${term}[^.,;\\n]{0,50}(khong|ko|k)\\s*(can|yeu cau|bat buoc|kem|lay|mua)`).test(normalized);
  });
};

const getMissingPeripheralPenalty = (result: any, requirementsText: string): number => {
  const parts = result?.matched_parts || {};
  let penalty = 0;

  if (!hasNamedPart(parts.cooler_fan) && !isPartExplicitlyNotRequired(requirementsText, ["tan nhiet", "cooler"])) {
    penalty += 6;
  }

  if (!hasNamedPart(parts.monitor) && !isPartExplicitlyNotRequired(requirementsText, ["lcd", "man hinh", "monitor"])) {
    penalty += 8;
  }

  const keyboardMouseName = normalizeForRequirementMatch((parts.keyboard_mouse || {}).name);
  const hasKeyboardMouseBundle = hasNamedPart(parts.keyboard_mouse);
  const hasKeyboard = hasKeyboardMouseBundle && /(ban phim|keyboard|phim co|phim)/.test(keyboardMouseName);
  const hasMouse = hasKeyboardMouseBundle && /(chuot|mouse)/.test(keyboardMouseName);

  if (!hasKeyboard && !isPartExplicitlyNotRequired(requirementsText, ["ban phim", "keyboard"])) {
    penalty += 5;
  }
  if (!hasMouse && !isPartExplicitlyNotRequired(requirementsText, ["chuot", "mouse"])) {
    penalty += 5;
  }

  return penalty;
};

const calculateStrictPcBuildScore = (result: any, expectedBudget: number): number => {
  const checks = result?.checks || {};
  const entries = Object.values(checks) as Array<{ status?: string }>;
  const statusList = entries.map((entry) => String(entry?.status || "").toUpperCase());
  const failCount = statusList.filter((status) => status === "FAIL").length;
  const warnCount = statusList.filter((status) => status === "WARN").length;
  const technicalFailKeys = ["display_output", "socket", "ram", "power", "case"];
  const technicalFailCount = technicalFailKeys.filter(
    (key) => String(checks?.[key]?.status || "").toUpperCase() === "FAIL"
  ).length;
  const requirementFailed = String(checks?.requirement_fit?.status || "").toUpperCase() === "FAIL";
  const budgetFailed = String(checks?.budget?.status || "").toUpperCase() === "FAIL";
  const budgetWarn = String(checks?.budget?.status || "").toUpperCase() === "WARN";
  const totalPrice = Number(result?.matched_parts?.total_price ?? result?.total_price) || 0;
  const budget = Number(expectedBudget) || 0;
  const missingPeripheralPenalty = getMissingPeripheralPenalty(result, result?.requirements_text);

  if (result?.isApproved) {
    if (failCount > 0) return Math.max(0, 80 - technicalFailCount * 20 - missingPeripheralPenalty);
    if (warnCount === 0 && missingPeripheralPenalty === 0 && budget > 0 && totalPrice > 0 && totalPrice <= budget) return 100;
    const baseScore = budgetWarn ? 94 - Math.max(0, warnCount - 1) * 2 : 98 - warnCount * 2;
    return Math.max(70, baseScore - missingPeripheralPenalty);
  }

  const technicalPenalty = technicalFailCount * 20;
  if (requirementFailed || budgetFailed) {
    return Math.max(0, 45 - failCount * 10 - warnCount * 3 - technicalPenalty - missingPeripheralPenalty);
  }
  if (technicalFailCount > 0) return Math.max(0, 35 - technicalPenalty - missingPeripheralPenalty);
  if (failCount > 0) return Math.max(10, 55 - failCount * 12 - warnCount * 3 - missingPeripheralPenalty);
  return Math.max(35, 45 - missingPeripheralPenalty);
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
const IMAGE_MAX_SIZE = envInt("PC_BUILD_IMAGE_MAX_SIZE", IS_VERCEL ? 1100 : 1200);
const IMAGE_QUALITY = envInt("PC_BUILD_IMAGE_QUALITY", IS_VERCEL ? 72 : 74);
const FAST_PATH_TIMEOUT_MS = IS_VERCEL ? 50_000 : 60_000;
const VISION_EXTRACTION_TIMEOUT_MS = envInt("PC_BUILD_VISION_TIMEOUT_MS", IS_VERCEL ? 45_000 : 90_000);
const COMPATIBILITY_TIMEOUT_MS = IS_VERCEL ? 50_000 : 120_000;
const AI_RETRY_COUNT = envInt("PC_BUILD_AI_RETRIES", IS_VERCEL ? 0 : 1);
const VISION_RETRY_COUNT = envInt("PC_BUILD_VISION_RETRIES", 0);
const MAX_AI_OUTPUT_TOKENS = envInt("PC_BUILD_MAX_AI_TOKENS", 4500);
const ENABLE_PRO_COMPATIBILITY_FALLBACK =
  !IS_VERCEL || process.env.PC_BUILD_ENABLE_PRO_FALLBACK === "true";
const PC_BUILD_WORKER_SECRET =
  process.env.PC_BUILD_WORKER_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

export function getPcBuildWorkerSecret(): string {
  if (!PC_BUILD_WORKER_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("Missing PC_BUILD_WORKER_SECRET/AUTH_SECRET for PC Build worker route.");
  }
  return PC_BUILD_WORKER_SECRET || "local-pc-build-worker";
}

function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

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

async function updatePcBuildProgress(
  id: string,
  type: "checkin" | "submission",
  updates: Record<string, unknown>
) {
  if (type === "checkin") {
    const checkin = await db.checkin.findUnique({ where: { id } });
    const currentBuildData = (checkin?.build_data as any) || {};
    await db.checkin.update({
      where: { id },
      data: {
        build_data: {
          ...currentBuildData,
          ...updates,
          is_analyzing: true,
        },
      },
    });
    return;
  }

  const submission = await db.pcSubmission.findUnique({ where: { id } });
  const currentParts = (submission?.parts_answer as any) || {};
  await db.pcSubmission.update({
    where: { id },
    data: {
      parts_answer: {
        ...currentParts,
        ...updates,
        is_analyzing: true,
      },
    },
  });
}

async function markPcBuildError(id: string, type: "checkin" | "submission", message = "Lỗi phân tích hóa đơn từ AI background.") {
  if (type === "checkin") {
    const checkin = await db.checkin.findUnique({ where: { id } });
    const currentBuildData = (checkin?.build_data as any) || {};
    await db.checkin.update({
      where: { id },
      data: {
        status: "PENDING",
        build_data: {
          ...currentBuildData,
          is_analyzing: false,
          analysis_step: "error",
          analysis_message: "AI không hoàn tất được quy trình phân tích.",
          error: message,
        },
      },
    });
    return;
  }

  const submission = await db.pcSubmission.findUnique({ where: { id } });
  const currentParts = (submission?.parts_answer as any) || {};
  await db.pcSubmission.update({
    where: { id },
    data: {
      status: "PENDING",
      ai_feedback: "Gặp lỗi hệ thống trong quá trình AI phân tích background.",
      parts_answer: {
        ...currentParts,
        is_analyzing: false,
        analysis_step: "error",
        analysis_message: "AI không hoàn tất được quy trình phân tích.",
        error: message,
      },
    },
  });
}

function getFriendlyPcBuildError(error: any, phase: "vision" | "deepseek" = "vision"): string {
  const rawMessage = String(error?.message || error || "");
  const lowerMessage = rawMessage.toLowerCase();

  if (lowerMessage.includes("timeout")) {
    return phase === "vision"
      ? "AI Vision đọc ảnh quá lâu nên hệ thống đã dừng bước này. Ảnh vẫn được giữ lại; hãy thử nộp lại ảnh rõ hơn, cắt sát bảng báo giá hoặc dùng file Excel nếu có."
      : "DeepSeek xử lý danh sách linh kiện quá lâu nên hệ thống đã dừng bước này. Dữ liệu đã đọc được vẫn được giữ lại để bạn thử nộp lại.";
  }

  if (lowerMessage.includes("invalid authentication") || lowerMessage.includes("unauthorized") || lowerMessage.includes("api_key")) {
    return "Cấu hình API AI chưa hợp lệ hoặc hết quyền truy cập. Vui lòng kiểm tra lại khóa API trước khi nộp lại.";
  }

  if (lowerMessage.includes("không bóc tách được") || lowerMessage.includes("không đọc được")) {
    return "AI chưa đọc được danh sách linh kiện hợp lệ từ ảnh này. Hãy thử ảnh rõ hơn, ít mờ hơn hoặc cắt sát phần bảng báo giá.";
  }

  return rawMessage || "AI chưa xử lý được báo giá. Vui lòng thử nộp lại.";
}

async function triggerPcBuildCompatibilityJob(id: string, type: "checkin" | "submission") {
  const response = await fetch(`${getAppBaseUrl()}/api/build-pc/analyze-compatibility`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pc-build-worker-secret": getPcBuildWorkerSecret(),
    },
    body: JSON.stringify({ id, type }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Không kích hoạt được bước DeepSeek (${response.status}): ${text.slice(0, 300)}`);
  }
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

export async function processPcBuildVision(
  id: string,
  type: "checkin" | "submission",
  imageBase64: string
) {
  console.log(`[PcBuildVisionWorker] Starting vision extraction for ${type} ${id}...`);

  try {
    let imageUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const isExcel = imageUrl.startsWith("data:application/vnd") || imageUrl.includes("spreadsheetml") || imageUrl.includes("excel");
    if (isExcel) {
      console.log("[PcBuildVisionWorker] Excel file detected. Parsing and extracting JSON...");
      let excelText = "";
      try {
        const base64Data = imageUrl.split(",")[1] || imageUrl;
        const buffer = Buffer.from(base64Data, "base64");
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const formattedRows = rawRows
          .filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ""))
          .map((row, idx) => `Dòng ${idx + 1}: ${row.map(cell => cell !== null && cell !== undefined ? String(cell).trim() : "").join(" | ")}`);
        
        excelText = formattedRows.join("\n");
      } catch (err: any) {
        throw new Error(`Không thể giải mã file Excel báo giá: ${err.message || err}`);
      }

      const excelExtractPrompt = `Bạn là trợ lý kế toán chuyên nghiệp. Dưới đây là dữ liệu thô trích xuất từ file Excel báo giá (các cột phân tách bởi dấu |).
Hãy phân tích dữ liệu này và trích xuất tất cả các mục linh kiện, đơn giá, số lượng và thành tiền.
Dữ liệu Excel:
${excelText}

Trả về kết quả dưới định dạng JSON cấu trúc sau:
{ "items": [{ "name": "...", "quantity": 0, "price": 0, "total": 0 }], "currency": "VND", "total_amount": 0 }
Nếu thông tin nào không rõ ràng, hãy để là null.`;

      const response = await retryWithBackoff(() =>
        withTimeout(
          defaultAI.chat.completions.create({
            model: MODEL_CHAT_FLASH,
            messages: [{ role: "user", content: excelExtractPrompt }],
            response_format: { type: "json_object" },
          }),
          VISION_EXTRACTION_TIMEOUT_MS,
          "Vision-Excel"
        ),
        AI_RETRY_COUNT
      );
      const aiContent = response.choices[0]?.message?.content || "{}";
      const extractedRaw = normalizeExtractionResult(cleanAndParseJSON(aiContent));

      if (!hasExtractedItems(extractedRaw)) {
        throw new Error("AI không bóc tách được linh kiện hợp lệ từ file Excel.");
      }

      await updatePcBuildProgress(id, type, {
        analysis_step: "deepseek",
        analysis_message: "Đã đọc xong file Excel. DeepSeek đang phân loại linh kiện và kiểm tra tương thích...",
        extracted_raw: extractedRaw,
      });

      // On Vercel, trigger HTTP handoff to stay within per-request time budget.
      // Locally, run inline for convenience (no loopback server required).
      if (IS_VERCEL) {
        await triggerPcBuildCompatibilityJob(id, type);
      } else {
        await processPcBuildCompatibilityFromStored(id, type);
      }
      return;
    }

    try {
      imageUrl = await optimizeImageForVision(imageUrl);
    } catch (err) {
      console.warn("[PcBuildVisionWorker] Image optimization failed, using original:", err);
    }

    await updatePcBuildProgress(id, type, {
      analysis_step: "vision",
      analysis_message: "Đang đọc ảnh báo giá và bóc tách linh kiện...",
    });

    const extractionPrompt = `Bạn là trợ lý kế toán chuyên nghiệp. Hãy phân tích hình ảnh báo giá này, trích xuất tất cả các mục linh kiện, đơn giá, số lượng và thành tiền.
Đọc bảng từ trên xuống dưới, chỉ lấy dòng hàng hóa/linh kiện có tên sản phẩm và giá tiền; bỏ logo, header, hotline, địa chỉ, ghi chú.
Giữ nguyên mã sản phẩm quan trọng, không tự bịa phần không đọc rõ. Giá tiền trả về dạng số nguyên VND.
Trả về JSON: { "items": [{ "name": "...", "quantity": 0, "price": 0, "total": 0 }], "currency": "VND", "total_amount": 0 }
Nếu thông tin nào không rõ ràng, hãy để null.`;

    const visionAttempts = [
      {
        name: "Gemini 2.5 Flash (v98store)",
        run: async () => {
          if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY not configured");
          }
          const response = await retryWithBackoff(() =>
            withTimeout(
              openaiAI.chat.completions.create({
                model: MODEL_VISION_ONLY,
                messages: [
                  { role: "system", content: extractionPrompt },
                  {
                    role: "user",
                    content: [
                      { type: "text", text: "Trích xuất thông tin từ bảng báo giá này:" },
                      { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
                    ],
                  },
                ],
                max_tokens: MAX_AI_OUTPUT_TOKENS,
              }),
              VISION_EXTRACTION_TIMEOUT_MS,
              "Vision-Gemini"
            ),
            VISION_RETRY_COUNT
          );
          return response.choices[0]?.message?.content || "{}";
        },
      },
      {
        name: "GPT-4o-Mini (v98store)",
        run: async () => {
          if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY not configured");
          }
          const response = await retryWithBackoff(() =>
            withTimeout(
              openaiAI.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  { role: "system", content: extractionPrompt },
                  {
                    role: "user",
                    content: [
                      { type: "text", text: "Trích xuất thông tin từ bảng báo giá này:" },
                      { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
                    ],
                  },
                ],
                max_tokens: MAX_AI_OUTPUT_TOKENS,
              }),
              VISION_EXTRACTION_TIMEOUT_MS,
              "Vision-GPT4oMini"
            ),
            VISION_RETRY_COUNT
          );
          return response.choices[0]?.message?.content || "{}";
        },
      },
      {
        name: "Gemini 2.5 Flash (Google Direct)",
        run: async () => {
          if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY not configured");
          }
          const response = await retryWithBackoff(() =>
            withTimeout(
              googleGeminiAI.chat.completions.create({
                model: "gemini-2.5-flash",
                messages: [
                  { role: "system", content: extractionPrompt },
                  {
                    role: "user",
                    content: [
                      { type: "text", text: "Trích xuất thông tin từ bảng báo giá này:" },
                      { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
                    ],
                  },
                ],
                max_tokens: MAX_AI_OUTPUT_TOKENS,
              }),
              VISION_EXTRACTION_TIMEOUT_MS,
              "Vision-Gemini-GoogleDirect"
            ),
            VISION_RETRY_COUNT
          );
          return response.choices[0]?.message?.content || "{}";
        },
      },
      {
        name: "Gemini 2.5 Flash (AI-Box)",
        run: async () => {
          if (!process.env.AIBOX_API_KEY && !process.env.AIBOX_DEFAULT_API_KEY) {
            throw new Error("AIBOX API key not configured");
          }
          const response = await retryWithBackoff(() =>
            withTimeout(
              defaultAI.chat.completions.create({
                model: MODEL_VISION_ONLY,
                messages: [
                  { role: "system", content: extractionPrompt },
                  {
                    role: "user",
                    content: [
                      { type: "text", text: "Trích xuất thông tin từ bảng báo giá này:" },
                      { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
                    ],
                  },
                ],
                max_tokens: MAX_AI_OUTPUT_TOKENS,
              }),
              VISION_EXTRACTION_TIMEOUT_MS,
              "Vision-Gemini-Aibox"
            ),
            VISION_RETRY_COUNT
          );
          return response.choices[0]?.message?.content || "{}";
        },
      },
    ];

    let extractedRaw: any = null;
    let extractionError: any = null;
    for (const attempt of visionAttempts) {
      try {
        console.log(`[PcBuildVisionWorker] Attempting vision extraction with ${attempt.name}...`);
        const aiContent = await attempt.run();
        extractedRaw = normalizeExtractionResult(cleanAndParseJSON(aiContent));
        if (hasExtractedItems(extractedRaw)) {
          extractionError = null;
          break;
        }
        extractionError = new Error(`${attempt.name} không bóc tách được linh kiện hợp lệ từ ảnh.`);
        console.warn("[PcBuildVisionWorker] Vision extraction returned unusable data:", JSON.stringify(extractedRaw).slice(0, 1000));
      } catch (err: any) {
        extractionError = err;
        console.warn(`[PcBuildVisionWorker] ${attempt.name} failed:`, err?.message || err);
      }
    }

    if (!hasExtractedItems(extractedRaw)) {
      throw extractionError || new Error("AI Vision không bóc tách được linh kiện hợp lệ từ ảnh.");
    }

    await updatePcBuildProgress(id, type, {
      analysis_step: "deepseek",
      analysis_message: "Đã đọc xong ảnh. DeepSeek đang phân loại linh kiện và kiểm tra tương thích...",
      extracted_raw: extractedRaw,
    });

    try {
      if (IS_VERCEL) {
        await triggerPcBuildCompatibilityJob(id, type);
      } else {
        await processPcBuildCompatibilityFromStored(id, type);
      }
    } catch (err) {
      if (IS_VERCEL) throw err;
      console.warn("[PcBuildVisionWorker] DeepSeek queue trigger failed locally, running inline:", err);
      await processPcBuildCompatibilityFromStored(id, type);
    }
    console.log(`[PcBuildVisionWorker] Vision extraction finished and DeepSeek job queued for ${type} ${id}.`);
  } catch (error: any) {
    console.error(`[PcBuildVisionWorker] Failed for ${type} ${id}:`, error);
    await markPcBuildError(id, type, getFriendlyPcBuildError(error, "vision"));
  }
}

export async function processPcBuildCompatibilityFromStored(
  id: string,
  type: "checkin" | "submission"
) {
  console.log(`[PcBuildDeepSeekWorker] Starting compatibility analysis for ${type} ${id}...`);

  try {
    let expectedBudget = 0;
    let expectedNeed = "Không có";
    let expectedReqs = "Không có";
    let extractedRaw: any = null;
    let currentPayload: any = {};

    if (type === "checkin") {
      const checkin = await db.checkin.findUnique({
        where: { id },
        include: { pc_task: true },
      });
      if (!checkin) throw new Error("Không tìm thấy checkin để phân tích DeepSeek.");
      currentPayload = (checkin.build_data as any) || {};
      extractedRaw = currentPayload.extracted_raw;
      if (checkin.pc_task) {
        expectedBudget = checkin.pc_task.max_budget;
        expectedNeed = checkin.pc_task.customer_need;
        expectedReqs = checkin.pc_task.requirements;
      }
    } else {
      const submission = await db.pcSubmission.findUnique({
        where: { id },
        include: { exercise: true },
      });
      if (!submission) throw new Error("Không tìm thấy submission để phân tích DeepSeek.");
      currentPayload = (submission.parts_answer as any) || {};
      extractedRaw = currentPayload.extracted_raw;
      const reqs = submission.exercise.requirements as any;
      expectedBudget = Number(reqs?.budget) || 0;
      expectedNeed = `${submission.exercise.title} - ${submission.exercise.description} (${reqs?.useCase || ""})`;
      expectedReqs = `Ràng buộc: ${Array.isArray(reqs?.constraints) ? reqs.constraints.join(", ") : ""}`;
    }

    if (!hasExtractedItems(extractedRaw)) {
      throw new Error("Thiếu dữ liệu linh kiện đã bóc tách để DeepSeek phân tích.");
    }

    const approvedBudgetLimitText = expectedBudget > 0 ? formatVND(getApprovedBudgetLimit(expectedBudget)) : "Không giới hạn";

    await updatePcBuildProgress(id, type, {
      analysis_step: "deepseek",
      analysis_message: "DeepSeek đang phân loại linh kiện và kiểm tra tương thích...",
    });

    // Shorten item names to reduce token count and prevent output truncation
    const shortenedItems = Array.isArray(extractedRaw?.items)
      ? extractedRaw.items.map((item: any) => ({
          name: typeof item.name === "string" && item.name.length > 90 ? item.name.slice(0, 90) : item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        }))
      : [];
    const shortenedRaw = { ...extractedRaw, items: shortenedItems };

    const DEEPSEEK_PROMPT = `
Bạn là hệ thống chuyên gia tự động hóa phân loại và duyệt cấu hình PC chuyên nghiệp của công ty SP-CyberSoft.
Phân tích danh sách linh kiện thô từ OCR, phân loại vào danh mục chuẩn, tính tổng giá và kiểm tra tương thích theo đề bài.

DỮ LIỆU ĐỀ BÀI:
- Nhu cầu khách hàng: "${expectedNeed}"
- Ngân sách tối đa: ${expectedBudget > 0 ? expectedBudget.toLocaleString("vi-VN") + " VNĐ" : "Không giới hạn"}
- Giới hạn được phép duyệt (ngân sách + 2%): ${approvedBudgetLimitText}
- Yêu cầu cấu hình khác: "${expectedReqs}"

LINH KIỆN THÔ:
${JSON.stringify(shortenedRaw, null, 2)}

DANH MỤC CHUẨN:
cpu, mainboard, ram, vga, ssd, psu, case, cooler_fan, monitor, keyboard_mouse, headphone, desk_chair.
Nếu thiếu danh mục, trả về { "name": "", "price": 0 }.

QUY TẮC KIỂM TRA:
- Socket: Intel gen 12/13/14 LGA1700 tương thích H610/B660/B760/Z690/Z790; Intel gen 10/11 LGA1200 tương thích H410/H510/B460/B560/Z490/Z590; Ryzen AM4 tương thích A320/B450/B550/X570; Ryzen AM5 tương thích A620/B650/X670.
- Display output: Nếu không có card đồ họa rời (VGA trống/không có giá), CPU bắt buộc phải có iGPU/xuất hình. Intel đuôi F/KF không có iGPU; Intel không có đuôi F thường có iGPU. AMD Ryzen AM4 đa số không có iGPU trừ dòng G/GE; Ryzen 7500F không có iGPU; Ryzen AM5 phổ thông thường có iGPU cơ bản. Nếu không có VGA rời và CPU chắc chắn không có iGPU -> display_output FAIL. Nếu có VGA rời -> PASS.
- RAM DDR4/DDR5 phải đúng loại mainboard.
- PSU phải đủ CPU + VGA và dư an toàn 100W-150W.
- Case nhỏ/ITX có thể không vừa main ATX; mid/full tower thường vừa ATX/mATX/ITX.
- Đáp ứng yêu cầu đề bài: Kiểm tra trước ngân sách. Cấu hình phải đúng nhu cầu khách hàng và các ràng buộc bắt buộc của đề bài (mục đích sử dụng, CPU/RAM/SSD/VGA tối thiểu, màn hình/phụ kiện nếu đề yêu cầu). Nếu sai hoặc thiếu yêu cầu trọng yếu, requirement_fit phải FAIL dù tổng giá vẫn nằm trong ngân sách.
- Phụ kiện/bộ hoàn thiện: Nếu đề không ghi rõ không yêu cầu, thiếu tản nhiệt rời, LCD/màn hình, bàn phím hoặc chuột thì checks.peripherals phải WARN hoặc FAIL tùy mức độ thiếu; nêu rõ đang thiếu món nào.
- Budget PASS nếu tổng giá <= ngân sách. WARN nếu tổng giá > ngân sách nhưng <= ngân sách + 2%. FAIL nếu tổng giá vượt quá ngân sách + 2%.
- isApproved=true chỉ khi: requirement_fit không FAIL, display_output không FAIL, total_price <= ngân sách + 2% VÀ không FAIL kỹ thuật (socket/ram/power/case). Budget WARN vẫn có thể isApproved=true.
- QUY TẮC NHẤT QUÁN: Nếu isApproved=true thì "reason" phải giải thích vì sao ĐẠT. Nếu isApproved=false thì "reason" nêu lý do từ chối. Không được viết reason mâu thuẫn với isApproved.
${STRICT_PC_BUILD_REVIEW_RULES}

BẮT BUỘC chỉ trả về JSON:
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
    "display_output": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "ram": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "power": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "case": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "requirement_fit": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "budget": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "peripherals": { "status": "PASS" | "FAIL" | "WARN", "message": "..." }
  }
}`;

    const compatibilityAttempts = [
      async () => {
        console.log("[PcBuildDeepSeekWorker] Attempting compatibility check with DeepSeek Flash...");
        const response = await retryWithBackoff(() =>
          withTimeout(
            defaultAI.chat.completions.create({
              model: MODEL_CHAT_FLASH,
              messages: [{ role: "user", content: DEEPSEEK_PROMPT }],
              response_format: { type: "json_object" },
              max_tokens: MAX_AI_OUTPUT_TOKENS,
            }),
            COMPATIBILITY_TIMEOUT_MS,
            "Compat-Flash"
          ),
          AI_RETRY_COUNT
        );
        return cleanAndParseJSON(response.choices[0]?.message?.content || "{}");
      },
      ...(ENABLE_PRO_COMPATIBILITY_FALLBACK
        ? [
            async () => {
              console.log("[PcBuildDeepSeekWorker] Attempting compatibility check with DeepSeek Pro...");
              const response = await retryWithBackoff(() =>
                withTimeout(
                  defaultAI.chat.completions.create({
                    model: MODEL_CHAT_PRO,
                    messages: [{ role: "user", content: DEEPSEEK_PROMPT }],
                    response_format: { type: "json_object" },
                    max_tokens: MAX_AI_OUTPUT_TOKENS,
                  }),
                  COMPATIBILITY_TIMEOUT_MS,
                  "Compat-Pro"
                ),
                AI_RETRY_COUNT
              );
              return cleanAndParseJSON(response.choices[0]?.message?.content || "{}");
            },
          ]
        : []),
    ];

    let result: any = null;
    let compatibilityError: any = null;
    for (const attempt of compatibilityAttempts) {
      try {
        result = ensureCompatibilityChecks(await attempt());
        if (hasFinalPcBuildResult(result)) {
          compatibilityError = null;
          break;
        }
      } catch (err: any) {
        compatibilityError = err;
        console.warn("[PcBuildDeepSeekWorker] Compatibility attempt failed:", err.message || err);
      }
    }

    if (!hasFinalPcBuildResult(result)) {
      throw new Error(`DeepSeek không trả về kết quả hợp lệ. Lỗi cuối cùng: ${compatibilityError?.message || "Không xác định"}`);
    }

    result = enforcePcBuildBudgetLimit(enforceRequirementFitGate(result), expectedBudget);
    result.requirements_text = `${expectedNeed}\n${expectedReqs}`;

    const formattedData: any = {};
    for (const [key, val] of Object.entries(result.matched_parts || {})) {
      if (key === "total_price") {
        formattedData[key] = val;
      } else {
        const v = val as any;
        formattedData[key] = {
          name: v.name || "",
          price: Number(v.price) || 0,
          partId: "",
        };
      }
    }

    const finalStatus = result.isApproved ? "APPROVED" : "REJECTED";
    const strictScore = calculateStrictPcBuildScore(result, expectedBudget);
    const feedback = `${result.reason || ""}\n\n[Báo cáo tương thích]\n- Xuất hình: ${result.checks?.display_output?.message || ""}\n- Socket: ${result.checks?.socket?.message || ""}\n- RAM: ${result.checks?.ram?.message || ""}\n- PSU: ${result.checks?.power?.message || ""}\n- Case: ${result.checks?.case?.message || ""}\n- Phụ kiện: ${result.checks?.peripherals?.message || ""}\n- Ngân sách: ${result.checks?.budget?.message || ""}`;

    if (type === "checkin") {
      const isDraft = currentPayload.is_draft === true;
      await db.checkin.update({
        where: { id },
        data: {
          status: isDraft ? "PENDING" : finalStatus,
          reviewed_at: isDraft ? undefined : new Date(),
          reject_reason: isDraft || result.isApproved ? null : result.reason || "Cấu hình không đạt yêu cầu.",
          build_data: {
            ...formattedData,
            checks: result.checks || {},
            reason: result.reason || "",
            is_analyzing: false,
            analysis_step: "done",
            analysis_message: "Hoàn tất phân tích cấu hình.",
            extracted_raw: extractedRaw,
            is_draft: isDraft,
            is_approved: !!result.isApproved,
            temp_ai_score: strictScore,
            temp_ai_feedback: feedback,
            explanation: currentPayload.explanation || "",
          },
        },
      });
    } else {
      const isDraft = currentPayload.is_draft === true;
      const partsAnswer = Object.entries(formattedData)
        .filter(([key, value]) => key !== "total_price" && value && (value as any).name)
        .map(([key, value]) => ({
          category: key,
          name: (value as any).name,
          price: Number((value as any).price) || 0,
          reason: "",
        }));

      await db.pcSubmission.update({
        where: { id },
        data: {
          status: isDraft ? "PENDING" : finalStatus,
          reviewed_at: isDraft ? undefined : new Date(),
          reject_reason: isDraft || result.isApproved ? null : result.reason || "Cấu hình không đạt yêu cầu.",
          parts_answer: {
            parts: partsAnswer,
            checks: result.checks || {},
            reason: result.reason || "",
            total_price: formattedData.total_price || 0,
            is_draft: isDraft,
            is_approved: !!result.isApproved,
            is_analyzing: false,
            analysis_step: "done",
            analysis_message: "Hoàn tất phân tích cấu hình.",
            extracted_raw: extractedRaw,
            temp_ai_score: strictScore,
            temp_ai_feedback: feedback,
          },
          ai_score: isDraft ? null : strictScore,
          ai_feedback: isDraft ? null : feedback,
        },
      });
    }

    try {
      revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");
      revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
    } catch (_) { /* ignore outside Next.js request context */ }
    console.log(`[PcBuildDeepSeekWorker] Finished compatibility analysis for ${type} ${id}.`);
  } catch (error: any) {
    console.error(`[PcBuildDeepSeekWorker] Failed for ${type} ${id}:`, error);
    await markPcBuildError(id, type, getFriendlyPcBuildError(error, "deepseek"));
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

    const isExcel = imageUrl.startsWith("data:application/vnd") || imageUrl.includes("spreadsheetml") || imageUrl.includes("excel");
    let excelText = "";

    if (isExcel) {
      console.log("[BackgroundWorker] Excel file detected. Parsing sheet data...");
      try {
        const base64Data = imageUrl.split(",")[1] || imageUrl;
        const buffer = Buffer.from(base64Data, "base64");
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const formattedRows = rawRows
          .filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ""))
          .map((row, idx) => `Dòng ${idx + 1}: ${row.map(cell => cell !== null && cell !== undefined ? String(cell).trim() : "").join(" | ")}`);
        
        excelText = formattedRows.join("\n");
        console.log(`[BackgroundWorker] Excel parsed successfully: ${rawRows.length} rows`);
      } catch (err: any) {
        console.error("[BackgroundWorker] Failed to parse Excel sheet:", err);
        throw new Error(`Không thể giải mã file Excel báo giá: ${err.message || err}`);
      }
    } else {
      try {
        imageUrl = await optimizeImageForVision(imageUrl);
      } catch (err) {
        console.warn("[BackgroundWorker] Image optimization failed, using original:", err);
      }
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
    const approvedBudgetLimitText = expectedBudget > 0 ? formatVND(getApprovedBudgetLimit(expectedBudget)) : "Không giới hạn";

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
- Giới hạn được phép duyệt (ngân sách + 2%): ${approvedBudgetLimitText}
- Yêu cầu cấu hình khác: "${expectedReqs}"

DANH MỤC CHUẨN:
cpu, mainboard, ram, vga, ssd, psu, case, cooler_fan, monitor, keyboard_mouse, headphone, desk_chair.

QUY TẮC:
- Nếu một danh mục không có trong báo giá, trả về { "name": "", "price": 0 }.
- total_price là tổng tiền thực tế của các linh kiện.
- Đáp ứng yêu cầu đề bài là điều kiện kiểm tra đầu tiên. Cấu hình phải đúng nhu cầu khách hàng và các ràng buộc bắt buộc của đề bài (mục đích sử dụng, CPU/RAM/SSD/VGA tối thiểu, màn hình/phụ kiện nếu đề yêu cầu). Nếu sai hoặc thiếu yêu cầu trọng yếu, requirement_fit phải FAIL dù ngân sách hợp lệ.
- Nếu không có card đồ họa rời (VGA trống/không có giá), CPU bắt buộc phải có iGPU/xuất hình. Intel đuôi F/KF không có iGPU; Intel không có đuôi F thường có iGPU. AMD Ryzen AM4 đa số không có iGPU trừ dòng G/GE; Ryzen 7500F không có iGPU; Ryzen AM5 phổ thông thường có iGPU cơ bản. Nếu không có VGA rời và CPU chắc chắn không có iGPU -> display_output FAIL. Nếu có VGA rời -> PASS.
- Nếu có tản nhiệt rời trong cooler_fan, kiểm tra tản nhiệt có bracket/ngàm hỗ trợ socket CPU tương ứng (LGA1700, LGA1200, AM4, AM5...). Đây là tiêu chí nhắc nhở mềm: PASS nếu tên/model nêu rõ hỗ trợ socket đó; WARN nếu không đủ thông tin hoặc có dấu hiệu chưa đảm bảo. Không dùng tiêu chí này để đánh rớt bài.
- Budget PASS nếu tổng giá <= ngân sách. WARN nếu tổng giá > ngân sách nhưng <= ngân sách + 2%. FAIL nếu tổng giá vượt quá ngân sách + 2%.
- isApproved=true chỉ khi: requirement_fit không FAIL, display_output không FAIL, total_price <= ngân sách + 2% VÀ không FAIL kỹ thuật (socket/ram/power/case). Budget WARN vẫn có thể isApproved=true.
- Nếu isApproved=true: "reason" phải giải thích vì sao ĐẠT (kể cả nếu có cảnh báo nhẹ). Nếu isApproved=false: "reason" nêu rõ lý do cụ thể từ chối. Không được nói "vượt quá giới hạn ngân sách" khi isApproved=true.
- Nếu đề không ghi rõ không yêu cầu, thiếu tản nhiệt rời, LCD/màn hình, bàn phím hoặc chuột thì checks.peripherals phải WARN hoặc FAIL tùy mức độ thiếu; nêu rõ đang thiếu món nào.
${STRICT_PC_BUILD_REVIEW_RULES}

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
    "display_output": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "ram": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "power": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "case": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "requirement_fit": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "budget": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "peripherals": { "status": "PASS" | "FAIL" | "WARN", "message": "..." }
  }
}`;

    try {
      if (!isExcel && process.env.OPENAI_API_KEY) {
        console.log("[BackgroundWorker] Attempting Vercel fast-path single vision analysis via Gemini 2.5 Flash (v98store)...");
        const fastResponse = await retryWithBackoff(() =>
          withTimeout(
            openaiAI.chat.completions.create({
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
            FAST_PATH_TIMEOUT_MS,
            "FastPath-Gemini"
          ),
          VISION_RETRY_COUNT
        );

        const fastContent = fastResponse.choices[0]?.message?.content || "{}";
        console.log("[BackgroundWorker] Fast-path raw preview:", fastContent.slice(0, 500));
        const fastResult = ensureCompatibilityChecks(cleanAndParseJSON(fastContent));
        if (hasFinalPcBuildResult(fastResult)) {
          result = enforcePcBuildBudgetLimit(enforceRequirementFitGate(fastResult), expectedBudget);
          console.log("[BackgroundWorker] Fast-path (Gemini) analysis completed successfully.");
        } else {
          console.warn("[BackgroundWorker] Fast-path (Gemini) returned unusable result:", JSON.stringify(fastResult).slice(0, 1000));
        }
      }
    } catch (err: any) {
      console.warn("[BackgroundWorker] Fast-path (Gemini) analysis failed:", err.message || err);
    }

    if (!result) {
    if (IS_VERCEL && Date.now() - analysisStartedAt > 55_000) {
      throw new Error("Fast-path AI không trả về kết quả kịp trong giới hạn Vercel, dừng fallback để tránh timeout và tốn thêm token.");
    }

    // 1. Call AI vision model (or direct Excel parsing) to extract raw items
    let extractedRaw: any = null;
    let extractionError: any = null;

    if (isExcel) {
      console.log("[BackgroundWorker] Performing direct JSON extraction from Excel text...");
      const excelExtractPrompt = `Bạn là trợ lý kế toán chuyên nghiệp. Dưới đây là dữ liệu thô trích xuất từ file Excel báo giá (các cột phân tách bởi dấu |).
Hãy phân tích dữ liệu này và trích xuất tất cả các mục linh kiện, đơn giá, số lượng và thành tiền.
Dữ liệu Excel:
${excelText}

Trả về kết quả dưới định dạng JSON cấu trúc sau:
{ "items": [{ "name": "...", "quantity": 0, "price": 0, "total": 0 }], "currency": "VND", "total_amount": 0 }
Nếu thông tin nào không rõ ràng, hãy để là null.`;

      try {
        const response = await retryWithBackoff(() =>
          withTimeout(
            defaultAI.chat.completions.create({
              model: MODEL_CHAT_FLASH,
              messages: [{ role: "user", content: excelExtractPrompt }],
              response_format: { type: "json_object" },
            }),
            VISION_EXTRACTION_TIMEOUT_MS,
            "Background-Excel"
          )
        );
        const aiContent = response.choices[0]?.message?.content || "{}";
        console.log("[BackgroundWorker] Excel extraction raw preview:", aiContent.slice(0, 500));
        extractedRaw = normalizeExtractionResult(cleanAndParseJSON(aiContent));
      } catch (err) {
        console.error("[BackgroundWorker] Excel AI extraction failed:", err);
        extractionError = err;
      }
    } else {
      const extractionPrompt = `Bạn là trợ lý kế toán chuyên nghiệp. Hãy phân tích hình ảnh báo giá này, trích xuất tất cả các mục linh kiện, đơn giá, số lượng và thành tiền.
Đọc bảng từ trên xuống dưới, chỉ lấy dòng hàng hóa/linh kiện có tên sản phẩm và giá tiền; bỏ logo, header, hotline, địa chỉ, ghi chú.
Giữ nguyên mã sản phẩm quan trọng, không tự bịa phần không đọc rõ. Giá tiền trả về dạng số nguyên VND.
Trả về kết quả dưới định dạng JSON cấu trúc sau:
{ "items": [{ "name": "...", "quantity": 0, "price": 0, "total": 0 }], "currency": "VND", "total_amount": 0 }
Nếu thông tin nào không rõ ràng, hãy để là null.`;

      const extractionAttempts = [
        async () => {
          if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY not configured");
          }
          console.log("[BackgroundWorker] Attempting extraction via Gemini 2.5 Flash (v98store)...");
          const response = await retryWithBackoff(() =>
            withTimeout(
              openaiAI.chat.completions.create({
                model: MODEL_VISION_ONLY,
                messages: [
                  { role: "system", content: extractionPrompt },
                  {
                    role: "user",
                    content: [
                      { type: "text", text: "Trích xuất thông tin từ bảng báo giá này:" },
                      { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
                    ],
                  },
                ],
                max_tokens: 4000,
              }),
              VISION_EXTRACTION_TIMEOUT_MS,
              "Background-Gemini"
            ),
            VISION_RETRY_COUNT
          );
          const aiContent = response.choices[0]?.message?.content || "{}";
          return normalizeExtractionResult(cleanAndParseJSON(aiContent));
        },
      ];

      for (const attempt of extractionAttempts) {
        try {
          extractedRaw = normalizeExtractionResult(await attempt());
          if (hasExtractedItems(extractedRaw)) {
            extractionError = null;
            console.log("[BackgroundWorker] Successfully extracted parts from image.");
            break;
          }
          console.warn("[BackgroundWorker] Extraction returned no unusable items:", JSON.stringify(extractedRaw).slice(0, 1000));
        } catch (err: any) {
          console.warn(`[BackgroundWorker] Extraction attempt failed:`, err.message || err);
          extractionError = err;
        }
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
- Giới hạn được phép duyệt (ngân sách + 2%): ${approvedBudgetLimitText}
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
2. Display Output (Khả năng xuất hình):
   - Nếu cấu hình không có card đồ họa rời trong vga, CPU bắt buộc phải có iGPU/xuất hình.
   - Intel Core có hậu tố F hoặc KF không có iGPU; ví dụ i5-12400F, i5-13400F, i7-14700F -> nếu không có VGA rời thì FAIL.
   - Intel Core không có hậu tố F thường có iGPU; ví dụ i5-12400, i5-13400, i7-14700 -> PASS nếu không có VGA rời.
   - AMD Ryzen AM4 đa số không có iGPU trừ dòng G/GE; ví dụ Ryzen 5 5600/5700X không có iGPU -> nếu không có VGA rời thì FAIL, Ryzen 5 5600G/5700G -> PASS.
   - AMD Ryzen 7500F không có iGPU; Ryzen AM5 phổ thông như 7600/7700/7900 thường có iGPU cơ bản -> PASS nếu không có VGA rời.
   - Nếu có VGA rời hợp lệ -> display_output PASS.
4. RAM (DDR4 / DDR5 & Mainboard):
   - RAM DDR4 tương thích với Mainboard hỗ trợ DDR4. RAM DDR5 tương thích với Mainboard hỗ trợ DDR5.
   - Nếu Mainboard hỗ trợ DDR4 nhưng chọn RAM DDR5 (hoặc ngược lại) -> Báo FAIL.
5. Power (Nguồn PSU & VGA/CPU):
   - Đảm bảo công suất nguồn (Watts) đủ tải cho CPU + VGA và có khoảng an toàn tối thiểu 100W-150W.
   - RTX 3050/4060: tối thiểu 450W - 500W.
   - RTX 3060/4060 Ti: tối thiểu 550W.
   - RTX 3070/4070: tối thiểu 650W.
   - RTX 3080/4080/4090: tối thiểu 750W - 850W.
6. Case Size & Mainboard:
   - Vỏ case Mini-Tower hoặc ITX nhỏ gọn có thể không vừa Mainboard ATX lớn (chỉ vừa m-ATX, ITX).
   - Vỏ case Mid-Tower / Full-Tower thông thường đều vừa tất cả kích thước Mainboard (ATX, m-ATX, ITX).
7. Budget (Ngân sách):
   - Tổng tiền thực tế của cấu hình (matched_parts.total_price) không được vượt quá ngân sách tối đa của đề bài hơn 2%.
   - Nếu tổng tiền thực tế <= ngân sách tối đa -> Đánh giá trạng thái budget là "PASS".
   - Nếu tổng tiền thực tế > ngân sách tối đa nhưng <= ngân sách + 2% -> Đánh giá trạng thái budget là "WARN" kèm ghi chú vượt nhẹ nhưng vẫn hợp lệ.
   - Nếu tổng tiền thực tế > ngân sách + 2% -> Đánh giá trạng thái budget là "FAIL".
8. Requirement Fit (Mức độ đáp ứng yêu cầu đề bài):
   - Đây là cổng kiểm tra đầu tiên và quan trọng nhất, phải đánh giá trước khi xét ngân sách.
   - Đối chiếu cấu hình với nhu cầu khách hàng và toàn bộ ràng buộc bắt buộc: mục đích sử dụng, phân khúc CPU, dung lượng RAM, dung lượng SSD, yêu cầu VGA rời, màn hình/phụ kiện nếu đề bài yêu cầu.
   - Nếu cấu hình sai mục đích, thiếu linh kiện bắt buộc, hoặc thấp hơn yêu cầu tối thiểu trọng yếu -> requirement_fit là "FAIL" và isApproved=false, kể cả khi tổng tiền nằm trong ngân sách.
9. Peripherals (Phụ kiện/bộ hoàn thiện):
   - Nếu đề không ghi rõ không yêu cầu, thiếu tản nhiệt rời, LCD/màn hình, bàn phím hoặc chuột thì checks.peripherals phải WARN hoặc FAIL tùy mức độ thiếu; nêu rõ đang thiếu món nào.

QUY TẮC DUYỆT BÀI (isApproved):
- Đặt "isApproved": true nếu thỏa mãn:
  - Cấu hình đáp ứng đúng yêu cầu đề bài; requirement_fit không được FAIL.
  - Nếu không có VGA rời, CPU phải có iGPU/xuất hình; display_output không được FAIL.
  - Tổng giá (total_price) <= Ngân sách đề bài + 2%.
  - Không bị FAIL ở bất kỳ kiểm tra kỹ thuật nghiêm trọng nào (Socket, RAM, Power).
- Ngược lại đặt "isApproved": false.
- QUY TẮC NHẤT QUÁN BẮT BUỘC: Nếu isApproved=true thì "reason" phải giải thích tích cực vì sao CẤU HÌNH ĐẠT (có thể nêu cảnh báo vượt nhỏ nhưng phải kết luận là hợp lệ). Nếu isApproved=false thì "reason" nêu rõ lý do từ chối. Không được viết reason mâu thuẫn với isApproved.
${STRICT_PC_BUILD_REVIEW_RULES}

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
    "display_output": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "ram": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "power": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "case": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "requirement_fit": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "budget": { "status": "PASS" | "FAIL" | "WARN", "message": "..." },
    "peripherals": { "status": "PASS" | "FAIL" | "WARN", "message": "..." }
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
          COMPATIBILITY_TIMEOUT_MS,
          "Background-Compat-Flash"
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
          COMPATIBILITY_TIMEOUT_MS,
          "Background-Compat-Pro"
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

    result = enforcePcBuildBudgetLimit(enforceRequirementFitGate(ensureCompatibilityChecks(result)), expectedBudget);
    result.requirements_text = `${expectedNeed}\n${expectedReqs}`;

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

    const finalStatus = result.isApproved ? "AUTO_APPROVED" : "REJECTED";
    const strictScore = calculateStrictPcBuildScore(result, expectedBudget);
    const feedback = `${result.reason || ""}\n\n[Báo cáo tương thích]\n- Xuất hình: ${result.checks?.display_output?.message || ""}\n- Socket: ${result.checks?.socket?.message || ""}\n- RAM: ${result.checks?.ram?.message || ""}\n- PSU: ${result.checks?.power?.message || ""}\n- Case: ${result.checks?.case?.message || ""}\n- Phụ kiện: ${result.checks?.peripherals?.message || ""}\n- Ngân sách: ${result.checks?.budget?.message || ""}`;

    // 4. Update database record
    if (type === "checkin") {
      const checkin = await db.checkin.findUnique({ where: { id } });
      const currentBuildData = (checkin?.build_data as any) || {};
      const isDraft = currentBuildData.is_draft === true;

      await db.checkin.update({
        where: { id },
        data: {
          status: isDraft ? "PENDING" : finalStatus,
          reviewed_at: isDraft ? undefined : new Date(),
          reject_reason: isDraft || result.isApproved ? null : result.reason || "Cấu hình không đạt yêu cầu.",
          build_data: {
            ...formattedData,
            checks: result.checks || {},
            reason: result.reason || "",
            is_analyzing: false,
            is_draft: isDraft,
            is_approved: !!result.isApproved,
            temp_ai_score: strictScore,
            temp_ai_feedback: feedback,
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
          reviewed_at: isDraft ? undefined : new Date(),
          reject_reason: isDraft || result.isApproved ? null : result.reason || "Cấu hình không đạt yêu cầu.",
          parts_answer: {
            parts: parts_answer,
            checks: result.checks || {},
            reason: result.reason || "",
            total_price: formattedData.total_price || 0,
            is_draft: isDraft,
            is_approved: !!result.isApproved,
            is_analyzing: false,
            temp_ai_score: strictScore,
            temp_ai_feedback: feedback,
          },
          ai_score: isDraft ? null : strictScore,
          ai_feedback: isDraft ? null : feedback,
        },
      });
    }

    console.log(`[BackgroundWorker] Finished PC Build analysis for ${type} ${id} with status ${finalStatus}.`);
    
    // Revalidate cache tags
    try {
      revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");
      revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
    } catch (_) { /* ignore outside Next.js request context */ }
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
