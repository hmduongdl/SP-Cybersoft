import OpenAI from "openai";

export const MODEL_CHAT_PRO = process.env.MODEL_DEEPSEEK_PRO || "deepseek-v4-pro[1m]";
export const MODEL_CHAT_FLASH = process.env.MODEL_DEEPSEEK_FLASH || "deepseek-v4-flash[1m]";
export const MODEL_VISION_ONLY = process.env.MODEL_VISION_ONLY || process.env.MODEL_GEMINI_VISION || "gemini-2.5-flash";
export const MODEL_VISION_THINKING = process.env.MODEL_VISION_THINKING || "gemini-2.5-flash";

// Danh sách model CHỈ được dùng cho vision (image input), không cho chat text
export const VISION_ONLY_MODELS = [MODEL_VISION_ONLY, MODEL_VISION_THINKING];

const globalForAI = global as unknown as {
  defaultAI?: OpenAI;
  codexAI?: OpenAI;
  openaiAI?: OpenAI;
  googleGeminiAI?: OpenAI;
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

// OpenAI client — proxy qua v98store.com
export const openaiAI =
  globalForAI.openaiAI ||
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || "https://v98store.com/v1",
  });

// Official Google Gemini API client (Direct integration - no proxy)
export const googleGeminiAI =
  globalForAI.googleGeminiAI ||
  new OpenAI({
    apiKey: process.env.GEMINI_API_KEY || "dummy-key",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
  });

// Backward-compatible alias for existing text/chat call sites.
export const aibox = defaultAI;

if (process.env.NODE_ENV !== "production") {
  globalForAI.defaultAI = defaultAI;
  globalForAI.codexAI = codexAI;
  globalForAI.openaiAI = openaiAI;
  globalForAI.googleGeminiAI = googleGeminiAI;
}
