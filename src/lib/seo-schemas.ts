import { z } from "zod";

export const SEO_TEXT_MIN = 5;
export const SEO_TEXT_MAX = 2000;

export const ARTICLE_TONE_VALUES = [
  "Chuyên nghiệp",
  "Thân thiện",
  "Khuyến mãi/Bán hàng",
] as const;

// Mô tả ngắn SP: dán thông số gốc (có thể dài) nên chỉ yêu cầu tối thiểu.
export const specRequestSchema = z.object({
  inputText: z
    .string()
    .trim()
    .min(SEO_TEXT_MIN, `Thông số phải có ít nhất ${SEO_TEXT_MIN} ký tự.`),
});

export const articleRequestSchema = z.object({
  // Thông tin sản phẩm có thể dài (dán nguyên thông số) nên chỉ yêu cầu tối thiểu.
  topic: z
    .string()
    .trim()
    .min(SEO_TEXT_MIN, `Thông tin sản phẩm phải có ít nhất ${SEO_TEXT_MIN} ký tự.`),
  tone: z.enum(ARTICLE_TONE_VALUES, "Tone không hợp lệ."),
});

// Table generator không giới hạn độ dài đầu vào (chỉ yêu cầu tối thiểu).
export const tableRequestSchema = z.object({
  inputText: z
    .string()
    .trim()
    .min(SEO_TEXT_MIN, `Nội dung phải có ít nhất ${SEO_TEXT_MIN} ký tự.`),
});

export type SpecRequest = z.infer<typeof specRequestSchema>;
export type ArticleRequest = z.infer<typeof articleRequestSchema>;
export type TableRequest = z.infer<typeof tableRequestSchema>;

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(" ");
}

export function validateSeoText(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} là bắt buộc.`;
  if (trimmed.length < SEO_TEXT_MIN) {
    return `${label} phải có ít nhất ${SEO_TEXT_MIN} ký tự.`;
  }
  if (trimmed.length > SEO_TEXT_MAX) {
    return `${label} không được vượt quá ${SEO_TEXT_MAX} ký tự.`;
  }
  return null;
}

// Validate chỉ yêu cầu tối thiểu, không giới hạn tối đa (dùng cho Table Generator).
export function validateSeoMinOnly(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} là bắt buộc.`;
  if (trimmed.length < SEO_TEXT_MIN) {
    return `${label} phải có ít nhất ${SEO_TEXT_MIN} ký tự.`;
  }
  return null;
}
