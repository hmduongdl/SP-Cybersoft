"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Sparkles, Code2, Eye } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";
import { copyToClipboard, parseApiErrorResponse } from "@/lib/seo-client";
import { SEO_TEXT_MIN, validateSeoMinOnly } from "@/lib/seo-schemas";

type OutputTab = "code" | "preview";

function SeoInputHint({ count }: { count: number }) {
  const invalid = count > 0 && count < SEO_TEXT_MIN;
  return (
    <p className={cn("text-[11px] mt-1 font-inter", invalid ? "text-red-600" : "text-on-surface-variant")}>
      {count.toLocaleString("vi-VN")} ký tự (tối thiểu {SEO_TEXT_MIN}, không giới hạn tối đa)
    </p>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 pt-2 border-t border-outline/20 animate-pulse">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl">
          <div className="h-7 w-24 bg-surface-container rounded-lg" />
          <div className="h-7 w-20 bg-surface-container-low rounded-lg" />
        </div>
        <div className="h-7 w-24 bg-surface-container-low rounded-xl" />
      </div>

      <div className="rounded-xl bg-slate-950 p-4 space-y-0 overflow-hidden">
        <div className="flex gap-2 mb-2">
          {[30, 60].map((w, i) => (
            <div key={i} className="h-4 bg-slate-600 rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex gap-2 py-1.5 border-t border-slate-800">
            {[30, 60].map((w, i) => (
              <div key={i} className="h-3 bg-slate-700 rounded" style={{ width: `${w}%`, opacity: 1 - row * 0.08 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableGenerator() {
  const [inputText, setInputText] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [activeTab, setActiveTab] = useState<OutputTab>("preview");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const inputError = validateSeoMinOnly(inputText, "Nội dung");
    if (inputError) { toast.error(inputError); return; }

    setIsLoading(true);
    try {
      const res = await fetch("/api/seo/table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputText: inputText.trim() }),
      });

      if (!res.ok) {
        toast.error(await parseApiErrorResponse(res));
        return;
      }

      const data = await res.json();
      setMarkdown(data.markdown || "");
      setActiveTab("preview");
      toast.success("Đã tạo bảng thông số thành công");
    } catch {
      toast.error("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="table-input" className="block text-sm font-semibold text-on-surface font-inter mb-1.5">
            Dữ liệu sản phẩm (text thô)
          </label>
          <textarea
            id="table-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={12}
            placeholder={`Dán toàn bộ mô tả / thông số sản phẩm tại đây...\n\nVí dụ:\nLaptop Acer Aspire 5 A515-58\nCPU: Intel Core i5-12450H\nRAM: 16GB DDR4\nỔ cứng: 512GB SSD NVMe\nMàn hình: 15.6" FHD IPS 144Hz\nPin: 54Wh\nCổng kết nối: USB-C, 2x USB-A, HDMI`}
            className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline font-inter resize-y min-h-[240px]"
          />
          <SeoInputHint count={inputText.trim().length} />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold font-inter hover:bg-primary/90 transition-all disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tạo bảng...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Tạo bảng thông số
            </>
          )}
        </button>
      </form>

      {/* Loading skeleton */}
      {isLoading && <TableSkeleton />}

      {/* Results */}
      {!isLoading && markdown && (
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
              onClick={() => copyToClipboard(markdown, "Đã copy bảng Markdown")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline/30 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Markdown
            </button>
          </div>

          {activeTab === "code" ? (
            <div className="relative rounded-xl bg-slate-950 overflow-hidden">
              <pre className="p-4 overflow-x-auto max-h-[520px] overflow-y-auto">
                <code className="text-xs text-slate-100 font-mono whitespace-pre-wrap break-words">
                  {markdown}
                </code>
              </pre>
            </div>
          ) : (
            <div className="rounded-xl bg-white dark:bg-slate-900 p-4 sm:p-6 border border-outline/20 overflow-x-auto max-h-[520px] overflow-y-auto [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:border-slate-300 [&_td]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 [&_th]:text-left [&_th]:align-top [&_td]:align-top [&_th]:text-sm [&_td]:text-sm dark:[&_th]:border-slate-600 dark:[&_td]:border-slate-600 dark:[&_th]:bg-slate-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {markdown}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
