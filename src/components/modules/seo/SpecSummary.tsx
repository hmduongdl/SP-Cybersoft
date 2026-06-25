"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Sparkles } from "lucide-react";
import { copyToClipboard, parseApiErrorResponse } from "@/lib/seo-client";
import { validateSeoMinOnly } from "@/lib/seo-schemas";
import {
  AiTypingIndicator,
  PRODUCT_TEMPLATES,
  SAMPLE_SPEC,
  SampleButton,
  SeoTips,
  TemplateChips,
  TypewriterPlain,
} from "@/components/modules/seo/seo-helpers";

export function SpecSummary() {
  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const inputError = validateSeoMinOnly(inputText, "Thông số");
    if (inputError) { toast.error(inputError); return; }

    setSummary("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/seo/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputText: inputText.trim() }),
      });

      if (!res.ok) {
        toast.error(await parseApiErrorResponse(res));
        return;
      }

      const data = await res.json();
      setSummary(data.summary || "");
      toast.success("Hoàn tất tóm tắt thông số");
    } catch {
      toast.error("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const appendTemplate = (value: string) => {
    setInputText((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${value}` : value));
  };

  const showOutput = isLoading || !!summary;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SeoTips
          items={[
            "Dán nguyên thông số từ nhà sản xuất — hệ thống tự lọc và sắp xếp theo mức độ quan trọng.",
            "Bổ sung Thương hiệu và Model để đảm bảo format đồng bộ trên catalog.",
            "Không cần định dạng trước; chỉ cần đủ thông số khách hàng quan tâm.",
          ]}
        />

        <TemplateChips templates={PRODUCT_TEMPLATES} onPick={appendTemplate} />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="spec-input" className="block text-sm font-semibold text-on-surface font-inter">
              Thông số gốc
            </label>
            <SampleButton onClick={() => setInputText(SAMPLE_SPEC)} />
          </div>
          <textarea
            id="spec-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={12}
            placeholder={`Chọn mẫu danh mục phía trên hoặc dán thông số sản phẩm tại đây.\n\nVí dụ:\nMainboard ASUS TUF Gaming B650-PLUS WIFI\nChipset AMD B650, Socket AM5\n4 khe RAM DDR5, tối đa 128GB\n2 khe PCIe 4.0 x16, 3 khe M.2\nLAN 2.5Gb, WiFi 6, kích thước ATX`}
            className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline font-inter resize-y min-h-[240px]"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold font-inter hover:bg-primary/90 transition-all disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Tóm tắt thông số
            </>
          )}
        </button>
      </form>

      {showOutput && (
        <div className="space-y-3 pt-2 border-t border-outline/20">
          {isLoading ? (
            <AiTypingIndicator label="AI đang tóm tắt thông số" />
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-inter">
                  Kết quả
                </h3>
                <button
                  type="button"
                  onClick={() => copyToClipboard(summary, "Đã sao chép nội dung")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline/30 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Sao chép
                </button>
              </div>

              <div className="rounded-xl bg-surface-container-low px-4 py-3 min-h-[120px] max-h-[480px] overflow-y-auto">
                <TypewriterPlain text={summary} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
