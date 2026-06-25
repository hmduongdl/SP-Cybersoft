"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { copyToClipboard, parseApiErrorResponse } from "@/lib/seo-client";
import { SEO_TEXT_MIN, validateSeoMinOnly } from "@/lib/seo-schemas";

function InputHint({ count }: { count: number }) {
  const invalid = count > 0 && count < SEO_TEXT_MIN;
  return (
    <p className={cn("text-[11px] mt-1 font-inter", invalid ? "text-red-600" : "text-on-surface-variant")}>
      {count.toLocaleString("vi-VN")} ký tự (tối thiểu {SEO_TEXT_MIN}, không giới hạn tối đa)
    </p>
  );
}

function SpecSkeleton() {
  return (
    <div className="space-y-3 pt-2 border-t border-outline/20 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3.5 w-32 bg-surface-container rounded" />
        <div className="h-7 w-20 bg-surface-container-low rounded-xl" />
      </div>
      <div className="rounded-xl bg-surface-container-low p-4 space-y-2.5">
        {[40, 55, 70, 65, 60, 50, 72].map((w, i) => (
          <div key={i} className="h-3.5 bg-surface-container rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SpecSummary() {
  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const inputError = validateSeoMinOnly(inputText, "Thông số");
    if (inputError) { toast.error(inputError); return; }

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
      toast.success("Đã tóm tắt thông số thành công");
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
          <label htmlFor="spec-input" className="block text-sm font-semibold text-on-surface font-inter mb-1.5">
            Thông số gốc
          </label>
          <textarea
            id="spec-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={12}
            placeholder={`Dán toàn bộ thông số sản phẩm tại đây...\n\nVí dụ:\nMainboard ASUS TUF Gaming B650-PLUS WIFI\nChipset AMD B650, Socket AM5\n4 khe RAM DDR5 tối đa 128GB, 6400MHz (OC)\n2 khe PCIe 4.0 x16, 3 khe M.2, 4 cổng SATA\nLAN 2.5Gb, WiFi 6, Bluetooth 5.2\nUSB 3.2 Gen 2x2 Type-C, kích thước ATX`}
            className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline font-inter resize-y min-h-[240px]"
          />
          <InputHint count={inputText.trim().length} />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold font-inter hover:bg-primary/90 transition-all disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tóm tắt...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Tóm tắt thông số
            </>
          )}
        </button>
      </form>

      {/* Loading skeleton */}
      {isLoading && <SpecSkeleton />}

      {/* Result */}
      {!isLoading && summary && (
        <div className="space-y-3 pt-2 border-t border-outline/20">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-inter">
              Kết quả tóm tắt
            </h3>
            <button
              type="button"
              onClick={() => copyToClipboard(summary, "Đã copy mô tả ngắn")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline/30 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>

          <textarea
            readOnly
            value={summary}
            rows={Math.min(20, Math.max(6, summary.split("\n").length + 1))}
            className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm text-on-surface font-inter resize-y leading-relaxed whitespace-pre-wrap"
          />
        </div>
      )}
    </div>
  );
}
