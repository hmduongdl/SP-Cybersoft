"use client";

import { useState } from "react";
import { Toaster } from "sonner";
import { AlignLeft, FileText, Table2, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpecSummary } from "@/components/modules/seo/SpecSummary";
import { ArticleWriter } from "@/components/modules/seo/ArticleWriter";
import { TableGenerator } from "@/components/modules/seo/TableGenerator";

type SeoTool = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
};

const SEO_TOOLS: SeoTool[] = [
  {
    id: "article-writer",
    title: "Mô tả sản phẩm SEO",
    description: "Soạn mô tả bán hàng chuẩn RankMath cho máy tính, laptop và linh kiện.",
    icon: <PenLine className="w-5 h-5" />,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  {
    id: "table-generator",
    title: "Bảng thông số kỹ thuật",
    description: "Chuẩn hóa thông số thô thành bảng Markdown hai cột, sẵn sàng đăng website.",
    icon: <Table2 className="w-5 h-5" />,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    id: "spec-summary",
    title: "Tóm tắt thông số",
    description: "Rút gọn thông số sản phẩm theo format đồng bộ, phục vụ catalog và trang chi tiết.",
    icon: <AlignLeft className="w-5 h-5" />,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
];

const TOOL_HEADERS: Record<
  string,
  { title: string; description: string; icon: React.ReactNode; iconBg: string }
> = {
  "article-writer": {
    title: "Mô tả sản phẩm SEO",
    description: "Nhập thông tin sản phẩm để AI soạn mô tả bán hàng ngắn gọn, chuẩn SEO và phù hợp danh mục Song Phương.",
    icon: <FileText className="w-6 h-6 text-indigo-600" />,
    iconBg: "bg-indigo-50",
  },
  "table-generator": {
    title: "Bảng thông số kỹ thuật",
    description: "Chuyển đổi dữ liệu thô thành bảng thông số Markdown, tối ưu hiển thị trên WordPress.",
    icon: <Table2 className="w-6 h-6 text-emerald-600" />,
    iconBg: "bg-emerald-50",
  },
  "spec-summary": {
    title: "Tóm tắt thông số",
    description: "Tổng hợp thông số theo định dạng \"Tên thông số: Giá trị\", thống nhất trên toàn hệ thống.",
    icon: <AlignLeft className="w-6 h-6 text-amber-600" />,
    iconBg: "bg-amber-50",
  },
};

export default function SeoToolsClient() {
  const [activeTool, setActiveTool] = useState("article-writer");

  const activeHeader = TOOL_HEADERS[activeTool];

  const renderWorkspace = () => {
    switch (activeTool) {
      case "article-writer":
        return <ArticleWriter />;
      case "table-generator":
        return <TableGenerator />;
      case "spec-summary":
        return <SpecSummary />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      <Toaster position="top-right" richColors duration={2000} closeButton />

      <div>
        <nav className="flex gap-2 text-xs font-inter text-on-surface-variant/70 mb-2">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-primary font-semibold">Công cụ nội dung</span>
        </nav>
        <div>
          <p className="text-[9px] font-inter font-semibold tracking-[.1em] uppercase text-primary mb-1">
            Song Phương · AI
          </p>
          <h1 className="font-manrope font-bold text-2xl sm:text-headline-lg text-on-surface">
            Công cụ nội dung
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant font-inter max-w-2xl">
            Bộ công cụ AI hỗ trợ các công việc kinh doanh của công ty Song Phương.
          </p>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SEO_TOOLS.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveTool(tool.id)}
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
                  <p className="font-inter text-[14px] font-bold text-on-surface truncate mb-1">
                    {tool.title}
                  </p>
                  <p className="text-[12px] text-on-surface-variant font-inter leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {activeHeader && (
        <section className="bg-surface-container-lowest rounded-2xl shadow-ambient p-4 sm:p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                activeHeader.iconBg
              )}
            >
              {activeHeader.icon}
            </div>
            <div>
              <h2 className="font-manrope font-bold text-lg text-on-surface">
                {activeHeader.title}
              </h2>
              <p className="text-sm text-on-surface-variant font-inter mt-0.5">
                {activeHeader.description}
              </p>
            </div>
          </div>

          {renderWorkspace()}
        </section>
      )}
    </div>
  );
}
