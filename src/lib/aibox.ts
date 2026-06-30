import OpenAI from "openai";

export const MODEL_CHAT_PRO = process.env.MODEL_DEEPSEEK_PRO || "deepseek-v4-pro[1m]";
export const MODEL_CHAT_FLASH = process.env.MODEL_DEEPSEEK_FLASH || "deepseek-v4-flash[1m]";
export const MODEL_VISION_ONLY = "kimi-k2.5";
export const MODEL_VISION_THINKING = "gemini-3-flash-thinking";

// Danh sách model CHỈ được dùng cho vision (image input), không cho chat text
export const VISION_ONLY_MODELS = [MODEL_VISION_ONLY, MODEL_VISION_THINKING];

const globalForAI = global as unknown as {
  defaultAI?: OpenAI;
  codexAI?: OpenAI;
  moonshotAI?: OpenAI;
};

export const defaultAI =
  globalForAI.defaultAI ||
  new OpenAI({
    apiKey: process.env.AIBOX_DEFAULT_API_KEY || process.env.AIBOX_API_KEY || process.env.AIBOX_CODEX_API_KEY,
    baseURL: process.env.AIBOX_BASE_URL || "https://api.ai-box.vn/v1",
  });

export const codexAI =
  globalForAI.codexAI ||
  new OpenAI({
    apiKey: process.env.AIBOX_CODEX_API_KEY || process.env.AIBOX_API_KEY || process.env.AIBOX_DEFAULT_API_KEY,
    baseURL: process.env.AIBOX_BASE_URL || "https://api.ai-box.vn/v1",
  });

export const moonshotAI =
  globalForAI.moonshotAI ||
  new OpenAI({
    apiKey: process.env.MOONSHOT_API_KEY || "dummy-key",
    baseURL: "https://api.moonshot.cn/v1",
  });

// Backward-compatible alias for existing text/chat call sites.
export const aibox = defaultAI;

if (process.env.NODE_ENV !== "production") {
  globalForAI.defaultAI = defaultAI;
  globalForAI.codexAI = codexAI;
  globalForAI.moonshotAI = moonshotAI;
}
