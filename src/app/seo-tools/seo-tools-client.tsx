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
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SpecSummary } from "@/components/modules/seo/SpecSummary";
import { ArticleWriter } from "@/components/modules/seo/ArticleWriter";
import { TableGenerator } from "@/components/modules/seo/TableGenerator";
import { QuotaLimitNotice, QuotaUsageBar } from "@/components/shared/QuotaLimitNotice";
import { useFeatureQuotas, isQuotaExhausted } from "@/hooks/useFeatureQuotas";

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
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "table-generator",
    title: "Bảng thông số kỹ thuật",
    description: "Chuẩn hóa thông số thô thành bảng Markdown hai cột, sẵn sàng đăng website.",
    icon: <Table2 className="w-5 h-5" />,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "spec-summary",
    title: "Tóm tắt thông số",
    description: "Rút gọn thông số sản phẩm theo format đồng bộ, phục vụ catalog và trang chi tiết.",
    icon: <AlignLeft className="w-5 h-5" />,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "category-content",
    title: "Viết nội dung danh mục",
    description: "Soạn mô tả và nội dung SEO cho trang danh mục sản phẩm trên website Song Phương.",
    icon: <FolderTree className="w-5 h-5" />,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    comingSoon: true,
  },
  {
    id: "news-writer",
    title: "Viết bài viết news",
    description: "Tạo bài tin tức, khuyến mãi và thông báo theo giọng văn thương hiệu Song Phương.",
    icon: <Newspaper className="w-5 h-5" />,
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-600 dark:text-sky-400",
    comingSoon: true,
  },
  {
    id: "weekly-report",
    title: "Báo cáo công việc hàng tuần",
    description: "Tổng hợp tiến độ công việc tuần thành báo cáo ngắn gọn, sẵn sàng gửi nội bộ.",
    icon: <CalendarDays className="w-5 h-5" />,
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
    comingSoon: true,
  },
  {
    id: "price-check",
    title: "Check giá sản phẩm",
    description: "Đối chiếu giá sản phẩm với thị trường và đề xuất mức giá cạnh tranh.",
    icon: <DollarSign className="w-5 h-5" />,
    iconBg: "bg-lime-500/10",
    iconColor: "text-lime-700 dark:text-lime-400",
    comingSoon: true,
  },
  {
    id: "sp-product-check",
    title: "Check sản phẩm trên web Song Phương",
    description: "Kiểm tra thông tin, giá và trạng thái hiển thị sản phẩm trên songphuong.vn.",
    icon: <Search className="w-5 h-5" />,
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-700 dark:text-cyan-400",
    comingSoon: true,
  },
  {
    id: "content-rewrite",
    title: "Viết lại nội dung web",
    description: "Copy nội dung trang web nào đó và viết lại cho page Song Phương.",
    icon: <Copy className="w-5 h-5" />,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-600 dark:text-orange-400",
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
    icon: <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
    iconBg: "bg-indigo-500/10",
  },
  "table-generator": {
    title: "Bảng thông số kỹ thuật",
    description: "Chuyển đổi dữ liệu thô thành bảng thông số Markdown, tối ưu hiển thị trên WordPress.",
    icon: <Table2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
    iconBg: "bg-emerald-500/10",
  },
  "spec-summary": {
    title: "Tóm tắt thông số",
    description: "Tổng hợp thông số theo định dạng \"Tên thông số: Giá trị\", thống nhất trên toàn hệ thống.",
    icon: <AlignLeft className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
    iconBg: "bg-amber-500/10",
  },
  "category-content": {
    title: "Viết nội dung danh mục",
    description: "Soạn mô tả và nội dung SEO cho trang danh mục sản phẩm trên website Song Phương.",
    icon: <FolderTree className="w-6 h-6 text-violet-600 dark:text-violet-400" />,
    iconBg: "bg-violet-500/10",
  },
  "news-writer": {
    title: "Viết bài viết news",
    description: "Tạo bài tin tức, khuyến mãi và thông báo theo giọng văn thương hiệu Song Phương.",
    icon: <Newspaper className="w-6 h-6 text-sky-600 dark:text-sky-400" />,
    iconBg: "bg-sky-500/10",
  },
  "weekly-report": {
    title: "Báo cáo công việc hàng tuần",
    description: "Tổng hợp tiến độ công việc tuần thành báo cáo ngắn gọn, sẵn sàng gửi nội bộ.",
    icon: <CalendarDays className="w-6 h-6 text-rose-600 dark:text-rose-400" />,
    iconBg: "bg-rose-500/10",
  },
  "price-check": {
    title: "Check giá sản phẩm",
    description: "Đối chiếu giá sản phẩm với thị trường và đề xuất mức giá cạnh tranh.",
    icon: <DollarSign className="w-6 h-6 text-lime-700 dark:text-lime-400" />,
    iconBg: "bg-lime-500/10",
  },
  "sp-product-check": {
    title: "Check sản phẩm trên web Song Phương",
    description: "Kiểm tra thông tin, giá và trạng thái hiển thị sản phẩm trên songphuong.vn.",
    icon: <Globe className="w-6 h-6 text-cyan-700 dark:text-cyan-400" />,
    iconBg: "bg-cyan-500/10",
  },
  "content-rewrite": {
    title: "Viết lại nội dung web",
    description: "Copy nội dung trang web nào đó và viết lại cho page Song Phương.",
    icon: <Copy className="w-6 h-6 text-orange-600 dark:text-orange-400" />,
    iconBg: "bg-orange-500/10",
  },
};

function ComingSoonPanel({ title }: { title: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-surface-container-high bg-surface-mid/20 px-6 py-12 text-center max-w-xl mx-auto space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Wrench className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <p className="font-manrope text-base font-bold text-on-surface">{title}</p>
        <p className="text-xs text-on-muted font-inter leading-relaxed max-w-sm mx-auto">
          Công cụ này đang được phát triển và sẽ sớm ra mắt trên AI Studio. Vui lòng quay lại sau.
        </p>
      </div>
      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 border border-amber-500/15 font-inter">
        Đang phát triển
      </span>
    </div>
  );
}

export default function SeoToolsClient() {
  const [activeTool, setActiveTool] = useState("article-writer");
  const { aiStudio, refresh: refreshQuotas } = useFeatureQuotas();

  const aiStudioExhausted = isQuotaExhausted(aiStudio);

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

    if (aiStudioExhausted && aiStudio) {
      return (
        <QuotaLimitNotice
          featureLabel="lượt AI Studio tháng này"
          used={aiStudio.used}
          limit={aiStudio.limit}
          resetsAt={aiStudio.resetsAt}
          blocked
        />
      );
    }

    const quotaCallbacks = {
      onQuotaConsumed: () => refreshQuotas(),
      onQuotaExhausted: () => refreshQuotas(),
    };

    switch (activeTool) {
      case "article-writer":
        return <ArticleWriter {...quotaCallbacks} />;
      case "table-generator":
        return <TableGenerator {...quotaCallbacks} />;
      case "spec-summary":
        return <SpecSummary {...quotaCallbacks} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      <Toaster position="top-right" richColors duration={2000} closeButton />

      {/* Header Section */}
      <div className="bg-surface-mid/40 backdrop-blur-md border border-surface-container rounded-3xl p-6 md:p-8 shadow-ambient relative overflow-hidden">
        {/* Glow effect background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <p className="text-[9px] font-inter font-bold tracking-[.15em] uppercase text-primary">
              Song Phương · AI Workspace
            </p>
            <h1 className="font-manrope text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              AI Studio
            </h1>
            <p className="font-inter text-xs text-on-muted max-w-xl">
              Bộ công cụ AI hỗ trợ các tác vụ content chuẩn SEO, xử lý thông số kỹ thuật và báo cáo công việc hàng tuần cho nhân sự Song Phương.
            </p>
            {aiStudio && !aiStudio.isUnlimited && !aiStudioExhausted && (
              <div className="pt-3 max-w-xs">
                <QuotaUsageBar
                  label="Lượt AI Studio tháng này"
                  used={aiStudio.used}
                  limit={aiStudio.limit}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {aiStudioExhausted && aiStudio && (
        <QuotaLimitNotice
          featureLabel="lượt AI Studio tháng này"
          used={aiStudio.used}
          limit={aiStudio.limit}
          resetsAt={aiStudio.resetsAt}
          compact
        />
      )}

      {/* Grid Menu of Tools */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SEO_TOOLS.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => handleSelectTool(tool)}
              className={cn(
                "text-left bg-surface-container-lowest rounded-2xl p-5 shadow-sm border transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
                isActive
                  ? "border-primary/40 ring-2 ring-primary/10"
                  : "border-surface-container hover:border-surface-container-high",
                tool.comingSoon && !isActive && "opacity-85"
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105",
                    tool.iconBg,
                    tool.iconColor
                  )}
                >
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-inter text-xs font-bold text-on-surface leading-tight">
                      {tool.title}
                    </p>
                    {tool.comingSoon && (
                      <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-amber-600 border border-amber-500/10 font-inter">
                        Sắp có
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-on-muted font-medium font-inter leading-relaxed line-clamp-2">
                    {tool.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {/* Tool Workspace Card */}
      {activeHeader && (
        <section className="bg-surface-container-lowest rounded-3xl border border-surface-container shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex items-start gap-4 pb-4 border-b border-surface-container">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                activeHeader.iconBg
              )}
            >
              {activeHeader.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-manrope font-extrabold text-base text-on-surface">
                  {activeHeader.title}
                </h2>
                {isComingSoon && (
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-600 border border-amber-500/10 font-inter">
                    Đang phát triển
                  </span>
                )}
              </div>
              <p className="text-xs text-on-muted font-medium font-inter mt-1 leading-relaxed">
                {activeHeader.description}
              </p>
            </div>
          </div>

          <div className="animate-in fade-in duration-300">
            {renderWorkspace()}
          </div>
        </section>
      )}
    </div>
  );
}
