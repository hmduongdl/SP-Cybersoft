"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Sparkles, Code2, Eye } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";
import { copyToClipboard, parseApiErrorResponse } from "@/lib/seo-client";
import {
  ARTICLE_TONE_VALUES,
  SEO_TEXT_MAX,
  SEO_TEXT_MIN,
  validateSeoMinOnly,
  validateSeoText,
} from "@/lib/seo-schemas";

const TONE_OPTIONS = [
  { value: "Chuyên nghiệp", label: "Chuyên nghiệp" },
  { value: "Thân thiện", label: "Thân thiện" },
  { value: "Khuyến mãi/Bán hàng", label: "Khuyến mãi / Bán hàng" },
] as const;

type OutputTab = "code" | "preview";

function InputHint({ count, limited }: { count: number; limited?: boolean }) {
  const invalid = count > 0 && (count < SEO_TEXT_MIN || (limited ? count > SEO_TEXT_MAX : false));
  return (
    <p className={cn("text-[11px] mt-1 font-inter", invalid ? "text-red-600" : "text-on-surface-variant")}>
      {count.toLocaleString("vi-VN")}
      {limited ? `/${SEO_TEXT_MAX}` : ""} ký tự (tối thiểu {SEO_TEXT_MIN}
      {limited ? "" : ", không giới hạn tối đa"})
    </p>
  );
}

function ArticleSkeleton() {
  return (
    <div className="space-y-3 pt-2 border-t border-outline/20 animate-pulse">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl">
          <div className="h-7 w-24 bg-surface-container rounded-lg" />
          <div className="h-7 w-20 bg-surface-container-low rounded-lg" />
        </div>
        <div className="h-7 w-24 bg-surface-container-low rounded-xl" />
      </div>

      <div className="rounded-xl bg-white dark:bg-slate-900 border border-outline/20 p-6 space-y-2.5">
        {[95, 88, 92, 70].map((w, i) => (
          <div key={i} className="h-3.5 bg-surface-container rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

export function ArticleWriter() {
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState<(typeof ARTICLE_TONE_VALUES)[number]>(ARTICLE_TONE_VALUES[0]);
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState<OutputTab>("preview");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const topicError = validateSeoMinOnly(topic, "Thông tin sản phẩm");
    if (topicError) { toast.error(topicError); return; }

    const keywordsError = validateSeoText(keywords, "Keywords");
    if (keywordsError) { toast.error(keywordsError); return; }

    setIsLoading(true);
    try {
      const res = await fetch("/api/seo/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), keywords: keywords.trim(), tone }),
      });

      if (!res.ok) {
        toast.error(await parseApiErrorResponse(res));
        return;
      }

      const data = await res.json();
      setContent(data.content || "");
      setActiveTab("preview");
      toast.success("Đã viết mô tả sản phẩm thành công");
    } catch {
      toast.error("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="article-topic" className="block text-sm font-semibold text-on-surface font-inter mb-1.5">
            Thông tin / thông số sản phẩm
          </label>
          <textarea
            id="article-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={8}
            placeholder={`Dán tên đầy đủ + thông số sản phẩm...\n\nVí dụ:\nMàn hình BENQ XL2546X TN 240Hz\nKích thước 24.5", tấm nền TN, độ phân giải FHD\nTần số quét 240Hz, công nghệ DyAc 2\nCổng: DisplayPort 1.4, HDMI 2.0`}
            className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline font-inter resize-y min-h-[160px]"
          />
          <InputHint count={topic.trim().length} />
        </div>

        <div>
          <label htmlFor="article-keywords" className="block text-sm font-semibold text-on-surface font-inter mb-1.5">
            Từ khóa SEO
          </label>
          <input
            id="article-keywords"
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            maxLength={SEO_TEXT_MAX}
            placeholder="màn hình gaming, BENQ 240Hz..."
            className="w-full px-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline font-inter"
          />
          <InputHint count={keywords.trim().length} limited />
        </div>

        <div>
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
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold font-inter hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang viết mô tả...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Viết mô tả sản phẩm
              </>
            )}
          </button>
        </div>
      </form>

      {/* Loading skeleton */}
      {isLoading && <ArticleSkeleton />}

      {/* Results */}
      {!isLoading && content && (
        <div className="space-y-3 pt-2 border-t border-outline/20">
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
                Preview
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
              onClick={() => copyToClipboard(content, "Đã copy nội dung mô tả")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline/30 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>

          {activeTab === "code" ? (
            <div className="relative rounded-xl bg-slate-950 overflow-hidden">
              <pre className="p-4 overflow-x-auto max-h-[480px] overflow-y-auto">
                <code className="text-xs text-slate-100 font-mono whitespace-pre-wrap break-words">
                  {content}
                </code>
              </pre>
            </div>
          ) : (
            <div className="prose prose-sm sm:prose-base prose-slate dark:prose-invert max-w-none rounded-xl bg-white dark:bg-slate-900 p-4 sm:p-6 border border-outline/20 overflow-x-auto max-h-[480px] overflow-y-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
