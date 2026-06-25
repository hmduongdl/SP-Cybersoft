"use client";

import { useState } from "react";
import { Toaster, toast } from "sonner";
import {
  AlignLeft,
  CalendarDays,
  Copy,
  DollarSign,
  FileText,
  FolderTree,
  Globe,
  Newspaper,
  PenLine,
  Search,
  Table2,
  Wrench,
} from "lucide-react";
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
  comingSoon?: boolean;
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
  {
    id: "category-content",
    title: "Viết nội dung danh mục",
    description: "Soạn mô tả và nội dung SEO cho trang danh mục sản phẩm trên website Song Phương.",
    icon: <FolderTree className="w-5 h-5" />,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    comingSoon: true,
  },
  {
    id: "news-writer",
    title: "Viết bài viết news",
    description: "Tạo bài tin tức, khuyến mãi và thông báo theo giọng văn thương hiệu Song Phương.",
    icon: <Newspaper className="w-5 h-5" />,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
    comingSoon: true,
  },
  {
    id: "weekly-report",
    title: "Báo cáo công việc hàng tuần",
    description: "Tổng hợp tiến độ công việc tuần thành báo cáo ngắn gọn, sẵn sàng gửi nội bộ.",
    icon: <CalendarDays className="w-5 h-5" />,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    comingSoon: true,
  },
  {
    id: "price-check",
    title: "Check giá sản phẩm",
    description: "Đối chiếu giá sản phẩm với thị trường và đề xuất mức giá cạnh tranh.",
    icon: <DollarSign className="w-5 h-5" />,
    iconBg: "bg-lime-50",
    iconColor: "text-lime-700",
    comingSoon: true,
  },
  {
    id: "sp-product-check",
    title: "Check sản phẩm trên web Song Phương",
    description: "Kiểm tra thông tin, giá và trạng thái hiển thị sản phẩm trên songphuong.vn.",
    icon: <Search className="w-5 h-5" />,
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-700",
    comingSoon: true,
  },
  {
    id: "content-rewrite",
    title: "Viết lại nội dung web",
    description: "Copy nội dung trang web nào đó và viết lại cho page Song Phương.",
    icon: <Copy className="w-5 h-5" />,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    comingSoon: true,
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
  "category-content": {
    title: "Viết nội dung danh mục",
    description: "Soạn mô tả và nội dung SEO cho trang danh mục sản phẩm trên website Song Phương.",
    icon: <FolderTree className="w-6 h-6 text-violet-600" />,
    iconBg: "bg-violet-50",
  },
  "news-writer": {
    title: "Viết bài viết news",
    description: "Tạo bài tin tức, khuyến mãi và thông báo theo giọng văn thương hiệu Song Phương.",
    icon: <Newspaper className="w-6 h-6 text-sky-600" />,
    iconBg: "bg-sky-50",
  },
  "weekly-report": {
    title: "Báo cáo công việc hàng tuần",
    description: "Tổng hợp tiến độ công việc tuần thành báo cáo ngắn gọn, sẵn sàng gửi nội bộ.",
    icon: <CalendarDays className="w-6 h-6 text-rose-600" />,
    iconBg: "bg-rose-50",
  },
  "price-check": {
    title: "Check giá sản phẩm",
    description: "Đối chiếu giá sản phẩm với thị trường và đề xuất mức giá cạnh tranh.",
    icon: <DollarSign className="w-6 h-6 text-lime-700" />,
    iconBg: "bg-lime-50",
  },
  "sp-product-check": {
    title: "Check sản phẩm trên web Song Phương",
    description: "Kiểm tra thông tin, giá và trạng thái hiển thị sản phẩm trên songphuong.vn.",
    icon: <Globe className="w-6 h-6 text-cyan-700" />,
    iconBg: "bg-cyan-50",
  },
  "content-rewrite": {
    title: "Viết lại nội dung web",
    description: "Copy nội dung trang web nào đó và viết lại cho page Song Phương.",
    icon: <Copy className="w-6 h-6 text-orange-600" />,
    iconBg: "bg-orange-50",
  },
};

function ComingSoonPanel({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-outline/30 bg-surface-container-low/60 px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Wrench className="h-7 w-7 text-primary" />
      </div>
      <p className="font-manrope text-base font-bold text-on-surface">{title}</p>
      <p className="mt-2 text-sm text-on-surface-variant font-inter max-w-md mx-auto leading-relaxed">
        Công cụ này đang được phát triển và sẽ sớm ra mắt trên AI Studio. Vui lòng quay lại sau.
      </p>
      <span className="mt-4 inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 font-inter">
        Đang phát triển
      </span>
    </div>
  );
}

export default function SeoToolsClient() {
  const [activeTool, setActiveTool] = useState("article-writer");

  const activeToolMeta = SEO_TOOLS.find((t) => t.id === activeTool);
  const activeHeader = TOOL_HEADERS[activeTool];
  const isComingSoon = activeToolMeta?.comingSoon === true;

  const handleSelectTool = (tool: SeoTool) => {
    setActiveTool(tool.id);
    if (tool.comingSoon) {
      toast.info("Công cụ đang được phát triển", {
        description: `${tool.title} sẽ sớm ra mắt trên AI Studio.`,
        duration: 3500,
      });
    }
  };

  const renderWorkspace = () => {
    if (isComingSoon && activeHeader) {
      return <ComingSoonPanel title={activeHeader.title} />;
    }

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
          <span className="text-primary font-semibold">AI Studio</span>
        </nav>
        <div>
          <p className="text-[9px] font-inter font-semibold tracking-[.1em] uppercase text-primary mb-1">
            Song Phương · AI
          </p>
          <h1 className="font-manrope font-bold text-2xl sm:text-headline-lg text-on-surface">
            AI Studio
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
              onClick={() => handleSelectTool(tool)}
              className={cn(
                "text-left bg-surface-container-lowest rounded-2xl p-5 shadow-ambient border transition-all duration-150 group hover:-translate-y-0.5",
                isActive
                  ? "border-primary/30 ring-2 ring-primary/10"
                  : "border-transparent hover:border-outline/20",
                tool.comingSoon && !isActive && "opacity-90"
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
                  <div className="flex items-start gap-2 mb-1">
                    <p className="font-inter text-[14px] font-bold text-on-surface leading-snug flex-1">
                      {tool.title}
                    </p>
                    {tool.comingSoon && (
                      <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 font-inter">
                        Sắp ra mắt
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
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-manrope font-bold text-lg text-on-surface">
                  {activeHeader.title}
                </h2>
                {isComingSoon && (
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 font-inter">
                    Đang phát triển
                  </span>
                )}
              </div>
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
