"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Sparkles, Code2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  cleanSeoTableMarkdown,
  copyToClipboard,
  parseApiErrorResponse,
  readTextStream,
} from "@/lib/seo-client";
import { validateSeoMinOnly } from "@/lib/seo-schemas";
import {
  AiTypingIndicator,
  PRODUCT_TEMPLATES,
  SAMPLE_TABLE,
  SampleButton,
  SeoTips,
  StreamingMarkdown,
  TemplateChips,
} from "@/components/modules/seo/seo-helpers";

type OutputTab = "code" | "preview";

export function TableGenerator() {
  const [inputText, setInputText] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [activeTab, setActiveTab] = useState<OutputTab>("preview");
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const inputError = validateSeoMinOnly(inputText, "Dữ liệu sản phẩm");
    if (inputError) { toast.error(inputError); return; }

    setMarkdown("");
    setIsStreaming(true);
    setActiveTab("preview");
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

      let raw = "";
      await readTextStream(res, (text) => {
        raw = text;
        setMarkdown(cleanSeoTableMarkdown(text));
      });

      const cleaned = cleanSeoTableMarkdown(raw);
      setMarkdown(cleaned);
      if (!cleaned.trim()) {
        toast.error("Không nhận được phản hồi từ AI. Vui lòng thử lại.");
        return;
      }

      toast.success("Hoàn tất bảng thông số");
    } catch {
      toast.error("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsStreaming(false);
    }
  };

  const appendTemplate = (value: string) => {
    setInputText((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${value}` : value));
  };

  const showOutput = isStreaming || !!markdown;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SeoTips
          items={[
            "Cung cấp đầy đủ thông số — hệ thống tự sắp xếp thành bảng hai cột chuẩn.",
            "Nên có Thương hiệu và Model; thông số cùng linh kiện sẽ được gom gọn.",
            "Kết quả ở định dạng Markdown, sẵn sàng dán vào WordPress.",
          ]}
        />

        <TemplateChips templates={PRODUCT_TEMPLATES} onPick={appendTemplate} />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="table-input" className="block text-sm font-semibold text-on-surface font-inter">
              Dữ liệu sản phẩm
            </label>
            <SampleButton onClick={() => setInputText(SAMPLE_TABLE)} />
          </div>
          <textarea
            id="table-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={12}
            placeholder={`Chọn mẫu danh mục phía trên hoặc dán thông số sản phẩm tại đây.\n\nVí dụ:\nLaptop Acer Nitro 5 AN515-58\nCPU: Intel Core i5-12450H\nRAM: 16GB DDR4\nSSD: 512GB NVMe\nMàn hình: 15.6" FHD IPS 144Hz\nPin: 54Wh`}
            className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline font-inter resize-y min-h-[240px]"
          />
        </div>

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
              Tạo bảng thông số
            </>
          )}
        </button>
      </form>

      {showOutput && (
        <div className="space-y-3 pt-2 border-t border-outline/20">
          {isStreaming && !markdown ? (
            <AiTypingIndicator label="AI đang tạo bảng thông số" />
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
                  onClick={() => copyToClipboard(markdown, "Đã sao chép bảng Markdown")}
                  disabled={isStreaming || !markdown.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline/30 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Sao chép
                </button>
              </div>

              {activeTab === "code" ? (
                <div className="relative rounded-xl bg-slate-950 overflow-hidden">
                  <pre className="p-4 overflow-x-auto max-h-[520px] overflow-y-auto">
                    <code className="text-xs text-slate-100 font-mono whitespace-pre-wrap break-words">
                      {markdown}
                      {isStreaming && (
                        <span className="inline-block w-[2px] h-3.5 bg-primary ml-0.5 align-middle animate-pulse rounded-full" />
                      )}
                    </code>
                  </pre>
                </div>
              ) : (
                <div className="rounded-xl bg-white dark:bg-slate-900 p-4 sm:p-6 border border-outline/20 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:border-slate-300 [&_td]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 [&_th]:text-left [&_th]:align-top [&_td]:align-top [&_th]:text-sm [&_td]:text-sm dark:[&_th]:border-slate-600 dark:[&_td]:border-slate-600 dark:[&_th]:bg-slate-800">
                  <StreamingMarkdown text={markdown} isStreaming={isStreaming} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
