"use client";

import React, { useState, useMemo } from "react";
import { Toaster } from "sonner";
import { clsx } from "clsx";
import { MonthWeekFilter } from "@/components/shared/month-week-filter";
import { useMonthWeekFilter, isInRange } from "@/hooks/use-month-week-filter";

type CheckinItem = {
  id: string;
  postTitle: string;
  postUrl: string;
  postAuthor: string;
  imageUrl: string;
  submittedAt: string;
  status: string;
  rejectReason: string;
};

type Props = {
  checkins: CheckinItem[];
};

export default function ReportsClient({ checkins }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
    <div className="w-full h-auto space-y-6 animate-in fade-in duration-300">
      <Toaster position="top-right" richColors duration={1500} />

      {/* Header Section */}
      <div>
        <nav className="flex gap-2 text-xs font-inter text-on-surface-variant/70 mb-2">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-primary font-semibold">Báo cáo cá nhân</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-manrope font-bold text-headline-lg text-on-surface">Báo cáo cá nhân</h1>
            <p className="mt-1 text-sm text-on-surface-variant font-inter">Xem lại toàn bộ lịch sử share bài và trạng thái duyệt check-in.</p>
          </div>
          {/* Bộ lọc tháng / khoảng ngày */}
          <MonthWeekFilter
            filter={filter}
            className="sm:shrink-0"
          />
        </div>
      </div>

      {/* Stats KPI Cards — dựa trên range hiện tại */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full">
        {/* Card 1: Total */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-ambient flex items-center justify-between group hover:-translate-y-0.5 transition-all duration-150">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5 truncate">Tổng bài đã nộp</p>
            <h3 className="text-[28px] font-bold text-on-surface font-manrope leading-tight">{stats.total}</h3>
            <p className="text-[11px] text-outline mt-1.5 truncate">{filter.rangeLabel}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0 ml-3">
            <span className="material-symbols-outlined text-2xl">history</span>
          </div>
        </div>

        {/* Card 2: Approved */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-ambient flex items-center justify-between group hover:-translate-y-0.5 transition-all duration-150">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5 truncate">Đã phê duyệt</p>
            <h3 className="text-[28px] font-bold text-emerald-600 font-manrope leading-tight">{stats.approved}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 ml-3">
            <span className="material-symbols-outlined text-2xl">verified</span>
          </div>
        </div>

        {/* Card 3: Pending */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-ambient flex items-center justify-between group hover:-translate-y-0.5 transition-all duration-150">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5 truncate">Đang chờ duyệt</p>
            <h3 className="text-[28px] font-bold text-indigo-600 font-manrope leading-tight">{stats.pending}</h3>
            <p className="text-[11px] text-indigo-500/85 mt-1.5 truncate font-medium">Chờ Admin kiểm tra</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 ml-3">
            <span className="material-symbols-outlined text-2xl">pending</span>
          </div>
        </div>

        {/* Card 4: Rejected */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-ambient flex items-center justify-between group hover:-translate-y-0.5 transition-all duration-150">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5 truncate">Bị từ chối</p>
            <h3 className="text-[28px] font-bold text-rose-600 font-manrope leading-tight">{stats.rejected}</h3>
            <p className="text-[11px] text-rose-500/85 mt-1.5 truncate font-medium">Cần kiểm tra &amp; nộp lại</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 ml-3">
            <span className="material-symbols-outlined text-2xl">cancel</span>
          </div>
        </div>
      </section>

      {/* Main Filter & Table Section */}
      <section className="bg-surface-container-lowest rounded-2xl card-shadow border-none p-lg space-y-md">
        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center pb-2">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên bài viết..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-surface-container-lowest transition-all duration-150 text-on-surface placeholder-slate-400"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex bg-surface-container-low p-1 rounded-xl border-none self-start sm:self-auto overflow-x-auto max-w-full">
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
                  "px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer",
                  statusFilter === tab.value
                    ? "bg-surface-container-lowest text-indigo-600 shadow-ambient border-none/50"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-xl border-none">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-none text-on-surface-variant font-semibold text-xs tracking-wider uppercase">
                <th className="p-4 w-[40%]">Bài viết</th>
                <th className="p-4 w-[15%]">Ảnh Check-in</th>
                <th className="p-4 w-[20%]">Thời gian nộp</th>
                <th className="p-4 w-[15%]">Trạng thái</th>
                <th className="p-4 w-[10%] text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {paginatedCheckins.length > 0 ? (
                paginatedCheckins.map((item) => {
                  const isApproved = item.status === "APPROVED" || item.status === "AUTO_APPROVED";
                  const isPending = item.status === "PENDING";
                  const isRejected = item.status === "REJECTED";

                  return (
                    <tr key={item.id} className="hover:bg-surface-container-low/50 transition-all duration-150">
                      {/* Post Title & Author */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <a
                            href={item.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-slate-800 dark:text-white hover:text-indigo-600 hover:underline transition-all cursor-pointer flex items-center gap-1.5"
                            title={item.postTitle}
                          >
                            <span className="line-clamp-2">{item.postTitle}</span>
                            <span className="material-symbols-outlined text-[14px] text-slate-400 shrink-0">open_in_new</span>
                          </a>
                          <span className="text-xs text-slate-400 mt-1">
                            Tác giả: {item.postAuthor || "Ban truyền thông"}
                          </span>
                        </div>
                      </td>

                      {/* Image Thumbnail */}
                      <td className="p-4">
                        <div className="relative w-12 h-12 bg-surface-container rounded-lg overflow-hidden border-none/60 shadow-ambient cursor-zoom-in group">
                          <img
                            src={item.imageUrl}
                            alt="Check-in"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-all duration-150"
                            onClick={() => setSelectedImage(item.imageUrl)}
                          />
                          <div
                            onClick={() => setSelectedImage(item.imageUrl)}
                            className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center justify-center text-white"
                          >
                            <span className="material-symbols-outlined text-sm">zoom_in</span>
                          </div>
                        </div>
                      </td>

                      {/* Submitted Time */}
                      <td className="p-4 text-on-surface-variant text-xs font-medium">
                        {formatDate(item.submittedAt)}
                      </td>

                      {/* Status Badge & Reject Reason */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span
                            className={clsx(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                               isApproved && "bg-emerald-50 text-emerald-700 border-emerald-100",
                               isPending && "bg-amber-50 text-amber-700 border-amber-100",
                               isRejected && "bg-rose-50 text-rose-700 border-rose-100"
                            )}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {isApproved && "Đã duyệt"}
                            {isPending && "Chờ duyệt"}
                            {isRejected && "Từ chối"}
                          </span>
                          
                          {isRejected && item.rejectReason && (
                            <p className="text-[11px] text-rose-600 font-medium max-w-[200px] leading-tight">
                              Lý do: {item.rejectReason}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedImage(item.imageUrl)}
                          className="p-1 rounded-xl text-outline hover:text-indigo-600 hover:bg-surface-container transition-all duration-150 cursor-pointer"
                          title="Xem ảnh check-in"
                        >
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-outline">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-4xl text-outline">
                        database_off
                      </span>
                      <p className="text-sm">Không có dữ liệu trong khoảng thời gian đã chọn.</p>
                      <p className="text-xs text-outline/70">{filter.rangeLabel}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-none text-xs">
            <p className="text-on-surface-variant">
              Hiển thị <span className="font-semibold text-on-surface-variant">{(currentPage - 1) * itemsPerPage + 1}</span> -{" "}
              <span className="font-semibold text-on-surface-variant">
                {Math.min(currentPage * itemsPerPage, filteredCheckins.length)}
              </span>{" "}
              trong tổng số <span className="font-semibold text-on-surface-variant">{filteredCheckins.length}</span> báo cáo
            </p>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border-none text-on-surface-variant bg-surface-container-lowest hover:bg-surface-container-low disabled:opacity-40 disabled:hover:bg-surface-container-lowest transition-all duration-150 shadow-ambient cursor-pointer disabled:cursor-not-allowed"
              >
                Trước
              </button>
              {[...Array(Math.min(totalPages, 7))].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={clsx(
                    "inline-flex items-center justify-center w-8 h-8 rounded-xl font-semibold border shadow-ambient transition-all duration-150 cursor-pointer",
                    currentPage === i + 1
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/10 hover:bg-surface-container-low"
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border-none text-on-surface-variant bg-surface-container-lowest hover:bg-surface-container-low disabled:opacity-40 disabled:hover:bg-surface-container-lowest transition-all duration-150 shadow-ambient cursor-pointer disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Image Modal Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0_32px_64px_rgba(19,27,46,0.12)] p-2 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-inverse-surface/60 hover:bg-inverse-surface text-white rounded-full transition-all duration-150 cursor-pointer shadow-ambient"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <img
              src={selectedImage}
              alt="Bản xem trước kích thước đầy đủ"
              referrerPolicy="no-referrer"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
