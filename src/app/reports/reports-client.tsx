"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Toaster } from "sonner";
import { clsx } from "clsx";
import { MonthWeekFilter } from "@/components/shared/month-week-filter";
import { useMonthWeekFilter, isInRange } from "@/hooks/use-month-week-filter";
import {
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Eye,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FolderOpen,
  Clock
} from "lucide-react";

type CheckinItem = {
  id: string;
  postTitle: string;
  postUrl: string;
  postAuthor: string;
  imageUrl: string;
  submittedAt: string;
  status: string;
  rejectReason: string;
  aiAnalysisReason: string;
  aiConfidence: number | null;
  aiExtractedTitle: string;
  aiExtractedUsername: string;
};

type Props = {
  checkins: CheckinItem[];
};

export default function ReportsClient({ checkins }: Props) {
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedCheckin, setSelectedCheckin] = useState<CheckinItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Bộ lọc tháng / khoảng ngày
  const filter = useMonthWeekFilter();

  // Lọc theo range thời gian + status + search
  const filteredCheckins = useMemo(() => {
    return checkins.filter((c) => {
      // Lọc theo khoảng ngày
      if (!isInRange(c.submittedAt, filter.effectiveRange)) return false;

      // Lọc theo tên bài viết
      const matchesSearch = c.postTitle
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      // Lọc theo trạng thái
      let matchesStatus = true;
      if (statusFilter === "APPROVED") {
        matchesStatus = c.status === "APPROVED" || c.status === "AUTO_APPROVED";
      } else if (statusFilter === "PENDING") {
        matchesStatus = c.status === "PENDING";
      } else if (statusFilter === "REJECTED") {
        matchesStatus = c.status === "REJECTED";
      }

      return matchesSearch && matchesStatus;
    });
  }, [checkins, searchTerm, statusFilter, filter.effectiveRange]);

  // Tính thống kê theo range hiện tại
  const stats = useMemo(() => {
    const total = filteredCheckins.length;
    const approved = filteredCheckins.filter(
      (c) => c.status === "APPROVED" || c.status === "AUTO_APPROVED"
    ).length;
    const pending = filteredCheckins.filter((c) => c.status === "PENDING").length;
    const rejected = filteredCheckins.filter((c) => c.status === "REJECTED").length;
    return { total, approved, pending, rejected };
  }, [filteredCheckins]);

  // Pagination
  const totalPages = Math.ceil(filteredCheckins.length / itemsPerPage) || 1;
  const paginatedCheckins = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCheckins.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCheckins, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    const checkinId = searchParams.get("checkinId");
    if (!checkinId) return;

    const target = checkins.find((item) => item.id === checkinId);
    if (target) {
      setStatusFilter("ALL");
      setSearchTerm("");
      setSelectedCheckin(target);
    }
  }, [checkins, searchParams]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full h-auto space-y-8 animate-in fade-in duration-300">
      <Toaster position="top-right" richColors duration={1500} />

      {/* Header Section */}
      <div className="bg-surface-mid/40 backdrop-blur-md border border-surface-container rounded-3xl p-6 md:p-8 shadow-ambient relative overflow-hidden">
        {/* Glow effect background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <h1 className="font-manrope text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              Báo cáo cá nhân
            </h1>
            <p className="font-inter text-xs text-on-muted max-w-xl">
              Xem lại toàn bộ lịch sử nộp minh chứng (Check-in Like/Share, Build PC) và theo dõi trạng thái phê duyệt thực tế của bạn.
            </p>
          </div>
          {/* Bộ lọc tháng / khoảng ngày */}
          <MonthWeekFilter
            filter={filter}
            className="sm:shrink-0"
          />
        </div>
      </div>

      {/* Stats KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full">
        {/* Card 1: Total */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container/60 shadow-sm flex items-center justify-between group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold text-on-muted uppercase tracking-wider">Tổng bài đã nộp</p>
            <h3 className="text-2xl font-extrabold text-on-surface font-manrope leading-tight">{stats.total}</h3>
            <p className="text-[10px] text-outline truncate font-medium">{filter.rangeLabel}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 shrink-0 ml-3">
            <History className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Approved */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container/60 shadow-sm flex items-center justify-between group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold text-on-muted uppercase tracking-wider">Đã phê duyệt</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 font-manrope leading-tight">{stats.approved}</h3>
            <p className="text-[10px] text-emerald-500/80 truncate font-medium">Được duyệt thành công</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0 ml-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Pending */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container/60 shadow-sm flex items-center justify-between group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold text-on-muted uppercase tracking-wider">Đang chờ duyệt</p>
            <h3 className="text-2xl font-extrabold text-indigo-600 font-manrope leading-tight">{stats.pending}</h3>
            <p className="text-[10px] text-indigo-500/80 truncate font-medium">Chờ Admin kiểm tra</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0 ml-3 animate-pulse">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Rejected */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container/60 shadow-sm flex items-center justify-between group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold text-on-muted uppercase tracking-wider">Bị từ chối</p>
            <h3 className="text-2xl font-extrabold text-rose-600 font-manrope leading-tight">{stats.rejected}</h3>
            <p className="text-[10px] text-rose-500/80 truncate font-medium">Cần kiểm tra nộp lại</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0 ml-3">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* Main Filter & Table Section */}
      <section className="bg-surface-container-lowest rounded-3xl border border-surface-container p-6 md:p-8 space-y-6 shadow-sm">
        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center pb-2">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-muted w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề nhiệm vụ..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs focus:outline-none focus:border-primary focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-on-muted/80"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex bg-surface-container-low p-1 rounded-2xl border border-surface-container-high self-start md:self-auto overflow-x-auto max-w-full">
            {[
              { label: "Tất cả", value: "ALL" },
              { label: "Đã duyệt", value: "APPROVED" },
              { label: "Chờ duyệt", value: "PENDING" },
              { label: "Bị từ chối", value: "REJECTED" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setCurrentPage(1);
                }}
                className={clsx(
                  "px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer border-none",
                  statusFilter === tab.value
                    ? "bg-surface-container-lowest text-primary shadow-sm"
                    : "text-on-muted hover:text-on-surface"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-surface-container">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-mid/60 border-b border-surface-container text-on-surface-variant font-bold text-[10px] tracking-wider uppercase font-manrope">
                <th className="p-4 w-[40%]">Nhiệm vụ / Bài viết</th>
                <th className="p-4 w-[15%]">Hình ảnh minh chứng</th>
                <th className="p-4 w-[20%]">Thời gian nộp</th>
                <th className="p-4 w-[15%]">Trạng thái</th>
                <th className="p-4 w-[10%] text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container/60 text-xs font-inter">
              {paginatedCheckins.length > 0 ? (
                paginatedCheckins.map((item) => {
                  const isApproved = item.status === "APPROVED" || item.status === "AUTO_APPROVED";
                  const isPending = item.status === "PENDING";
                  const isRejected = item.status === "REJECTED";

                  return (
                    <tr
                      key={item.id}
                      className={clsx(
                        "hover:bg-surface-mid/10 transition-colors",
                        searchParams.get("checkinId") === item.id && "bg-primary/5"
                      )}
                    >
                      {/* Post Title & Author */}
                      <td className="p-4">
                        <div className="flex flex-col space-y-1 max-w-sm">
                          <a
                            href={item.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-on-surface hover:text-primary transition-colors flex items-center gap-1.5 group w-fit"
                            title={item.postTitle}
                          >
                            <span className="line-clamp-2">{item.postTitle}</span>
                            <ExternalLink className="h-3 w-3 text-on-muted shrink-0 group-hover:text-primary transition-colors" />
                          </a>
                          <span className="text-[10px] text-on-muted font-medium">
                            Nguồn: {item.postAuthor || "Ban truyền thông"}
                          </span>
                        </div>
                      </td>

                      {/* Image Thumbnail */}
                      <td className="p-4">
                        <div 
                          onClick={() => setSelectedImage(item.imageUrl)}
                          className="relative w-12 h-12 bg-surface-container rounded-xl overflow-hidden border border-surface-container-high shadow-sm cursor-zoom-in group shrink-0"
                        >
                          <img
                            src={item.imageUrl}
                            alt="Minh chứng check-in"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-white">
                            <Eye className="h-4 w-4" />
                          </div>
                        </div>
                      </td>

                      {/* Submitted Time */}
                      <td className="p-4 text-on-surface-variant font-medium">
                        {formatDate(item.submittedAt)}
                      </td>

                      {/* Status Badge & Reject Reason */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span
                            className={clsx(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                               isApproved && "bg-emerald-500/10 text-emerald-600 border-emerald-500/15",
                               isPending && "bg-amber-500/10 text-amber-600 border-amber-500/15",
                               isRejected && "bg-rose-500/10 text-rose-600 border-rose-500/15"
                            )}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {isApproved && "Đã duyệt"}
                            {isPending && "Chờ duyệt"}
                            {isRejected && "Từ chối"}
                          </span>
                          
                          {isRejected && item.rejectReason && (
                            <p className="text-[10px] text-rose-600 font-bold max-w-[200px] leading-tight pl-1 border-l-2 border-rose-500/40">
                              Lý do: {item.rejectReason}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedCheckin(item)}
                          className="p-2 rounded-xl text-on-muted hover:text-primary hover:bg-surface-container transition-all cursor-pointer border-none"
                          title="Xem phân tích AI"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-on-muted bg-surface-mid/10">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FolderOpen className="h-10 w-10 text-on-muted animate-bounce" />
                      <p className="text-xs font-semibold text-on-surface">Không tìm thấy báo cáo nào</p>
                      <p className="text-[10px] text-on-muted/80">{filter.rangeLabel}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-none text-xs">
            <p className="text-on-muted font-medium">
              Hiển thị <span className="font-bold text-on-surface">{(currentPage - 1) * itemsPerPage + 1}</span> -{" "}
              <span className="font-bold text-on-surface">
                {Math.min(currentPage * itemsPerPage, filteredCheckins.length)}
              </span>{" "}
              trong số <span className="font-bold text-on-surface">{filteredCheckins.length}</span> báo cáo
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="inline-flex items-center justify-center p-2 rounded-xl bg-surface-container-low hover:bg-surface-container hover:text-on-surface disabled:opacity-40 disabled:hover:bg-surface-container-low transition-all cursor-pointer disabled:cursor-not-allowed border-none text-on-muted"
                title="Trang trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={clsx(
                    "inline-flex items-center justify-center w-8 h-8 rounded-xl font-bold transition-all cursor-pointer border-none text-xs",
                    currentPage === i + 1
                      ? "bg-primary text-on-primary shadow-sm shadow-primary/10"
                      : "bg-surface-container-low text-on-muted hover:bg-surface-container"
                  )}
                >
                  {i + 1}
                </button>
              ))}
              
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="inline-flex items-center justify-center p-2 rounded-xl bg-surface-container-low hover:bg-surface-container hover:text-on-surface disabled:opacity-40 disabled:hover:bg-surface-container-low transition-all cursor-pointer disabled:cursor-not-allowed border-none text-on-muted"
                title="Trang sau"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Image Modal Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-surface-container-lowest rounded-3xl overflow-hidden shadow-2xl p-2 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-black text-white rounded-full transition-all cursor-pointer shadow-md border-none"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={selectedImage}
              alt="Bản xem trước minh chứng"
              referrerPolicy="no-referrer"
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

      {selectedCheckin && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedCheckin(null)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedCheckin(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface rounded-full transition-all cursor-pointer shadow-md border-none"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-5 md:p-7 space-y-5">
              <div className="pr-10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Bài AI đã phân tích</p>
                <h2 className="mt-1 font-manrope text-xl font-extrabold text-on-surface leading-tight">
                  {selectedCheckin.postTitle}
                </h2>
                <p className="mt-1 text-xs text-on-muted">
                  Nộp lúc {formatDate(selectedCheckin.submittedAt)}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <button
                  onClick={() => setSelectedImage(selectedCheckin.imageUrl)}
                  className="relative h-44 overflow-hidden rounded-2xl border border-surface-container bg-surface-container cursor-zoom-in"
                  title="Phóng to ảnh minh chứng"
                >
                  <img
                    src={selectedCheckin.imageUrl}
                    alt="Minh chứng check-in"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100 text-white">
                    <Eye className="h-5 w-5" />
                  </div>
                </button>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-surface-container bg-surface-mid/30 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-muted">Kết quả</p>
                    <p className="mt-1 text-sm font-extrabold text-on-surface">
                      {selectedCheckin.status === "AUTO_APPROVED" || selectedCheckin.status === "APPROVED"
                        ? "Đã duyệt"
                        : selectedCheckin.status === "REJECTED"
                          ? "Từ chối"
                          : "Đang chờ duyệt"}
                    </p>
                    {selectedCheckin.aiConfidence != null && (
                      <p className="mt-1 text-xs text-on-muted">
                        Độ tin cậy AI: {Math.round(selectedCheckin.aiConfidence * 100)}%
                      </p>
                    )}
                  </div>

                  {(selectedCheckin.aiExtractedTitle || selectedCheckin.aiExtractedUsername) && (
                    <div className="rounded-2xl border border-surface-container bg-surface-mid/30 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-muted">AI nhận diện</p>
                      {selectedCheckin.aiExtractedTitle && (
                        <p className="mt-1 text-xs text-on-surface">Bài viết: {selectedCheckin.aiExtractedTitle}</p>
                      )}
                      {selectedCheckin.aiExtractedUsername && (
                        <p className="mt-1 text-xs text-on-surface">Tài khoản: {selectedCheckin.aiExtractedUsername}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-surface-container bg-surface-mid/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-muted">Phân tích của AI</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-on-surface">
                  {selectedCheckin.aiAnalysisReason || selectedCheckin.rejectReason || "Chưa có nội dung phân tích AI."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
