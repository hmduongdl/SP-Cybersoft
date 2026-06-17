"use client";

import React, { useState, useMemo } from "react";
import { Toaster } from "sonner";
import { clsx } from "clsx";

type CheckinItem = {
  id: string;
  postTitle: string;
  postUrl: string;
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

  // Calculate statistics for KPI cards
  const stats = useMemo(() => {
    const total = checkins.length;
    const approved = checkins.filter(
      (c) => c.status === "APPROVED" || c.status === "AUTO_APPROVED"
    ).length;
    const pending = checkins.filter((c) => c.status === "PENDING").length;
    const rejected = checkins.filter((c) => c.status === "REJECTED").length;

    return { total, approved, pending, rejected };
  }, [checkins]);

  // Filter check-ins based on status and search query
  const filteredCheckins = useMemo(() => {
    return checkins.filter((c) => {
      const matchesSearch = c.postTitle
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      
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
  }, [checkins, searchTerm, statusFilter]);

  // Pagination calculations
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

      {/* Breadcrumbs */}
      <nav className="flex gap-2 text-label-sm text-outline text-xs">
        <span>Dashboard</span>
        <span>/</span>
        <span className="text-primary font-semibold">Báo cáo cá nhân</span>
      </nav>

      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-indigo-500 font-bold mb-2">Thống kê</p>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tight font-manrope">Báo Cáo Của Tôi</h1>
          <p className="mt-2 text-on-surface-variant text-base">Xem lại toàn bộ lịch sử share bài và trạng thái duyệt check-in.</p>
        </div>
      </header>

      {/* Stats KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">
        {/* Card 1: Total */}
        <div className="bg-surface-container-lowest p-lg rounded-lg-2xl card-shadow flex items-center justify-between group hover:translate-y-[-2px] transition-transform duration-300 border-none">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider text-xs">Tổng bài đã nộp</p>
            <h3 className="font-headline-lg text-headline-lg text-on-surface font-manrope">{stats.total}</h3>
            <p className="text-[11px] text-outline mt-2">Toàn bộ lịch sử check-in</p>
          </div>
          <div className="w-12 h-12 rounded-lg-xl bg-surface-container flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl">history</span>
          </div>
        </div>

        {/* Card 2: Approved */}
        <div className="bg-surface-container-lowest p-lg rounded-lg-2xl card-shadow flex items-center justify-between group hover:translate-y-[-2px] transition-transform duration-300 border-none">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider text-xs">Đã phê duyệt</p>
            <h3 className="font-headline-lg text-headline-lg text-emerald-600 font-manrope">{stats.approved}</h3>
            <p className="text-[11px] text-emerald-600/80 mt-2 font-medium">
              +{stats.approved * 100} Star Points tích lũy
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined text-3xl">verified</span>
          </div>
        </div>

        {/* Card 3: Pending */}
        <div className="bg-surface-container-lowest p-lg rounded-lg-2xl card-shadow flex items-center justify-between group hover:translate-y-[-2px] transition-transform duration-300 border-none">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider text-xs">Đang chờ duyệt</p>
            <h3 className="font-headline-lg text-headline-lg text-indigo-600 font-manrope">{stats.pending}</h3>
            <p className="text-[11px] text-indigo-500/85 mt-2 font-medium">Chờ Admin kiểm tra</p>
          </div>
          <div className="w-12 h-12 rounded-lg-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <span className="material-symbols-outlined text-3xl">pending</span>
          </div>
        </div>

        {/* Card 4: Rejected */}
        <div className="bg-surface-container-lowest p-lg rounded-lg-2xl card-shadow flex items-center justify-between group hover:translate-y-[-2px] transition-transform duration-300 border-none">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider text-xs">Bị từ chối</p>
            <h3 className="font-headline-lg text-headline-lg text-rose-600 font-manrope">{stats.rejected}</h3>
            <p className="text-[11px] text-rose-500/85 mt-2 font-medium">Cần kiểm tra & nộp lại</p>
          </div>
          <div className="w-12 h-12 rounded-lg-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <span className="material-symbols-outlined text-3xl">cancel</span>
          </div>
        </div>
      </section>

      {/* Main Filter & Table Section */}
      <section className="bg-surface-container-lowest rounded-lg-2xl card-shadow border-none p-lg space-y-md">
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
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-surface-container-lowest transition-all text-on-surface placeholder-slate-400"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex bg-surface-container-low p-1 rounded-lg-xl border-none self-start sm:self-auto overflow-x-auto max-w-full">
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
                  "px-4 py-1.5 rounded-lg-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
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
        <div className="overflow-x-auto rounded-lg-xl border-none">
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
                    <tr key={item.id} className="hover:bg-surface-container-low/50 transition-colors">
                      {/* Post Title */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-on-surface line-clamp-2" title={item.postTitle}>
                            {item.postTitle}
                          </p>
                          <a
                            href={item.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                          >
                            <span>Xem bài viết gốc</span>
                            <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                          </a>
                        </div>
                      </td>

                      {/* Image Thumbnail */}
                      <td className="p-4">
                        <div className="relative w-12 h-12 bg-surface-container rounded-lg-lg overflow-hidden border-none/60 shadow-ambient cursor-zoom-in group">
                          <img
                            src={item.imageUrl}
                            alt="Check-in"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            onClick={() => setSelectedImage(item.imageUrl)}
                          />
                          <div
                            onClick={() => setSelectedImage(item.imageUrl)}
                            className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
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
                              "inline-flex items-center gap-1 rounded-lg-full px-2.5 py-0.5 text-xs font-semibold border",
                              isApproved && "bg-emerald-50 text-emerald-700 border-emerald-200",
                              isPending && "bg-indigo-50 text-indigo-700 border-indigo-200",
                              isRejected && "bg-rose-50 text-rose-700 border-rose-200"
                            )}
                          >
                            <span className="w-1.5 h-1.5 rounded-lg-full bg-current" />
                            {isApproved && "Đã duyệt"}
                            {isPending && "Chờ duyệt"}
                            {isRejected && "Từ chối"}
                          </span>
                          
                          {/* Reject Reason text if any */}
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
                          className="p-1 rounded-lg-lg text-outline hover:text-indigo-600 hover:bg-surface-container transition-all cursor-pointer"
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
                      <p className="text-sm">Không tìm thấy báo cáo check-in nào.</p>
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
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg-lg border-none text-on-surface-variant bg-surface-container-lowest hover:bg-surface-container-low disabled:opacity-40 disabled:hover:bg-surface-container-lowest transition shadow-ambient cursor-pointer disabled:cursor-not-allowed"
              >
                Trước
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={clsx(
                    "inline-flex items-center justify-center w-8 h-8 rounded-lg-lg font-semibold border shadow-ambient transition cursor-pointer",
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
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg-lg border-none text-on-surface-variant bg-surface-container-lowest hover:bg-surface-container-low disabled:opacity-40 disabled:hover:bg-surface-container-lowest transition shadow-ambient cursor-pointer disabled:cursor-not-allowed"
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-surface-container-lowest rounded-lg-2xl overflow-hidden shadow-[0_32px_64px_rgba(19,27,46,0.12)] p-2 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-inverse-surface/60 hover:bg-inverse-surface text-white rounded-lg-full transition-all cursor-pointer shadow-ambient"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <img
              src={selectedImage}
              alt="Bản xem trước kích thước đầy đủ"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
