"use client";

import React, { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Check,
  X,
  Search,
  Filter,
  Clock,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ImageIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import FacebookProfilePreview from "@/components/FacebookProfilePreview";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { UserAvatar } from "@/components/shared/user-avatar";

interface Checkin {
  id: string;
  user_id: string;
  post_id: string;
  image_url: string;
  exif_time: string | Date | null;
  status: "PENDING" | "AUTO_APPROVED" | "APPROVED" | "REJECTED";
  reject_reason: string | null;
  is_ai_flagged: boolean;
  ai_confidence: number | null;
  submitted_at: string | Date;
  note?: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
    department: string | null;
    facebook_profile_url?: string | null;
  };
  post: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    start_at: string | Date;
  };
}

interface QueueClientProps {
  initialCheckins: any[];
  currentPage?: number;
  totalPages?: number;
  activeTab?: "PENDING" | "AUTO_APPROVED" | "REVIEWED";
  searchTerm?: string;
  deptFilter?: string;
  pendingCount?: number;
  autoApprovedCount?: number;
  reviewedCount?: number;
}

const presetReasons = ["Ảnh sai nội dung", "Ảnh bị mờ", "Ảnh nộp trùng"];

export default function QueueClient({
  initialCheckins,
  currentPage: _currentPage,
  totalPages: _totalPages,
  activeTab: initialTab = "PENDING",
  searchTerm: initialSearch = "",
  deptFilter: initialDept = "ALL",
  pendingCount: _pendingCount,
  autoApprovedCount: _autoApprovedCount,
  reviewedCount: _reviewedCount,
}: QueueClientProps) {
  const [checkins, setCheckins] = useState<Checkin[]>(initialCheckins);
  const [activeTab, setActiveTab] = useState<"PENDING" | "AUTO_APPROVED" | "REVIEWED">(initialTab as any);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [deptFilter, setDeptFilter] = useState(initialDept);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Rejection states
  const [isRejectingId, setIsRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isBatchRejecting, setIsBatchRejecting] = useState(false);
  const [batchRejectReason, setBatchRejectReason] = useState("");

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  // AI Scan state
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [aiScanResults, setAiScanResults] = useState<Record<string, { isValid: boolean; confidence: number; analysisReason: string }>>({});

  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const navigateWithParams = useCallback((params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (!value || value === "ALL" || (key === "page" && value === "1")) {
        sp.delete(key);
      } else {
        sp.set(key, value);
      }
    });
    const qs = sp.toString();
    router.push(qs ? `/admin/queue?${qs}` : "/admin/queue");
  }, [router, searchParams]);

  const handleTabChangeInternal = (tab: string) => {
    setSelectedIds(new Set());
    setAiScanResults({});
    navigateWithParams({ tab, page: "1", search: "", dept: "" });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      navigateWithParams({ search: value, page: "1" });
    }, 400);
    setSearchTimeout(timeout);
  };

  const handleDeptChange = (value: string) => {
    setDeptFilter(value);
    navigateWithParams({ dept: value, page: "1" });
  };

  const handleSelectAll = () => {
    const visibleIds = filteredCheckins.map(c => c.id);
    const allSelected = visibleIds.every(id => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allSelected) {
      visibleIds.forEach(id => next.delete(id));
    } else {
      visibleIds.forEach(id => next.add(id));
    }
    setSelectedIds(next);
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const executeAction = async (ids: string[], action: "APPROVE" | "REJECT", reason?: string) => {
    try {
      setIsActionLoading(true);
      const nextProcessed = new Set(processedIds);
      ids.forEach(id => nextProcessed.add(id));
      setProcessedIds(nextProcessed);

      const res = await fetch("/api/admin/checkin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinIds: ids, action, rejectReason: reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể thực hiện hành động.");

      toast.success(data.message || "Thao tác thành công.");
      setTimeout(() => {
        setCheckins(prev => prev.map(c =>
          ids.includes(c.id) ? { ...c, status: action === "APPROVE" ? "APPROVED" : "REJECTED", reject_reason: action === "REJECT" ? (reason || null) : null } : c
        ));
        const nextSelected = new Set(selectedIds);
        ids.forEach(id => nextSelected.delete(id));
        setSelectedIds(nextSelected);
        const nextProcessedClean = new Set(processedIds);
        ids.forEach(id => nextProcessedClean.delete(id));
        setProcessedIds(nextProcessedClean);
      }, 400);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Lỗi phê duyệt.");
      const nextProcessed = new Set(processedIds);
      ids.forEach(id => nextProcessed.delete(id));
      setProcessedIds(nextProcessed);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSingleApprove = (id: string) => executeAction([id], "APPROVE");
  const handleSingleRejectSubmit = (id: string) => {
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập hoặc chọn lý do từ chối.");
      return;
    }
    executeAction([id], "REJECT", rejectReason.trim());
    setIsRejectingId(null);
    setRejectReason("");
  };
  const handleBatchApprove = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    executeAction(ids, "APPROVE");
  };
  const handleBatchRejectSubmit = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || !batchRejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối hàng loạt.");
      return;
    }
    executeAction(ids, "REJECT", batchRejectReason.trim());
    setIsBatchRejecting(false);
    setBatchRejectReason("");
  };

  const handleAIScan = async (id: string) => {
    try {
      setScanningId(id);
      const res = await fetch("/api/admin/ai-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Quét AI thất bại.");

      setAiScanResults(prev => ({ ...prev, [id]: { isValid: data.isValid, confidence: data.confidence, analysisReason: data.analysisReason } }));
      setCheckins(prev => prev.map(c =>
        c.id === id ? { ...c, is_ai_flagged: !data.isValid, ai_confidence: data.confidence, note: `[AI Scan] ${data.analysisReason}` } : c
      ));
      toast.success(data.isValid ? "AI đánh giá: Bài nộp HỢP LỆ!" : "AI đánh giá: Phát hiện NGHI VẤN!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Lỗi quét AI.");
    } finally {
      setScanningId(null);
    }
  };

  const filteredCheckins = checkins;
  const pendingCount = _pendingCount ?? checkins.filter(c => c.status === "PENDING").length;
  const autoApprovedCount = _autoApprovedCount ?? checkins.filter(c => c.status === "AUTO_APPROVED").length;
  const reviewedCount = _reviewedCount ?? checkins.filter(c => c.status === "APPROVED" || c.status === "REJECTED").length;

  const getExifSublabel = (item: Checkin) => {
    if (!item.exif_time) return { label: "Lỗi: Không tìm thấy Metadata EXIF", type: "error" as const };
    const postStart = new Date(item.post.start_at).getTime();
    const exifTimeMs = new Date(item.exif_time).getTime();
    const postEnd = postStart + 24 * 60 * 60 * 1000;
    if (exifTimeMs > postEnd) {
      return { label: `Ảnh chụp sau deadline (quá 24h từ lúc đăng)`, type: "error" as const };
    }
    return { label: "EXIF hợp lệ", type: "success" as const };
  };

  // Start/End date for export
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const query = new URLSearchParams();
      if (startDate) query.append("startDate", startDate);
      if (endDate) query.append("endDate", endDate);
      const res = await fetch(`/api/admin/export-excel?${query.toString()}`);
      if (!res.ok) throw new Error("Lỗi khi tải file từ server");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date();
      a.download = `${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}.${today.getFullYear()} - Bao Cao Cong Viec Like Share.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Xuất báo cáo Excel thành công!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Không thể xuất file Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const tabs = [
    { key: "PENDING", label: "Chờ duyệt", count: pendingCount },
    { key: "AUTO_APPROVED", label: "Tự động duyệt", count: autoApprovedCount },
    { key: "REVIEWED", label: "Đã duyệt", count: reviewedCount },
  ];

  return (
    <div className="space-y-6 text-[#131b2e] animate-in fade-in duration-300" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] text-[#0050cb] font-bold">Kiểm duyệt</span>
          <h1 className="text-[32px] font-bold text-[#131b2e] tracking-tight mt-1 font-manrope" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Hàng đợi Check-in
          </h1>
          <p className="text-sm text-[#44495a] mt-1">Duyệt hoặc từ chối các bài nộp check-in của nhân viên.</p>
        </div>
        {/* Export */}
        <div className="flex items-center gap-2 bg-[#faf8ff] p-2 rounded-lg-xl shadow-[0_2px_8px_rgba(19,27,46,0.04)]">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg-lg bg-[#f2f3ff] text-xs text-[#44495a] focus:outline-none focus:ring-1 focus:ring-[#0050cb]/30 border-0" />
          <span className="text-xs text-[#44495a]">→</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg-lg bg-[#f2f3ff] text-xs text-[#44495a] focus:outline-none focus:ring-1 focus:ring-[#0050cb]/30 border-0" />
          <button onClick={handleExport} disabled={isExporting}
            className="px-3.5 py-1.5 rounded-lg-lg text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #0050cb, #0066ff)" }}>
            {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Xuất báo cáo
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: "Chờ duyệt", value: pendingCount, icon: Clock, color: "bg-amber-50 text-amber-600" },
          { label: "Tự động duyệt", value: autoApprovedCount, icon: Sparkles, color: "bg-emerald-50 text-emerald-600" },
          { label: "Đã duyệt / Từ chối", value: reviewedCount, icon: CheckCircle2, color: "bg-indigo-50 text-indigo-600" },
        ].map((s) => (
          <div key={s.label} className="bg-surface-container-lowest rounded-lg-2xl p-5 flex items-center justify-between shadow-[0_20px_40px_rgba(19,27,46,0.06)]">
            <div>
              <p className="text-xs font-bold text-[#44495a] uppercase tracking-wider">{s.label}</p>
              <p className="text-3xl font-bold text-[#131b2e] mt-1" style={{ fontFamily: "'Manrope', sans-serif" }}>{s.value}</p>
            </div>
            <div className={`p-3 rounded-lg-xl ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Control bar: tabs + search + dept filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab pills */}
        <div className="flex p-1 rounded-lg-xl bg-[#f2f3ff] w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChangeInternal(tab.key)}
              className={cn(
                "relative px-4 py-2 rounded-lg-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5",
                activeTab === tab.key
                  ? "bg-surface-container-lowest text-[#0050cb] shadow-ambient"
                  : "text-[#44495a] hover:text-[#131b2e]"
              )}
              style={activeTab === tab.key ? { fontFamily: "'Manrope', sans-serif", fontWeight: 600 } : {}}
            >
              {tab.label}
              <span className="ml-0.5 px-1.5 py-0.5 rounded-lg-full text-[9px] font-bold text-white" style={{ background: "#0050cb" }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Dept */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#44495a]" />
            <input type="text" placeholder="Tìm nhân viên, bài viết..."
              value={searchTerm} onChange={e => handleSearchChange(e.target.value)}
              className="w-full sm:w-52 pl-9 pr-3 py-2 rounded-lg-xl text-xs bg-[#f2f3ff] text-[#131b2e] placeholder:text-[#44495a]/40 focus:outline-none focus:ring-2 focus:ring-[#0050cb]/20 border-0 transition-all" />
          </div>
          <div className="relative">
            <select value={deptFilter} onChange={e => handleDeptChange(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg-xl text-xs bg-[#f2f3ff] text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#0050cb]/20 border-0 cursor-pointer">
              <option value="ALL">Tất cả</option>
              <option value="TECH">TECH</option>
              <option value="SALES">SALES</option>
              <option value="Other">Khác</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#44495a]" />
          </div>
        </div>
      </div>

      {/* Select All */}
      {activeTab === "PENDING" && filteredCheckins.length > 0 && (
        <button onClick={handleSelectAll} className="flex items-center gap-2 text-xs font-semibold text-[#44495a] hover:text-[#0050cb] transition-colors">
          <div className={cn(
            "w-4 h-4 rounded-lg border-2 flex items-center justify-center transition-colors",
            filteredCheckins.every(c => selectedIds.has(c.id))
              ? "bg-[#0050cb] border-[#0050cb]"
              : "border-[#c4c8da]"
          )}>
            {filteredCheckins.every(c => selectedIds.has(c.id)) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </div>
          Chọn tất cả trên trang này
        </button>
      )}

      {/* Empty state */}
      {filteredCheckins.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-lg-2xl p-16 text-center shadow-[0_20px_40px_rgba(19,27,46,0.06)]">
          <div className="w-16 h-16 rounded-lg-full bg-[#f2f3ff] flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-7 h-7 text-[#c4c8da]" />
          </div>
          <h3 className="text-lg font-bold text-[#131b2e] font-manrope">Hàng đợi trống</h3>
          <p className="text-xs text-[#44495a] mt-1 max-w-sm mx-auto">
            Không có lượt check-in nào phù hợp với bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <>
          {/* Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCheckins.map((item) => {
              const exifInfo = getExifSublabel(item);
              const isSelected = selectedIds.has(item.id);
              const isProcessed = processedIds.has(item.id);
              const scanResult = aiScanResults[item.id] || (item.ai_confidence !== null ? {
                isValid: !item.is_ai_flagged,
                confidence: item.ai_confidence,
                analysisReason: item.note?.startsWith("[AI Scan] ") ? item.note.replace("[AI Scan] ", "") : (item.note || "")
              } : null);

              const statusMeta = item.status === "PENDING" ? { label: "Chờ duyệt", bg: "bg-amber-50 text-amber-700" }
                : item.status === "APPROVED" || item.status === "AUTO_APPROVED" ? { label: item.status === "AUTO_APPROVED" ? "Tự động duyệt" : "Đã duyệt", bg: "bg-emerald-50 text-emerald-700" }
                : item.status === "REJECTED" ? { label: "Từ chối", bg: "bg-rose-50 text-rose-700" }
                : { label: item.status, bg: "bg-surface-container-low text-on-surface-variant" };

              return (
                <div
                  key={item.id}
                  className={cn(
                    "relative rounded-lg-2xl overflow-hidden transition-all duration-300 flex flex-col",
                    isProcessed && "opacity-0 scale-90 translate-y-4 max-h-0 pointer-events-none duration-500"
                  )}
                  style={{ background: "#ffffff", boxShadow: "0 20px 40px rgba(19, 27, 46, 0.06)" }}
                >
                  {/* Selection checkbox overlay */}
                  {activeTab === "PENDING" && (
                    <button onClick={(e) => { e.stopPropagation(); handleSelectOne(item.id); }}
                      className={cn(
                        "absolute top-3 left-3 z-20 w-6 h-6 rounded-lg-xl flex items-center justify-center transition-all duration-200 cursor-pointer",
                        isSelected ? "bg-[#0050cb]" : "bg-surface-container-lowest/90 shadow-ambient"
                      )}>
                      {isSelected ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} /> : null}
                    </button>
                  )}

                  {/* Image: 16:9 ratio */}
                  <div className="relative w-full aspect-video cursor-zoom-in overflow-hidden"
                    onClick={() => setZoomImageUrl(item.image_url)}>
                    <Image src={item.image_url} alt="Checkin proof" fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    {/* Status badge top-right */}
                    <span className={cn(
                      "absolute top-3 right-3 z-10 px-2.5 py-1 rounded-lg-full text-[10px] font-bold shadow-ambient",
                      statusMeta.bg
                    )}>
                      {statusMeta.label}
                    </span>
                  </div>

                  {/* Card body */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col">
                    {/* User info row: avatar + name + dept */}
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex-shrink-0">
                        <UserAvatar name={item.user.name} size="sm" />
                        <div className="absolute -inset-0.5 rounded-lg-full border-2 border-[#0050cb]/10 pointer-events-none" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#131b2e] truncate" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {item.user.name || "Thành viên"}
                        </p>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg-full text-[10px] font-bold uppercase tracking-wide",
                        item.user.department === "TECH" ? "bg-blue-50 text-blue-700" :
                        item.user.department === "SALES" ? "bg-pink-50 text-pink-700" :
                        "bg-surface-container-low text-on-surface-variant"
                      )}>
                        {item.user.department || "N/A"}
                      </span>
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-[#44495a]">
                      {new Date(item.submitted_at).toLocaleString("vi-VN", {
                        hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric"
                      })}
                    </div>

                    {/* Post title */}
                    <p className="text-xs font-semibold text-[#44495a] line-clamp-1">
                      📌 {item.post.title}
                    </p>

                    {/* FB profile link */}
                    <div className="flex items-center gap-1.5">
                      {item.user.facebook_profile_url ? (
                        <FacebookProfilePreview facebookLink={item.user.facebook_profile_url} />
                      ) : (
                        <span className="text-[10px] font-medium text-[#44495a] opacity-50">Chưa có link FB</span>
                      )}
                    </div>

                    {/* System error */}
                    {exifInfo.type === "error" && (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg-lg bg-[#ffdad6] text-[#410002] text-[10px] font-semibold">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span>{exifInfo.label}</span>
                      </div>
                    )}

                    {/* AI Confidence meter */}
                    {scanResult && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-[#44495a] flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#0050cb]" />
                            Độ tin cậy AI
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold",
                            scanResult.isValid ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {Math.round(scanResult.confidence * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-1 rounded-lg-full bg-[#e1e2ec] overflow-hidden">
                          <div className="h-full rounded-lg-full transition-all duration-500"
                            style={{
                              width: `${Math.round(scanResult.confidence * 100)}%`,
                              background: scanResult.isValid
                                ? "linear-gradient(90deg, #0050cb, #0066ff)"
                                : "linear-gradient(90deg, #ba1a1a, #ff5252)"
                            }} />
                        </div>
                        <p className="text-[10px] text-[#44495a] leading-relaxed mt-1">
                          {scanResult.analysisReason || "Đã quét bằng AI."}
                        </p>
                      </div>
                    )}

                    {/* AI Scan button */}
                    {!scanResult && scanningId === item.id && (
                      <div className="space-y-1.5 py-1">
                        <div className="h-2.5 bg-[#e1e2ec] rounded-lg-full animate-pulse w-3/4" />
                        <div className="h-2.5 bg-[#e1e2ec] rounded-lg-full animate-pulse w-full" />
                      </div>
                    )}
                    {!scanResult && scanningId !== item.id && activeTab === "PENDING" && (
                      <button onClick={() => handleAIScan(item.id)} disabled={isActionLoading}
                        className="w-full py-2 rounded-lg-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0"
                        style={{ background: "#f2f3ff", color: "#0050cb" }}>
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Quét
                      </button>
                    )}

                    {/* Reject reason display */}
                    {item.status === "REJECTED" && item.reject_reason && (
                      <div className="p-2.5 rounded-lg-lg bg-[#ffdad6] text-[#410002] text-[10px] font-semibold">
                        Lý do: {item.reject_reason}
                      </div>
                    )}

                    {/* Spacer for flex */}
                    <div className="flex-1" />

                    {/* Action row */}
                    {activeTab === "PENDING" && (
                      <>
                        {isRejectingId === item.id ? (
                          <div className="space-y-2 pt-1 animate-in slide-in-from-bottom-2 duration-200">
                            <div className="flex flex-wrap gap-1">
                              {presetReasons.map((r) => (
                                <button key={r} onClick={() => setRejectReason(r)}
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg-full text-[10px] font-bold border transition-colors bg-surface-container-lowest text-[#44495a] border-[#c4c8da] hover:border-[#0050cb]",
                                    rejectReason === r && "border-[#0050cb]"
                                  )}>
                                  {r}
                                </button>
                              ))}
                            </div>
                            <textarea placeholder="Nhập lý do từ chối..."
                              value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg-xl text-xs resize-none transition-all outline-none"
                              style={{ background: "#f2f3ff", outline: "none", color: "#131b2e" }}
                              onFocus={e => { e.target.style.outline = "2px solid rgba(0, 80, 203, 0.3)"; e.target.style.outlineOffset = "0"; }}
                              onBlur={e => { e.target.style.outline = "none"; }}
                              rows={2} />
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => { setIsRejectingId(null); setRejectReason(""); }}
                                className="px-3 py-1.5 rounded-lg-lg text-xs font-bold text-[#44495a] hover:bg-[#f2f3ff] transition-colors">
                                Hủy
                              </button>
                              <button onClick={() => handleSingleRejectSubmit(item.id)} disabled={isActionLoading}
                                className="px-3 py-1.5 rounded-lg-lg text-xs font-bold text-white transition-colors"
                                style={{ background: "#ba1a1a" }}>
                                Xác nhận
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            {/* Reject */}
                            <button onClick={() => { setIsRejectingId(item.id); setRejectReason(""); }}
                              disabled={isActionLoading || scanningId === item.id}
                              className="px-2.5 py-2 rounded-lg-xl text-xs font-bold transition-all cursor-pointer border-0"
                              style={{ color: "#410002", background: "#ffdad6" }}>
                              <X className="w-3 h-3 inline-block mr-1" />
                              Từ chối
                            </button>
                            {/* AI Scan */}
                            {!scanResult && (
                              <button onClick={() => handleAIScan(item.id)} disabled={isActionLoading}
                                className="px-2.5 py-2 rounded-lg-xl text-xs font-bold transition-all cursor-pointer border-0"
                                style={{ background: "#f2f3ff", color: "#0050cb" }}>
                                <Sparkles className="w-3 h-3 inline-block mr-1" />
                                AI
                              </button>
                            )}
                            {scanResult && <div />}
                            {/* Approve */}
                            <button onClick={() => handleSingleApprove(item.id)} disabled={isActionLoading || scanningId === item.id}
                              className="px-2.5 py-2 rounded-lg-xl text-xs font-bold text-white transition-all cursor-pointer border-0 shadow-ambient"
                              style={{ background: "linear-gradient(135deg, #0050cb, #0066ff)" }}>
                              <Check className="w-3 h-3 inline-block mr-1" />
                              Duyệt
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination currentPage={_currentPage ?? 1} totalPages={_totalPages ?? 1}
            onPageChange={page => navigateWithParams({ page: String(page) })} />
        </>
      )}

      {/* Floating Bulk Action Bar */}
      {activeTab === "PENDING" && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xl animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex items-center justify-between gap-4 px-5 py-3 rounded-lg-2xl shadow-[0_20px_40px_rgba(19,27,46,0.06)]"
            style={{ background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#131b2e]">
              <span>Đã chọn</span>
              <span className="text-[#0050cb] font-bold">{selectedIds.size}</span>
              <span>mục</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 rounded-lg-lg text-xs font-bold text-[#44495a] hover:bg-[#f2f3ff] transition-colors">
                Hủy
              </button>
              <button onClick={() => { setIsBatchRejecting(true); setBatchRejectReason(""); }} disabled={isActionLoading}
                className="px-3.5 py-1.5 rounded-lg-lg text-xs font-bold text-white transition-all cursor-pointer shadow-ambient"
                style={{ background: "#ba1a1a" }}>
                <X className="w-3 h-3 inline-block mr-1" />
                Từ chối
              </button>
              <button onClick={handleBatchApprove} disabled={isActionLoading}
                className="px-3.5 py-1.5 rounded-lg-lg text-xs font-bold text-white transition-all cursor-pointer shadow-ambient"
                style={{ background: "linear-gradient(135deg, #0050cb, #0066ff)" }}>
                {isActionLoading ? <Loader2 className="w-3 h-3 animate-spin inline-block mr-1" /> : <Check className="w-3 h-3 inline-block mr-1" />}
                Duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomImageUrl && (
        <div onClick={() => setZoomImageUrl(null)}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300">
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-lg-2xl animate-in zoom-in-95 duration-200"
            style={{ boxShadow: "0 20px 40px rgba(19, 27, 46, 0.06)" }}>
            <Image src={zoomImageUrl} alt="Zoomed preview" fill className="object-contain" sizes="90vw" />
            <button onClick={() => setZoomImageUrl(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors backdrop-blur-sm">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Batch Rejection Modal */}
      {isBatchRejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div onClick={() => setIsBatchRejecting(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-lg-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            style={{ background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "0 20px 40px rgba(19, 27, 46, 0.06)" }}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#131b2e] font-manrope" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Từ chối hàng loạt
                </h3>
                <button onClick={() => setIsBatchRejecting(false)} className="w-7 h-7 rounded-lg-full flex items-center justify-center hover:bg-[#f2f3ff] transition-colors">
                  <X className="w-4 h-4 text-[#44495a]" />
                </button>
              </div>

              <p className="text-xs text-[#44495a]">
                Áp dụng lý do từ chối cho <strong>{selectedIds.size}</strong> lượt check-in đã chọn:
              </p>

              <div className="flex flex-wrap gap-1">
                {presetReasons.map((r) => (
                  <button key={r} onClick={() => setBatchRejectReason(r)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg-full text-[10px] font-bold border transition-colors",
                      batchRejectReason === r ? "border-[#0050cb] bg-[#d8e2ff] text-[#003fa4]" : "border-[#c4c8da] text-[#44495a] hover:border-[#0050cb]"
                    )}>
                    {r}
                  </button>
                ))}
              </div>

              <textarea placeholder="Nhập lý do cụ thể..."
                value={batchRejectReason} onChange={e => setBatchRejectReason(e.target.value)}
                className="w-full px-4 py-3 rounded-lg-xl text-xs resize-none transition-all outline-none"
                style={{ background: "#f2f3ff", outline: "none", color: "#131b2e" }}
                onFocus={e => { e.target.style.outline = "2px solid rgba(0, 80, 203, 0.3)"; }}
                onBlur={e => { e.target.style.outline = "none"; }}
                rows={3} />

              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => { setIsBatchRejecting(false); setBatchRejectReason(""); }}
                  className="px-4 py-2 rounded-lg-lg text-xs font-bold text-[#44495a] hover:bg-[#f2f3ff] transition-colors">
                  Hủy
                </button>
                <button onClick={handleBatchRejectSubmit} disabled={isActionLoading || !batchRejectReason.trim()}
                  className="px-4 py-2 rounded-lg-lg text-xs font-bold text-white transition-all shadow-ambient"
                  style={{ background: "#ba1a1a" }}>
                  Từ chối tất cả
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
