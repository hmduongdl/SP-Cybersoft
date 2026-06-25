"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Tags,
  Type,
  Heading,
  Gauge,
  Map,
  Link2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SeoTool = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  status: "available" | "soon";
};

const SEO_TOOLS: SeoTool[] = [
  {
    id: "meta-analyzer",
    title: "Phân tích Meta Tags",
    description: "Kiểm tra title, description, Open Graph và thẻ meta quan trọng của trang web.",
    icon: <Tags className="w-5 h-5" />,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    status: "available",
  },
  {
    id: "keyword-density",
    title: "Mật độ từ khóa",
    description: "Phân tích tần suất từ khóa trong nội dung để tối ưu SEO on-page.",
    icon: <Type className="w-5 h-5" />,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    status: "soon",
  },
  {
    id: "heading-structure",
    title: "Cấu trúc Heading",
    description: "Rà soát thứ tự H1–H6 và phát hiện lỗi cấu trúc tiêu đề.",
    icon: <Heading className="w-5 h-5" />,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    status: "soon",
  },
  {
    id: "page-speed",
    title: "Page Speed Insights",
    description: "Đánh giá tốc độ tải trang và gợi ý cải thiện hiệu năng.",
    icon: <Gauge className="w-5 h-5" />,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
    status: "soon",
  },
  {
    id: "sitemap",
    title: "Sitemap Generator",
    description: "Tạo sitemap XML từ URL gốc để hỗ trợ index trên công cụ tìm kiếm.",
    icon: <Map className="w-5 h-5" />,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    status: "soon",
  },
  {
    id: "link-checker",
    title: "Kiểm tra liên kết",
    description: "Quét broken links và liên kết nội bộ/ngoại bộ trên trang.",
    icon: <Link2 className="w-5 h-5" />,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    status: "soon",
  },
];

const META_CHECKLIST = [
  { label: "Thẻ title", hint: "50–60 ký tự, chứa từ khóa chính" },
  { label: "Meta description", hint: "150–160 ký tự, mô tả hấp dẫn" },
  { label: "og:title", hint: "Tiêu đề khi chia sẻ lên mạng xã hội" },
  { label: "og:description", hint: "Mô tả preview trên Facebook, LinkedIn..." },
  { label: "og:image", hint: "Ảnh đại diện khi share (1200×630px)" },
  { label: "Canonical URL", hint: "Tránh trùng lặp nội dung" },
];

export default function SeoToolsClient() {
  const [activeTool, setActiveTool] = useState("meta-analyzer");
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Vui lòng nhập URL cần phân tích");
      return;
    }

    try {
      new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    } catch {
      toast.error("URL không hợp lệ");
      return;
    }

    setIsAnalyzing(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsAnalyzing(false);
    toast.info("Chức năng phân tích meta tags đang được hoàn thiện");
  };

  const handleToolSelect = (tool: SeoTool) => {
    if (tool.status === "soon") {
      toast.info("Chức năng đang phát triển");
      return;
    }
    setActiveTool(tool.id);
  };

  const availableCount = SEO_TOOLS.filter((t) => t.status === "available").length;
  const soonCount = SEO_TOOLS.filter((t) => t.status === "soon").length;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <nav className="flex gap-2 text-xs font-inter text-on-surface-variant/70 mb-2">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-primary font-semibold">SEO Tools</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-inter font-semibold tracking-[.1em] uppercase text-primary mb-1">
              CÔNG CỤ TỐI ƯU
            </p>
            <h1 className="font-manrope font-bold text-headline-lg text-on-surface">SEO Tools</h1>
            <p className="mt-1 text-sm text-on-surface-variant font-inter max-w-2xl">
              Bộ công cụ hỗ trợ phân tích và tối ưu hóa nội dung bài viết, meta tags và cấu trúc trang web.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {availableCount} sẵn sàng
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-[11px] font-semibold text-amber-700">
              <Sparkles className="w-3.5 h-3.5" />
              {soonCount} sắp ra mắt
            </span>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SEO_TOOLS.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => handleToolSelect(tool)}
              className={cn(
                "text-left bg-surface-container-lowest rounded-2xl p-5 shadow-ambient border transition-all duration-150 group hover:-translate-y-0.5",
                isActive
                  ? "border-primary/30 ring-2 ring-primary/10"
                  : "border-transparent hover:border-outline/20"
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                    tool.iconBg,
                    tool.iconColor
                  )}
                >
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-inter text-[14px] font-bold text-on-surface truncate">
                      {tool.title}
                    </p>
                    {tool.status === "soon" && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">
                        Sớm
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-on-surface-variant font-inter leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {/* Active Tool Workspace */}
      {activeTool === "meta-analyzer" && (
        <section className="bg-surface-container-lowest rounded-2xl shadow-ambient p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Tags className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="font-manrope font-bold text-lg text-on-surface">Phân tích Meta Tags</h2>
              <p className="text-sm text-on-surface-variant font-inter mt-0.5">
                Nhập URL trang web để kiểm tra các thẻ meta quan trọng cho SEO và chia sẻ mạng xã hội.
              </p>
            </div>
          </div>

          <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/bai-viet"
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline font-inter"
              />
            </div>
            <button
              type="submit"
              disabled={isAnalyzing}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold font-inter hover:bg-primary/90 transition-all disabled:opacity-60 shrink-0"
            >
              {isAnalyzing ? "Đang phân tích..." : "Phân tích"}
              {!isAnalyzing && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Checklist */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-inter">
                Danh mục kiểm tra
              </h3>
              <ul className="space-y-2">
                {META_CHECKLIST.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low"
                  >
                    <AlertCircle className="w-4 h-4 text-outline shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-on-surface font-inter">{item.label}</p>
                      <p className="text-xs text-on-surface-variant font-inter mt-0.5">{item.hint}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Results placeholder */}
            <div className="flex flex-col">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-inter mb-3">
                Kết quả phân tích
              </h3>
              <div className="flex-1 min-h-[280px] rounded-xl border-2 border-dashed border-outline/30 bg-surface-container-low/50 flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-outline" />
                </div>
                <p className="text-sm font-semibold text-on-surface font-inter mb-1">
                  Chưa có kết quả
                </p>
                <p className="text-xs text-on-surface-variant font-inter max-w-xs">
                  Nhập URL và bấm &quot;Phân tích&quot; để xem meta tags, Open Graph và các gợi ý tối ưu.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
