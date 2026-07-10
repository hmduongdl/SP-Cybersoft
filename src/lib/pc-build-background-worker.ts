import { db } from "@/lib/db";
import { defaultAI, openaiAI, googleGeminiAI, MODEL_VISION_ONLY, MODEL_VISION_LITE, MODEL_CHAT_FLASH, MODEL_CHAT_PRO } from "@/lib/aibox";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import sharp from "sharp";
import * as XLSX from "xlsx";
import { getEffectivePlan } from "@/lib/plan-utils";
import { getPlanPauseState } from "@/lib/plan-pause";
import {
  isKnownArrowLakePair,
  isPantherLakeDesktopMisread,
  normalizeHardwareMatch,
} from "@/lib/pc-build-hardware-config";
import { buildCompatibilityPrompt } from "@/lib/pc-build-prompts";

const normalizeForRequirementMatch = normalizeHardwareMatch;

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

const repairTruncatedJSON = (str: string): string => {
  let repaired = str.trim();

  // Cắt tại item hoàn chỉnh cuối cùng nếu response bị truncate giữa object
  const lastCompleteItem = repaired.lastIndexOf("},");
  if (lastCompleteItem > 0) {
    repaired = repaired.slice(0, lastCompleteItem + 1);
  } else {
    const lastBrace = repaired.lastIndexOf("}");
    if (lastBrace > 0) {
      repaired = repaired.slice(0, lastBrace + 1);
    }
  }

  // Đóng các bracket/brace còn mở (bỏ qua ký tự trong string)
  const stack: Array<"{" | "["> = [];
  let inString = false;
  let escaped = false;
  for (const ch of repaired) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") stack.push("{");
    else if (ch === "[") stack.push("[");
    else if ((ch === "}" || ch === "]") && stack.length > 0) stack.pop();
  }

  while (stack.length > 0) {
    repaired += stack.pop() === "[" ? "]" : "}";
  }

  return repaired;
};

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
      const repaired = repairTruncatedJSON(cleanStr);
      try {
        return JSON.parse(repaired);
      } catch (_2) {
        console.error("[cleanAndParseJSON] Failed to parse (even after repair):", cleanStr.slice(0, 500));
        return {};
      }
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

/** Hệ số trừ điểm — chỉnh tập trung khi có phản hồi từ học viên/giảng viên */
const SCORE_PENALTIES = {
  missingCooler: 6,
  missingMonitor: 8,
  missingKeyboard: 5,
  missingMouse: 5,
  technicalFailEach: 20,
  approvedWithFailBase: 80,
  failEach: 10,
  warnEach: 3,
  failEachRejected: 12,
  rejectedRequirementBase: 45,
  rejectedTechnicalBase: 35,
  rejectedFailBase: 55,
  rejectedMin: 35,
  approvedMin: 70,
  perfectScore: 100,
  budgetWarnBase: 94,
  approvedBase: 98,
} as const;

const VISION_MODEL_IDS = {
  GEMINI_LITE: "gemini-3.1-flash-lite",
  GEMINI_FLASH: "gemini-3.5-flash",
  GEMINI_LOCAL: "gemini-2.5-flash",
  GPT4O_MINI: "gpt-4o-mini",
} as const;

type UserPlan = "FREE" | "PRO" | "MAX";

const VISION_MODEL_BY_PLAN: Record<UserPlan | "LOCAL", { primary: string; fallback: string; tertiary: string }> = {
  LOCAL: {
    primary: VISION_MODEL_IDS.GEMINI_LOCAL,
    fallback: VISION_MODEL_IDS.GEMINI_LOCAL,
    tertiary: VISION_MODEL_IDS.GPT4O_MINI,
  },
  FREE: {
    primary: VISION_MODEL_IDS.GEMINI_LITE,
    fallback: VISION_MODEL_IDS.GEMINI_FLASH,
    tertiary: VISION_MODEL_IDS.GPT4O_MINI,
  },
  PRO: {
    primary: VISION_MODEL_IDS.GEMINI_LITE,
    fallback: VISION_MODEL_IDS.GEMINI_FLASH,
    tertiary: VISION_MODEL_IDS.GPT4O_MINI,
  },
  MAX: {
    primary: VISION_MODEL_IDS.GEMINI_FLASH,
    fallback: VISION_MODEL_IDS.GEMINI_LITE,
    tertiary: VISION_MODEL_IDS.GPT4O_MINI,
  },
};

function getVisionModelsForPlan(userPlan: UserPlan, isLocal: boolean) {
  return VISION_MODEL_BY_PLAN[isLocal ? "LOCAL" : userPlan];
}

function isMaxHostFastPath(userPlan: UserPlan, isLocal: boolean): boolean {
  return userPlan === "MAX" && !isLocal;
}

function getCompatGeminiModel(userPlan: UserPlan, isLocal: boolean): string {
  if (isMaxHostFastPath(userPlan, isLocal)) {
    return VISION_MODEL_IDS.GEMINI_FLASH;
  }
  return isLocal ? VISION_MODEL_IDS.GEMINI_LOCAL : VISION_MODEL_IDS.GEMINI_LITE;
}

function getCompatProgressMessage(
  userPlan: UserPlan,
  isLocal: boolean,
  phase: "active" | "after_vision" | "after_excel"
): string {
  if (isMaxHostFastPath(userPlan, isLocal)) {
    if (phase === "after_vision") {
      return "Đã đọc xong ảnh. Gemini 3.5 đang kiểm tra tương thích...";
    }
    if (phase === "after_excel") {
      return "Đã đọc xong file Excel. Gemini 3.5 đang kiểm tra tương thích...";
    }
    return "Gemini 3.5 đang phân tích cấu hình...";
  }
  if (phase === "after_vision") {
    return "Đã đọc xong ảnh. DeepSeek đang phân loại linh kiện và kiểm tra tương thích...";
  }
  if (phase === "after_excel") {
    return "Đã đọc xong file Excel. DeepSeek đang phân loại linh kiện và kiểm tra tương thích...";
  }
  return "DeepSeek đang phân loại linh kiện và kiểm tra tương thích...";
}

type PcBuildAnalysisContext = {
  userPlan: UserPlan;
  expectedBudget: number;
  expectedNeed: string;
  expectedReqs: string;
  currentPayload: any;
  extractedRaw: any;
};

async function loadPcBuildAnalysisContext(
  id: string,
  type: "checkin" | "submission"
): Promise<PcBuildAnalysisContext> {
  let userPlan: UserPlan = "FREE";
  let expectedBudget = 0;
  let expectedNeed = "Không có";
  let expectedReqs = "Không có";
  let currentPayload: any = {};
  let extractedRaw: any = null;

  if (type === "checkin") {
    const checkin = await db.checkin.findUnique({
      where: { id },
      include: { pc_task: true, user: true },
    });
    if (!checkin) throw new Error("Không tìm thấy checkin.");
    currentPayload = (checkin.build_data as any) || {};
    extractedRaw = currentPayload.extracted_raw ?? null;
    if (checkin.user) {
      userPlan = getEffectivePlan(
        checkin.user.role,
        checkin.user.plan,
        checkin.user.plan_expires_at,
        getPlanPauseState(checkin.user)
      );
    }
    if (checkin.pc_task) {
      expectedBudget = checkin.pc_task.max_budget;
      expectedNeed = checkin.pc_task.customer_need;
      expectedReqs = checkin.pc_task.requirements;
    }
  } else {
    const submission = await db.pcSubmission.findUnique({
      where: { id },
      include: { exercise: true, user: true },
    });
    if (!submission) throw new Error("Không tìm thấy submission.");
    currentPayload = (submission.parts_answer as any) || {};
    extractedRaw = currentPayload.extracted_raw ?? null;
    if (submission.user) {
      userPlan = getEffectivePlan(
        submission.user.role,
        submission.user.plan,
        submission.user.plan_expires_at,
        getPlanPauseState(submission.user)
      );
    }
    const reqs = submission.exercise.requirements as any;
    expectedBudget = Number(reqs?.budget) || 0;
    expectedNeed = `${submission.exercise.title} - ${submission.exercise.description} (${reqs?.useCase || ""})`;
    expectedReqs = `Ràng buộc: ${Array.isArray(reqs?.constraints) ? reqs.constraints.join(", ") : ""}`;
  }

  return { userPlan, expectedBudget, expectedNeed, expectedReqs, currentPayload, extractedRaw };
}

function buildCompatibilityAttempts(
  userPlan: UserPlan,
  isLocal: boolean,
  compatibilityPrompt: string
) {
  const geminiAttempt = (model: string, label: string) => async () => {
    console.log(`[PcBuildCompatWorker] Attempting compatibility check with Gemini (${model})...`);
    const response = await retryWithBackoff(() =>
      withTimeout(
        openaiAI.chat.completions.create({
          model,
          messages: [{ role: "user", content: compatibilityPrompt }],
          response_format: { type: "json_object" },
          max_tokens: MAX_AI_OUTPUT_TOKENS,
        }),
        COMPATIBILITY_TIMEOUT_MS,
        label
      ),
      AI_RETRY_COUNT
    );
    return cleanAndParseJSON(response.choices[0]?.message?.content || "{}");
  };

  if (isMaxHostFastPath(userPlan, isLocal)) {
    return [
      geminiAttempt(VISION_MODEL_IDS.GEMINI_FLASH, "Compat-Gemini35"),
      geminiAttempt(VISION_MODEL_IDS.GEMINI_LITE, "Compat-Gemini31-Lite"),
    ];
  }

  const attempts = [geminiAttempt(getCompatGeminiModel(userPlan, isLocal), "Compat-Gemini31")];

  attempts.push(async () => {
    console.log("[PcBuildCompatWorker] Attempting compatibility check with DeepSeek Flash...");
    const response = await retryWithBackoff(() =>
      withTimeout(
        defaultAI.chat.completions.create({
          model: MODEL_CHAT_FLASH,
          messages: [{ role: "user", content: compatibilityPrompt }],
          response_format: { type: "json_object" },
          max_tokens: MAX_AI_OUTPUT_TOKENS,
        }),
        COMPATIBILITY_TIMEOUT_MS,
        "Compat-Flash"
      ),
      AI_RETRY_COUNT
    );
    return cleanAndParseJSON(response.choices[0]?.message?.content || "{}");
  });

  if (ENABLE_PRO_COMPATIBILITY_FALLBACK) {
    attempts.push(async () => {
      console.log("[PcBuildCompatWorker] Attempting compatibility check with DeepSeek Pro...");
      const response = await retryWithBackoff(() =>
        withTimeout(
          defaultAI.chat.completions.create({
            model: MODEL_CHAT_PRO,
            messages: [{ role: "user", content: compatibilityPrompt }],
            response_format: { type: "json_object" },
            max_tokens: MAX_AI_OUTPUT_TOKENS,
          }),
          COMPATIBILITY_TIMEOUT_MS,
          "Compat-Pro"
        ),
        AI_RETRY_COUNT
      );
      return cleanAndParseJSON(response.choices[0]?.message?.content || "{}");
    });
  }

  return attempts;
}

async function tryMaxHostGeminiFastPath(
  imageUrl: string,
  ctx: Pick<PcBuildAnalysisContext, "expectedBudget" | "expectedNeed" | "expectedReqs">
): Promise<{ result: any; extractedRaw: any } | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const approvedBudgetLimitText =
    ctx.expectedBudget > 0 ? formatVND(getApprovedBudgetLimit(ctx.expectedBudget)) : "Không giới hạn";
  const prompt = buildCompatibilityPrompt({
    expectedNeed: ctx.expectedNeed,
    expectedBudget: ctx.expectedBudget,
    expectedReqs: ctx.expectedReqs,
    approvedBudgetLimitText,
    rawItems: null,
  });

  try {
    console.log("[PcBuildVisionWorker] MAX host fast-path: Gemini 3.5 single-shot analysis...");
    const response = await retryWithBackoff(() =>
      withTimeout(
        openaiAI.chat.completions.create({
          model: VISION_MODEL_IDS.GEMINI_FLASH,
          messages: [
            { role: "system", content: prompt },
            {
              role: "user",
              content: [
                { type: "text", text: "Phân tích báo giá PC này và trả về JSON kết quả cuối:" },
                { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
              ],
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: MAX_AI_OUTPUT_TOKENS,
        }),
        FAST_PATH_TIMEOUT_MS,
        "MaxFastPath-Gemini35"
      ),
      VISION_RETRY_COUNT
    );

    const parsed = ensureCompatibilityChecks(cleanAndParseJSON(response.choices[0]?.message?.content || "{}"));
    if (!hasFinalPcBuildResult(parsed)) return null;

    const result = enforcePcBuildBudgetLimit(
      enforceRequirementFitGate(parsed, `${ctx.expectedNeed}\n${ctx.expectedReqs}`),
      ctx.expectedBudget
    );
    result.requirements_text = `${ctx.expectedNeed}\n${ctx.expectedReqs}`;

    return {
      result,
      extractedRaw: parsed.extracted_raw || parsed.raw_items || null,
    };
  } catch (err: any) {
    console.warn(
      "[PcBuildVisionWorker] MAX host fast-path failed, falling back to 2-step flow:",
      err?.message || err
    );
    return null;
  }
}

async function persistPcBuildCompatibilityResult(
  id: string,
  type: "checkin" | "submission",
  args: {
    result: any;
    extractedRaw: any;
    currentPayload: any;
    expectedBudget: number;
  }
) {
  const { result, extractedRaw, currentPayload, expectedBudget } = args;

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
  const feedback = `${result.reason || ""}\n\n[Báo cáo tương thích]\n- Đề bài: ${result.checks?.requirement_fit?.message || ""}\n- Xuất hình: ${result.checks?.display_output?.message || ""}\n- Socket: ${result.checks?.socket?.message || ""}\n- RAM: ${result.checks?.ram?.message || ""}\n- PSU: ${result.checks?.power?.message || ""}\n- Case: ${result.checks?.case?.message || ""}\n- Phụ kiện: ${result.checks?.peripherals?.message || ""}\n- Ngân sách: ${result.checks?.budget?.message || ""}`;

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
    return;
  }

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

const formatVND = (amount: number): string => `${Math.round(amount).toLocaleString("vi-VN")} VNĐ`;

const getApprovedBudgetLimit = (budget: number): number => {
  return budget > 0 ? Math.floor(budget * (1 + BUDGET_OVERAGE_LIMIT_RATIO)) : 0;
};

const STALE_RELEASE_CLAUSE_PATTERN =
  /(chua ra mat|chua phat hanh|chua co tren thi truong|chua len ke|not yet released|hasn.?t been released)/i;

const isStaleReleaseClause = (clause: string, partNames: string): boolean => {
  const normalizedClause = normalizeForRequirementMatch(clause);
  const normalizedParts = normalizeForRequirementMatch(partNames);
  if (!STALE_RELEASE_CLAUSE_PATTERN.test(normalizedClause)) return false;

  const rtxMatch = normalizedClause.match(/rtx\s*50\d{2}/);
  if (rtxMatch && normalizedParts.includes(rtxMatch[0].replace(/\s/g, ""))) return true;

  if (
    /(vga|card|geforce|rtx|core ultra|ryzen)/.test(normalizedClause) &&
    /(rtx\s*50|core ultra|ryzen\s*9)/.test(normalizedParts)
  ) {
    return true;
  }

  return STALE_RELEASE_CLAUSE_PATTERN.test(normalizedClause);
};

const sanitizeStaleProductRejection = (result: any): any => {
  if (!result?.checks?.requirement_fit) return result;

  const check = result.checks.requirement_fit;
  const status = String(check.status || "").toUpperCase();
  if (status !== "FAIL" && status !== "WARN") return result;

  const partNames = Object.values(result.matched_parts || {})
    .filter((part): part is Record<string, unknown> => !!part && typeof part === "object")
    .map((part) => String(part.name || ""))
    .join(" ");

  const fullText = [check.message, result.reason].filter(Boolean).join(" ");
  const clauses = fullText
    .split(/(?:->|;|\n)+/)
    .map((clause) => clause.trim())
    .filter(Boolean);

  const keptClauses = clauses.filter((clause) => !isStaleReleaseClause(clause, partNames));
  if (keptClauses.length === clauses.length) return result;

  const newMessage =
    keptClauses.join("; ") ||
    "Cấu hình dùng linh kiện có trên báo giá; không đánh giá FAIL vì nhận định sai 'sản phẩm chưa ra mắt'.";

  const hasSubstantiveIssue = keptClauses.some((clause) =>
    /(khong du|thieu|sai|khong dap ung|khong phu hop|vuot|khong dat)/i.test(normalizeForRequirementMatch(clause))
  );

  result.checks.requirement_fit = {
    status: hasSubstantiveIssue ? (status === "FAIL" ? "WARN" : status) : "PASS",
    message: newMessage,
  };

  if (result.reason && isStaleReleaseClause(String(result.reason), partNames)) {
    result.reason = newMessage;
  }

  if (!hasSubstantiveIssue && result.isApproved === false && status === "FAIL") {
    const otherBlocking = ["display_output", "socket", "ram", "power", "case", "budget"].some(
      (key) => String(result?.checks?.[key]?.status || "").toUpperCase() === "FAIL"
    );
    if (!otherBlocking) {
      result.isApproved = true;
      result.reason = result.reason || "Cấu hình đạt yêu cầu sau khi loại nhận định sai về sản phẩm chưa ra mắt.";
    }
  }

  return result;
};

const hasDiscreteGpuInBuild = (parts: Record<string, unknown>): boolean =>
  hasNamedPart(parts?.vga);

const requiresAftermarketCooler = (requirementsText: string): boolean => {
  const normalized = normalizeForRequirementMatch(requirementsText);
  return /(aio|tan nhiet nuoc|tan nhiet roi|cooler roi|aftermarket|tản nhiệt rời)/.test(normalized) &&
    !isPartExplicitlyNotRequired(requirementsText, ["tan nhiet", "cooler"]);
};

const cpuHasStockCoolerAssumed = (cpuName: string, requirementsText: string): boolean => {
  const normalized = normalizeForRequirementMatch(cpuName);
  if (!normalized.trim()) return false;
  if (requiresAftermarketCooler(requirementsText)) return false;
  if (/(tray|oem|khong kem fan|khong kem tan|boxless)/.test(normalized)) return false;
  return true;
};

const splitReviewClauses = (text: string): string[] =>
  text
    .split(/(?:->|;|\n|\s+và\s+|,\s+(?=[A-ZÀ-ỴĐ])|\.(?=\s+[A-ZÀ-ỴĐ])|\.(?=\s*$))+/i)
    .map((clause) => clause.trim())
    .filter(Boolean);

const isIgpuIrrelevantClause = (clause: string, hasVga: boolean): boolean => {
  if (!hasVga) return false;
  const normalized = normalizeForRequirementMatch(clause);
  return /(khong co igpu|cpu khong co igpu|thiếu igpu|khong xuat hinh.*cpu)/.test(normalized);
};

const isSubjectiveGpuOpinionClause = (clause: string): boolean => {
  const normalized = normalizeForRequirementMatch(clause);
  return /(linh kien cu|card cu|vga cu|khong toi uu|khong tot cho|gt\s*710.*cu|gt1030.*cu)/.test(normalized);
};

const isFalseMissingCoolerClause = (
  clause: string,
  parts: Record<string, unknown>,
  requirementsText: string
): boolean => {
  const normalized = normalizeForRequirementMatch(clause);
  if (!/(thieu|khong co|chua co).*(tan nhiet|cooler)/.test(normalized)) return false;
  const cpuName = String((parts.cpu as { name?: string } | undefined)?.name || "");
  return !hasNamedPart(parts.cooler_fan) && cpuHasStockCoolerAssumed(cpuName, requirementsText);
};

const isFalseSocketMismatchClause = (clause: string, cpuName: string, mbName: string): boolean => {
  if (!isKnownArrowLakePair(cpuName, mbName)) return false;
  const normalized = normalizeForRequirementMatch(clause);
  if (!/(khong tuong thich|sai socket|khong hop|chipset|socket|lga)/.test(normalized)) return false;
  return (
    /(b860|b850).*(lga\s*1700|1700)/.test(normalized) ||
    /(lga\s*1851).*(lga\s*1700|1700)/.test(normalized) ||
    /(core ultra|225f|ultra\s*5).*(b860|b850).*(khong tuong thich|khong hop)/.test(normalized) ||
    /(khong tuong thich).*(core ultra|ultra\s*5).*(b860|b850)/.test(normalized)
  );
};

const sanitizeReviewConsistency = (result: any, requirementsText = ""): any => {
  if (!result?.matched_parts) return result;

  const parts = result.matched_parts as Record<string, unknown>;
  const reqText = requirementsText || result.requirements_text || "";
  const hasVga = hasDiscreteGpuInBuild(parts);
  result.checks = result.checks || {};

  if (hasVga) {
    result.checks.display_output = {
      status: "PASS",
      message: "Có card đồ họa rời (VGA) hỗ trợ xuất hình — không cần iGPU trên CPU.",
    };
  }

  const cpuName = String((parts.cpu as { name?: string } | undefined)?.name || "");
  const mbName = String((parts.mainboard as { name?: string } | undefined)?.name || "");

  if (isKnownArrowLakePair(cpuName, mbName)) {
    result.checks.socket = {
      status: "PASS",
      message: `CPU ${cpuName.trim()} (LGA 1851) tương thích mainboard ${mbName.trim()} — chipset B860/B850 dùng socket LGA 1851.`,
    };
  }

  if (isPantherLakeDesktopMisread(cpuName)) {
    const currentStatus = String(result.checks.requirement_fit?.status || "").toUpperCase();
    if (currentStatus !== "FAIL") {
      result.checks.requirement_fit = {
        status: "WARN",
        message:
          "CPU ghi Core Ultra 300 / Panther Lake — dòng laptop (CES 2026), không có bản desktop. Có thể OCR nhầm SKU; desktop hiện tại là Core Ultra 200-series (LGA 1851).",
      };
    }
  }

  if (!hasNamedPart(parts.cooler_fan) && cpuHasStockCoolerAssumed(cpuName, reqText)) {
    const peripheralsMsg = String(result.checks.peripherals?.message || "");
    const peripheralsNormalized = normalizeForRequirementMatch(peripheralsMsg);
    if (/(thieu|khong co|chua co).*(tan nhiet|cooler)/.test(peripheralsNormalized)) {
      result.checks.peripherals = {
        status: "PASS",
        message: "CPU retail thường kèm tản stock; đề bài không bắt buộc tản nhiệt rời riêng.",
      };
    }
  }

  const scrubTextFields = ["reason", "requirement_fit"] as const;
  for (const field of scrubTextFields) {
    const source =
      field === "reason"
        ? String(result.reason || "")
        : String(result.checks.requirement_fit?.message || "");
    if (!source) continue;

    const kept = splitReviewClauses(source).filter((clause) => {
      const normalized = normalizeForRequirementMatch(clause);
      if (normalized.length < 8 || normalized === "ngoai ra") return false;
      if (isIgpuIrrelevantClause(clause, hasVga)) return false;
      if (isSubjectiveGpuOpinionClause(clause)) return false;
      if (isFalseMissingCoolerClause(clause, parts, reqText)) return false;
      if (isFalseSocketMismatchClause(clause, cpuName, mbName)) return false;
      return true;
    });

    if (kept.length === splitReviewClauses(source).length) continue;

    const cleaned = kept.join(". ") || (isKnownArrowLakePair(cpuName, mbName)
      ? "CPU Core Ultra và mainboard B860 tương thích socket LGA 1851."
      : hasVga
        ? "Cấu hình có VGA rời, tương thích kỹ thuật cơ bản đạt yêu cầu đề bài."
        : "Cấu hình đạt các tiêu chí kỹ thuật đã kiểm tra.");

    if (field === "reason") {
      result.reason = cleaned;
    } else {
      const currentStatus = String(result.checks.requirement_fit?.status || "").toUpperCase();
      const hasSubstantiveIssue = kept.some((clause) =>
        /(khong du|thieu|sai|khong dap ung|khong phu hop|vuot|khong dat)/i.test(
          normalizeForRequirementMatch(clause)
        )
      );
      result.checks.requirement_fit = {
        status: hasSubstantiveIssue ? (currentStatus === "FAIL" ? "WARN" : currentStatus) : "PASS",
        message: cleaned,
      };
    }
  }

  const criticalFail = ["display_output", "socket", "ram", "power", "case", "budget"].some(
    (key) => String(result.checks?.[key]?.status || "").toUpperCase() === "FAIL"
  );
  const requirementFail = String(result.checks?.requirement_fit?.status || "").toUpperCase() === "FAIL";

  if (!criticalFail && !requirementFail && result.isApproved === false) {
    const reasonNormalized = normalizeForRequirementMatch(result.reason || "");
    const onlySubjectiveIssues =
      reasonNormalized.includes("igpu") ||
      reasonNormalized.includes("gt710") ||
      reasonNormalized.includes("tan nhiet roi") ||
      isFalseSocketMismatchClause(result.reason || "", cpuName, mbName);
    if (onlySubjectiveIssues || !result.reason?.trim()) {
      result.isApproved = true;
      result.reason =
        result.reason ||
        (isKnownArrowLakePair(cpuName, mbName)
          ? "Cấu hình Core Ultra + mainboard B860 tương thích socket LGA 1851 và nằm trong ngân sách."
          : "Cấu hình đạt yêu cầu: VGA rời hỗ trợ xuất hình, linh kiện tương thích và nằm trong ngân sách.");
    }
  }

  return result;
};

const enforceRequirementFitGate = (result: any, requirementsText = ""): any => {
  const reqText = requirementsText || result.requirements_text || "";
  result = sanitizeStaleProductRejection(result);
  result = sanitizeReviewConsistency(result, reqText);
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
  const cpuName = String(parts.cpu?.name || "");

  if (
    !hasNamedPart(parts.cooler_fan) &&
    !isPartExplicitlyNotRequired(requirementsText, ["tan nhiet", "cooler"]) &&
    !cpuHasStockCoolerAssumed(cpuName, requirementsText)
  ) {
    penalty += SCORE_PENALTIES.missingCooler;
  }

  if (!hasNamedPart(parts.monitor) && !isPartExplicitlyNotRequired(requirementsText, ["lcd", "man hinh", "monitor"])) {
    penalty += SCORE_PENALTIES.missingMonitor;
  }

  const keyboardMouseName = normalizeForRequirementMatch((parts.keyboard_mouse || {}).name);
  const hasKeyboardMouseBundle = hasNamedPart(parts.keyboard_mouse);
  const hasKeyboard = hasKeyboardMouseBundle && /(ban phim|keyboard|phim co|phim)/.test(keyboardMouseName);
  const hasMouse = hasKeyboardMouseBundle && /(chuot|mouse)/.test(keyboardMouseName);

  if (!hasKeyboard && !isPartExplicitlyNotRequired(requirementsText, ["ban phim", "keyboard"])) {
    penalty += SCORE_PENALTIES.missingKeyboard;
  }
  if (!hasMouse && !isPartExplicitlyNotRequired(requirementsText, ["chuot", "mouse"])) {
    penalty += SCORE_PENALTIES.missingMouse;
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
    if (failCount > 0) {
      return Math.max(0, SCORE_PENALTIES.approvedWithFailBase - technicalFailCount * SCORE_PENALTIES.technicalFailEach - missingPeripheralPenalty);
    }
    if (warnCount === 0 && missingPeripheralPenalty === 0 && budget > 0 && totalPrice > 0 && totalPrice <= budget) {
      return SCORE_PENALTIES.perfectScore;
    }
    const baseScore = budgetWarn
      ? SCORE_PENALTIES.budgetWarnBase - Math.max(0, warnCount - 1) * 2
      : SCORE_PENALTIES.approvedBase - warnCount * 2;
    return Math.max(SCORE_PENALTIES.approvedMin, baseScore - missingPeripheralPenalty);
  }

  const technicalPenalty = technicalFailCount * SCORE_PENALTIES.technicalFailEach;
  if (requirementFailed || budgetFailed) {
    return Math.max(
      0,
      SCORE_PENALTIES.rejectedRequirementBase -
        failCount * SCORE_PENALTIES.failEach -
        warnCount * SCORE_PENALTIES.warnEach -
        technicalPenalty -
        missingPeripheralPenalty
    );
  }
  if (technicalFailCount > 0) {
    return Math.max(0, SCORE_PENALTIES.rejectedTechnicalBase - technicalPenalty - missingPeripheralPenalty);
  }
  if (failCount > 0) {
    return Math.max(
      10,
      SCORE_PENALTIES.rejectedFailBase -
        failCount * SCORE_PENALTIES.failEachRejected -
        warnCount * SCORE_PENALTIES.warnEach -
        missingPeripheralPenalty
    );
  }
  return Math.max(SCORE_PENALTIES.rejectedMin, SCORE_PENALTIES.rejectedRequirementBase - missingPeripheralPenalty);
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
const VISION_EXTRACTION_MAX_TOKENS = envInt("PC_BUILD_VISION_MAX_TOKENS", 4000);
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
    redirect: "manual",
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location") || "";
    throw new Error(
      `Không kích hoạt được bước DeepSeek (redirect ${response.status}${location ? ` → ${location}` : ""}).`
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Không kích hoạt được bước DeepSeek (${response.status}): ${text.slice(0, 300)}`);
  }
}

async function schedulePcBuildCompatibilityJob(id: string, type: "checkin" | "submission") {
  const run = () =>
    processPcBuildCompatibilityFromStored(id, type).catch((err) => {
      console.error(
        `[PcBuildVisionWorker] DeepSeek compatibility job failed for ${type} ${id}:`,
        err
      );
    });

  if (IS_VERCEL) {
    try {
      const { after } = await import("next/server");
      after(run);
      return;
    } catch (err) {
      console.warn("[PcBuildVisionWorker] after() unavailable, trying HTTP handoff:", err);
    }

    try {
      await triggerPcBuildCompatibilityJob(id, type);
      return;
    } catch (err) {
      console.warn("[PcBuildVisionWorker] HTTP handoff failed, running inline:", err);
    }
  }

  await run();
}

export async function processPcBuildVision(
  id: string,
  type: "checkin" | "submission",
  imageBase64: string
) {
  console.log(`[PcBuildVisionWorker] Starting vision extraction for ${type} ${id}...`);

  try {
    const analysisContext = await loadPcBuildAnalysisContext(id, type);
    const { userPlan } = analysisContext;
    const isLocal = !IS_VERCEL;

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

      const excelModel = isMaxHostFastPath(userPlan, isLocal)
        ? VISION_MODEL_IDS.GEMINI_FLASH
        : MODEL_CHAT_FLASH;
      const excelClient = isMaxHostFastPath(userPlan, isLocal) ? openaiAI : defaultAI;

      const response = await retryWithBackoff(() =>
        withTimeout(
          excelClient.chat.completions.create({
            model: excelModel,
            messages: [{ role: "user", content: excelExtractPrompt }],
            response_format: { type: "json_object" },
          }),
          VISION_EXTRACTION_TIMEOUT_MS,
          isMaxHostFastPath(userPlan, isLocal) ? "Vision-Excel-Gemini35" : "Vision-Excel"
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
        analysis_message: getCompatProgressMessage(userPlan, isLocal, "after_excel"),
        extracted_raw: extractedRaw,
      });

      await schedulePcBuildCompatibilityJob(id, type);
      return;
    }

    try {
      imageUrl = await optimizeImageForVision(imageUrl);
    } catch (err) {
      console.warn("[PcBuildVisionWorker] Image optimization failed, using original:", err);
    }

    if (isMaxHostFastPath(userPlan, isLocal)) {
      await updatePcBuildProgress(id, type, {
        analysis_step: "vision",
        analysis_message: "Gemini 3.5 đang đọc ảnh và phân tích cấu hình...",
      });

      const fastPath = await tryMaxHostGeminiFastPath(imageUrl, analysisContext);
      if (fastPath) {
        await persistPcBuildCompatibilityResult(id, type, {
          result: fastPath.result,
          extractedRaw: fastPath.extractedRaw,
          currentPayload: analysisContext.currentPayload,
          expectedBudget: analysisContext.expectedBudget,
        });
        try {
          revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");
          revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
        } catch (_) { /* ignore outside Next.js request context */ }
        console.log(`[PcBuildVisionWorker] MAX host fast-path completed for ${type} ${id}.`);
        return;
      }
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

    const visionModels = getVisionModelsForPlan(userPlan, isLocal);

    const visionAttempts = [
      {
        name: `Gemini Primary (${visionModels.primary})`,
        run: async () => {
          if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY not configured");
          }
          const response = await retryWithBackoff(() =>
            withTimeout(
              openaiAI.chat.completions.create({
                model: visionModels.primary,
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
                max_tokens: VISION_EXTRACTION_MAX_TOKENS,
                response_format: { type: "json_object" },
              }),
              VISION_EXTRACTION_TIMEOUT_MS,
              "Vision-Primary"
            ),
            VISION_RETRY_COUNT
          );
          return response.choices[0]?.message?.content || "{}";
        },
      },
      {
        name: `Gemini Fallback (${visionModels.fallback})`,
        run: async () => {
          if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY not configured");
          }
          const response = await retryWithBackoff(() =>
            withTimeout(
              openaiAI.chat.completions.create({
                model: visionModels.fallback,
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
                max_tokens: VISION_EXTRACTION_MAX_TOKENS,
                response_format: { type: "json_object" },
              }),
              VISION_EXTRACTION_TIMEOUT_MS,
              "Vision-Fallback"
            ),
            VISION_RETRY_COUNT
          );
          return response.choices[0]?.message?.content || "{}";
        },
      },
      {
        name: `GPT-4o-Mini (${VISION_MODEL_IDS.GPT4O_MINI})`,
        run: async () => {
          if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY not configured");
          }
          const response = await retryWithBackoff(() =>
            withTimeout(
              openaiAI.chat.completions.create({
                model: visionModels.tertiary,
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
                max_tokens: VISION_EXTRACTION_MAX_TOKENS,
                response_format: { type: "json_object" },
              }),
              VISION_EXTRACTION_TIMEOUT_MS,
              "Vision-GPT4oMini"
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
      analysis_message: getCompatProgressMessage(userPlan, isLocal, "after_vision"),
      extracted_raw: extractedRaw,
    });

    await schedulePcBuildCompatibilityJob(id, type);
    console.log(
      `[PcBuildVisionWorker] Vision extraction finished and compatibility job queued for ${type} ${id}.`
    );
  } catch (error: any) {
    console.error(`[PcBuildVisionWorker] Failed for ${type} ${id}:`, error);
    await markPcBuildError(id, type, getFriendlyPcBuildError(error, "vision"));
  }
}

export async function processPcBuildCompatibilityFromStored(
  id: string,
  type: "checkin" | "submission"
) {
  const isLocal = !IS_VERCEL;
  console.log(`[PcBuildCompatWorker] Starting compatibility analysis for ${type} ${id}...`);

  try {
    const analysisContext = await loadPcBuildAnalysisContext(id, type);
    const {
      userPlan,
      expectedBudget,
      expectedNeed,
      expectedReqs,
      currentPayload,
      extractedRaw,
    } = analysisContext;

    if (!hasExtractedItems(extractedRaw)) {
      throw new Error("Thiếu dữ liệu linh kiện đã bóc tách để phân tích tương thích.");
    }

    const approvedBudgetLimitText =
      expectedBudget > 0 ? formatVND(getApprovedBudgetLimit(expectedBudget)) : "Không giới hạn";

    await updatePcBuildProgress(id, type, {
      analysis_step: "deepseek",
      analysis_message: getCompatProgressMessage(userPlan, isLocal, "active"),
    });

    const shortenedItems = Array.isArray(extractedRaw?.items)
      ? extractedRaw.items.map((item: any) => ({
          name: typeof item.name === "string" && item.name.length > 90 ? item.name.slice(0, 90) : item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        }))
      : [];
    const shortenedRaw = { ...extractedRaw, items: shortenedItems };

    const compatibilityPrompt = buildCompatibilityPrompt({
      expectedNeed,
      expectedBudget,
      expectedReqs,
      approvedBudgetLimitText,
      rawItems: shortenedRaw,
    });

    const compatibilityAttempts = buildCompatibilityAttempts(userPlan, isLocal, compatibilityPrompt);

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
        console.warn("[PcBuildCompatWorker] Compatibility attempt failed:", err.message || err);
      }
    }

    if (!hasFinalPcBuildResult(result)) {
      const engineLabel = isMaxHostFastPath(userPlan, isLocal) ? "Gemini" : "DeepSeek";
      throw new Error(
        `${engineLabel} không trả về kết quả hợp lệ. Lỗi cuối cùng: ${compatibilityError?.message || "Không xác định"}`
      );
    }

    result = enforcePcBuildBudgetLimit(
      enforceRequirementFitGate(result, `${expectedNeed}\n${expectedReqs}`),
      expectedBudget
    );
    result.requirements_text = `${expectedNeed}\n${expectedReqs}`;

    await persistPcBuildCompatibilityResult(id, type, {
      result,
      extractedRaw,
      currentPayload,
      expectedBudget,
    });

    try {
      revalidateTag(CACHE_TAGS.ADMIN_QUEUE, "default");
      revalidateTag(CACHE_TAGS.POSTS_LIST, "default");
    } catch (_) { /* ignore outside Next.js request context */ }
    console.log(`[PcBuildCompatWorker] Finished compatibility analysis for ${type} ${id}.`);
  } catch (error: any) {
    console.error(`[PcBuildCompatWorker] Failed for ${type} ${id}:`, error);
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

    const visionCompatibilityPrompt = buildCompatibilityPrompt({
      expectedNeed,
      expectedBudget,
      expectedReqs,
      approvedBudgetLimitText,
      rawItems: null,
    });

    try {
      if (!isExcel && process.env.OPENAI_API_KEY) {
        console.log("[BackgroundWorker] Attempting Vercel fast-path single vision analysis via Gemini 2.5 Flash (v98store)...");
        const fastResponse = await retryWithBackoff(() =>
          withTimeout(
            openaiAI.chat.completions.create({
              model: MODEL_VISION_ONLY,
              messages: [
                { role: "system", content: visionCompatibilityPrompt },
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
          result = enforcePcBuildBudgetLimit(
            enforceRequirementFitGate(fastResult, `${expectedNeed}\n${expectedReqs}`),
            expectedBudget
          );
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
    const itemsCompatibilityPrompt = buildCompatibilityPrompt({
      expectedNeed,
      expectedBudget,
      expectedReqs,
      approvedBudgetLimitText,
      rawItems: extractedRaw,
    });

    let compatibilityError: any = null;

    const compatibilityAttempts = [
      // Attempt 1: DeepSeek Flash (API Box)
      async () => {
        console.log("[BackgroundWorker] Attempting compatibility check with DeepSeek Flash...");
        const response = await withTimeout(
          defaultAI.chat.completions.create({
            model: MODEL_CHAT_FLASH,
            messages: [{ role: "user", content: itemsCompatibilityPrompt }],
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
            messages: [{ role: "user", content: itemsCompatibilityPrompt }],
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

    result = enforcePcBuildBudgetLimit(
      enforceRequirementFitGate(ensureCompatibilityChecks(result), `${expectedNeed}\n${expectedReqs}`),
      expectedBudget
    );
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
    const feedback = `${result.reason || ""}\n\n[Báo cáo tương thích]\n- Đề bài: ${result.checks?.requirement_fit?.message || ""}\n- Xuất hình: ${result.checks?.display_output?.message || ""}\n- Socket: ${result.checks?.socket?.message || ""}\n- RAM: ${result.checks?.ram?.message || ""}\n- PSU: ${result.checks?.power?.message || ""}\n- Case: ${result.checks?.case?.message || ""}\n- Phụ kiện: ${result.checks?.peripherals?.message || ""}\n- Ngân sách: ${result.checks?.budget?.message || ""}`;

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
