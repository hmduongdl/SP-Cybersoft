import OpenAI from 'openai';

export const MODEL_CHAT_PRO = process.env.MODEL_DEEPSEEK_PRO || 'deepseek-v4-pro[1m]';
export const MODEL_CHAT_FLASH = process.env.MODEL_DEEPSEEK_FLASH || 'deepseek-v4-flash[1m]';
export const MODEL_VISION_ONLY = process.env.MODEL_GEMINI_VISION || 'kimi-k2.5';
export const MODEL_VISION_THINKING = 'gemini-3-flash-thinking';

// Danh sách model CHỈ được dùng cho vision (image input), không cho chat text
export const VISION_ONLY_MODELS = [MODEL_VISION_ONLY, MODEL_VISION_THINKING];

const globalForAI = global as unknown as { aibox: OpenAI };

export const aibox =
  globalForAI.aibox ||
  new OpenAI({
    apiKey: process.env.AIBOX_API_KEY,
    baseURL: process.env.AIBOX_BASE_URL || 'https://api.ai-box.vn/v1',
  });

if (process.env.NODE_ENV !== 'production') globalForAI.aibox = aibox;
