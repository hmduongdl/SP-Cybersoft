"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Sparkles, Code2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { copyToClipboard, handleSeoApiError, readTextStream } from "@/lib/seo-client";
import { ARTICLE_TONE_VALUES, validateSeoMinOnly } from "@/lib/seo-schemas";
import {
  AiTypingIndicator,
  SeoTips,
  StreamingMarkdown,
} from "@/components/modules/seo/seo-helpers";

const TONE_OPTIONS = [
  { value: "Chuyên nghiệp", label: "Chuyên nghiệp" },
  { value: "Thân thiện", label: "Thân thiện" },
  { value: "Khuyến mãi/Bán hàng", label: "Khuyến mãi / Bán hàng" },
] as const;

type OutputTab = "code" | "preview";

interface SeoToolQuotaProps {
  onQuotaConsumed?: () => void;
  onQuotaExhausted?: () => void;
}

export function ArticleWriter({ onQuotaConsumed, onQuotaExhausted }: SeoToolQuotaProps = {}) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<(typeof ARTICLE_TONE_VALUES)[number]>(ARTICLE_TONE_VALUES[0]);
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState<OutputTab>("preview");
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const topicError = validateSeoMinOnly(topic, "Thông tin sản phẩm");
    if (topicError) { toast.error(topicError); return; }

    setContent("");
    setIsStreaming(true);
    setActiveTab("preview");
    try {
      const res = await fetch("/api/seo/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), tone }),
      });

      if (!res.ok) {
        const quotaErr = await handleSeoApiError(res);
        if (quotaErr?.quotaExceeded) onQuotaExhausted?.();
        return;
      }

      const result = await readTextStream(res, setContent);
      if (!result.trim()) {
        toast.error("Không nhận được phản hồi từ AI. Vui lòng thử lại.");
        return;
      }

      onQuotaConsumed?.();
      toast.success("Hoàn tất mô tả sản phẩm");
    } catch {
      toast.error("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsStreaming(false);
    }
  };

  const showOutput = isStreaming || !!content;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <SeoTips
            items={[
              "Ghi đầy đủ tên sản phẩm và phân loại để mở bài đúng chuẩn SEO.",
              "Nêu rõ 3–5 thông số nổi bật nhất cần làm điểm nhấn bán hàng.",
              "Bổ sung đối tượng khách hàng mục tiêu để câu kết phù hợp.",
              "Hệ thống tự chọn nhóm từ khóa danh mục theo loại sản phẩm.",
            ]}
          />
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="article-topic" className="block text-sm font-semibold text-on-surface font-inter">
              Thông tin sản phẩm
            </label>
          </div>
          <textarea
            id="article-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={8}
            placeholder={`Nhập tên sản phẩm, phân loại, thông số nổi bật và đối tượng sử dụng.\n\nVí dụ:\nMàn hình BENQ ZOWIE XL2546X\nLoại: màn hình gaming Esports\nTấm nền TN 24.5", FHD, 240Hz, DyAc 2\nCổng: DisplayPort 1.4, HDMI 2.0\nĐối tượng: game thủ FPS chuyên nghiệp`}
            className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline font-inter resize-y min-h-[160px]"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="article-tone" className="block text-sm font-semibold text-on-surface font-inter mb-1.5">
            Giọng văn
          </label>
          <select
            id="article-tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as (typeof ARTICLE_TONE_VALUES)[number])}
            className="w-full px-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface font-inter"
          >
            {TONE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isStreaming}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold font-inter hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            {isStreaming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Tạo mô tả
              </>
            )}
          </button>
        </div>
      </form>

      {showOutput && (
        <div className="space-y-3 pt-2 border-t border-outline/20">
          {isStreaming && !content ? (
            <AiTypingIndicator label="AI đang soạn mô tả sản phẩm" />
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-inter transition-colors",
                      activeTab === "preview"
                        ? "bg-surface-container-highest text-primary"
                        : "text-on-surface-variant hover:text-on-surface"
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Xem trước
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("code")}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-inter transition-colors",
                      activeTab === "code"
                        ? "bg-surface-container-highest text-primary"
                        : "text-on-surface-variant hover:text-on-surface"
                    )}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    Markdown
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(content, "Đã sao chép nội dung")}
                  disabled={isStreaming || !content.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline/30 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Sao chép
                </button>
              </div>

              {activeTab === "code" ? (
                <div className="relative rounded-xl bg-slate-950 overflow-hidden">
                  <pre className="p-4 overflow-x-auto max-h-[480px] overflow-y-auto">
                    <code className="text-xs text-slate-100 font-mono whitespace-pre-wrap break-words">
                      {content}
                      {isStreaming && (
                        <span className="inline-block w-[2px] h-3.5 bg-primary ml-0.5 align-middle animate-pulse rounded-full" />
                      )}
                    </code>
                  </pre>
                </div>
              ) : (
                <div className="rounded-xl bg-white dark:bg-slate-900 p-4 sm:p-6 border border-outline/20">
                  <StreamingMarkdown text={content} isStreaming={isStreaming} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
