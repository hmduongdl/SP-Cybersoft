"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Check,
  X,
  Search,
  Clock,
  Loader2,
  Sparkles,
  ChevronDown,
  ImageIcon,
  Building2,
  UserCircle2,
  ExternalLink,
  RefreshCw,
  Filter,
  MessageSquare,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Cpu,
} from "lucide-react";
import { Toaster } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import FacebookProfilePreview from "@/components/FacebookProfilePreview";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { UserAvatar } from "@/components/shared/user-avatar";

interface Checkin {
  id: string;
  user_id: string;
  post_id?: string | null;
  image_url: string;
  exif_time: string | Date | null;
  status: "PENDING" | "AUTO_APPROVED" | "APPROVED" | "REJECTED";
  reject_reason: string | null;
  is_ai_flagged: boolean;
  ai_confidence: number | null;
  ai_extracted_username?: string | null;
  ai_extracted_title?: string | null;
  ai_analysis_reason?: string | null;
  submitted_at: string | Date;
  note?: string | null;
  task_type?: string;
  build_data?: any;
  pc_task_id?: string | null;
  pc_task?: {
    id: string;
    date: string | Date;
    customer_need: string;
    max_budget: number;
    requirements: string;
  } | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
    department: string | null;
    facebook_profile_url?: string | null;
    trust_score?: number | null;
  };
  post?: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    start_at: string | Date;
  } | null;
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
  const [viewingBuildItem, setViewingBuildItem] = useState<any | null>(null);
  // Revoke (thu hồi tự động duyệt) state
  const [isRevokingId, setIsRevokingId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  // AI Scan state
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [aiScanResults, setAiScanResults] = useState<Record<string, { isValid: boolean; confidence: number; analysisReason: string; extractedUsername?: string | null; extractedTitle?: string | null }>>({});

  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Sync all prop-driven state when URL params change (tab switch, search, dept, page)
  useEffect(() => {
    setCheckins(initialCheckins);
    setActiveTab(initialTab as any);
    setSearchTerm(initialSearch);
    setDeptFilter(initialDept);
    setSelectedIds(new Set());
    setAiScanResults({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.toString()]);

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

  const handleTabChangeInternal = useCallback((tab: string) => {
    if (tab === activeTab) return;
    setSelectedIds(new Set());
    setAiScanResults({});
    navigateWithParams({ tab, page: "1", search: "", dept: "" });
    router.refresh();
  }, [activeTab, navigateWithParams, router]);

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
  const handleRevokeSubmit = (id: string) => {
    if (!revokeReason.trim()) {
      toast.error("Vui lòng nhập lý do thu hồi.");
      return;
    }
    executeAction([id], "REJECT", revokeReason.trim());
    setIsRevokingId(null);
    setRevokeReason("");
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

      setAiScanResults(prev => ({ ...prev, [id]: { isValid: data.isValid, confidence: data.confidence, analysisReason: data.analysisReason, extractedUsername: data.extractedUsername, extractedTitle: data.extractedTitle } }));
      setCheckins(prev => prev.map(c =>
        c.id === id ? { ...c, is_ai_flagged: !data.isValid, ai_confidence: data.confidence, ai_extracted_username: data.extractedUsername, ai_extracted_title: data.extractedTitle, ai_analysis_reason: data.analysisReason, note: `[AI Scan] ${data.analysisReason}` } : c
      ));
      toast.success(data.isValid ? "AI đánh giá: Bài nộp HỢP LỆ!" : "AI đánh giá: Phát hiện NGHI VẤN!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Lỗi quét AI.");
    } finally {
      setScanningId(null);
    }
  };

  const handleAIReReview = async (id: string) => {
    try {
      setScanningId(id);
      const res = await fetch("/api/admin/ai-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId: id, applyDecision: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI duyệt lại thất bại.");

      setAiScanResults(prev => ({
        ...prev,
        [id]: {
          isValid: data.isValid,
          confidence: data.confidence,
          analysisReason: data.analysisReason,
          extractedUsername: data.extractedUsername,
          extractedTitle: data.extractedTitle,
        },
      }));
      setCheckins(prev => prev.map(c =>
        c.id === id ? {
          ...c,
          status: data.status || (data.isValid ? "AUTO_APPROVED" : "REJECTED"),
          reject_reason: data.isValid ? null : `[AI Scan] ${data.analysisReason}`,
          is_ai_flagged: !data.isValid,
          ai_confidence: data.confidence,
          ai_extracted_username: data.extractedUsername,
          ai_extracted_title: data.extractedTitle,
          ai_analysis_reason: data.analysisReason,
          note: `[AI Scan] ${data.analysisReason}`,
        } : c
      ));
      toast.success(data.isValid ? "AI đã duyệt lại: bài hợp lệ." : "AI đã duyệt lại: vẫn cần từ chối.");
      router.refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Lỗi khi AI duyệt lại.");
    } finally {
      setScanningId(null);
    }
  };

  const handleTrustScoreAdjust = async (userId: string, delta: number) => {
    try {
      const res = await fetch("/api/admin/users/trust-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, delta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Điều chỉnh thất bại.");

      setCheckins(prev => prev.map(c =>
        c.user.id === userId ? { ...c, user: { ...c.user, trust_score: data.trust_score } } : c
      ));
      toast.success(`Độ tin cậy đã cập nhật: ${data.trust_score}/100`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Lỗi điều chỉnh độ tin cậy.");
    }
  };

  // Client-side filter by tab status so status changes immediately remove items from view
  const filteredCheckins = useMemo(() => checkins.filter(c => {
    if (activeTab === "AUTO_APPROVED") return c.status === "AUTO_APPROVED";
    if (activeTab === "REVIEWED") return c.status === "APPROVED" || c.status === "REJECTED";
    return c.status === "PENDING";
  }), [checkins, activeTab]);
  const pendingCount = useMemo(() => _pendingCount ?? checkins.filter(c => c.status === "PENDING").length, [_pendingCount, checkins]);
  const autoApprovedCount = useMemo(() => _autoApprovedCount ?? checkins.filter(c => c.status === "AUTO_APPROVED").length, [_autoApprovedCount, checkins]);
  const reviewedCount = useMemo(() => _reviewedCount ?? checkins.filter(c => c.status === "APPROVED" || c.status === "REJECTED").length, [_reviewedCount, checkins]);

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
    <div className="space-y-6 pb-12 text-on-surface animate-in fade-in duration-300">
      <Toaster position="top-right" richColors duration={1500} />
      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-2">
        <div>
          <nav className="flex gap-2 text-xs font-inter text-on-surface-variant/70 mb-2">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-primary font-semibold">Hàng đợi Check-in</span>
          </nav>
          <h1 className="font-manrope font-bold text-headline-lg text-on-surface">Hàng đợi Check-in</h1>
          <p className="mt-1 text-sm text-on-surface-variant font-inter">Duyệt hoặc từ chối các bài nộp check-in của nhân viên.</p>
        </div>
        {/* Export */}
        <div className="flex items-center gap-2 bg-surface-container-lowest p-2 rounded-[16px] shadow-ambient">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-surface-container-low text-xs text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary/30 border-0 font-inter" />
          <span className="text-xs text-on-surface-variant">→</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-surface-container-low text-xs text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary/30 border-0 font-inter" />
          <button onClick={handleExport} disabled={isExporting}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer gradient-primary font-inter">
            {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Xuất báo cáo
          </button>
        </div>
      </header>

      {/* Control bar: tabs + search + dept filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab pills */}
        <div className="flex p-1 rounded-[12px] bg-surface-container-low w-fit border-none">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChangeInternal(tab.key)}
              className={cn(
                "relative px-4 py-2 rounded-[10px] text-xs font-medium transition-all duration-200 flex items-center gap-1.5 font-inter",
                activeTab === tab.key
                  ? "bg-surface-container-highest text-primary font-semibold font-manrope"
                  : "bg-transparent text-on-surface-variant hover:text-on-surface"
              )}
            >
              {tab.label}
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary text-white leading-none font-inter">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Dept */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
            <input type="text" placeholder="Tìm nhân viên, bài viết..."
              value={searchTerm} onChange={e => handleSearchChange(e.target.value)}
              className="w-full sm:w-52 pl-9 pr-3 py-2 rounded-xl text-xs bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 border-0 transition-all font-inter" />
          </div>
          <div className="relative">
            <select value={deptFilter} onChange={e => handleDeptChange(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl text-xs bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 border-0 cursor-pointer font-inter">
              <option value="ALL">Tất cả</option>
              <option value="TECH">TECH</option>
              <option value="SALES">SALES</option>
              <option value="Other">Khác</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" />
          </div>
        </div>
      </div>

      {/* Select All — only in pending tab with items */}
      {activeTab === "PENDING" && filteredCheckins.length > 0 && (
        <button onClick={handleSelectAll} className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant hover:text-primary transition-all duration-150 font-inter select-none animate-in fade-in slide-in-from-left-2 duration-300">
          <div className={cn(
            "w-4 h-4 rounded border-none flex items-center justify-center transition-all duration-150",
            filteredCheckins.every(c => selectedIds.has(c.id))
              ? "bg-primary text-white"
              : "bg-surface-container hover:bg-surface-container-high"
          )}>
            {filteredCheckins.every(c => selectedIds.has(c.id)) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </div>
          Chọn tất cả trên trang này
        </button>
      )}

      {/* Empty state */}
      {filteredCheckins.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-[16px] p-16 text-center shadow-[0_20px_40px_rgba(19,27,46,0.06)] border-none">
          <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mx-auto mb-4 text-on-surface-variant/40">
            <ImageIcon className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-on-surface font-manrope">Hàng đợi trống</h3>
          <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto font-inter">
            Không có lượt check-in nào phù hợp với bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <>
          {/* Card Grid: 3 columns desktop, 2 tablet, 1 mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCheckins.map((item, idx) => {
              const isSelected = selectedIds.has(item.id);
              const isProcessed = processedIds.has(item.id);
              const scanResult = aiScanResults[item.id] || (item.ai_confidence !== null ? {
                isValid: !item.is_ai_flagged,
                confidence: item.ai_confidence,
                analysisReason: item.ai_analysis_reason || (item.note?.startsWith("[AI Scan] ") ? item.note.replace("[AI Scan] ", "") : (item.note || "")),
                extractedUsername: item.ai_extracted_username,
                extractedTitle: item.ai_extracted_title,
              } : null);

              const statusMeta = item.status === "PENDING" ? { label: "Chờ duyệt", bg: "bg-amber-50 text-amber-700 border border-amber-100" }
                : item.status === "APPROVED" || item.status === "AUTO_APPROVED" ? { label: item.status === "AUTO_APPROVED" ? "Tự động duyệt" : "Đã duyệt", bg: "bg-emerald-50 text-emerald-700 border border-emerald-100" }
                : item.status === "REJECTED" ? { label: "Từ chối", bg: "bg-rose-50 text-rose-700 border border-rose-100" }
                : { label: item.status, bg: "bg-surface-container text-on-surface-variant" };

              return (
                <div
                  key={item.id}
                  style={{ animationDelay: `${idx * 60}ms` }}
                  className={cn(
                    "relative rounded-[16px] overflow-hidden transition-all duration-300 flex flex-col border-none shadow-[0_20px_40px_rgba(19,27,46,0.06)] bg-surface-container-lowest",
                    "animate-in fade-in slide-in-from-bottom-4 duration-300",
                    "hover:shadow-[0_24px_48px_rgba(19,27,46,0.1)] hover:-translate-y-1",
                    isProcessed && "opacity-0 scale-90 translate-y-4 max-h-0 pointer-events-none duration-500"
                  )}
                >
                  {/* Selection checkbox overlay — only on pending items */}
                  {item.status === "PENDING" && (
                    <button onClick={(e) => { e.stopPropagation(); handleSelectOne(item.id); }}
                      className={cn(
                        "absolute top-3 left-3 z-20 w-6 h-6 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border-none",
                        isSelected ? "bg-primary" : "bg-surface-container-lowest/90 shadow-ambient"
                      )}>
                      {isSelected ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} /> : null}
                    </button>
                  )}

                  {/* Image: 16:9 ratio or PC build placeholder */}
                  {item.task_type === "PC_BUILD" ? (
                    <div className="relative w-full aspect-video bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 flex items-center justify-center border-b border-outline/10">
                      <div className="text-center space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center mx-auto">
                          <Cpu className="w-6 h-6 animate-pulse" />
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full">
                          PC Build Training
                        </span>
                      </div>
                      {/* Status badge top-right */}
                      <span className={cn(
                        "absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-ambient border-none",
                        statusMeta.bg
                      )}>
                        {statusMeta.label}
                      </span>
                    </div>
                  ) : (
                    <div className="relative w-full aspect-video cursor-zoom-in overflow-hidden"
                      onClick={() => setZoomImageUrl(item.image_url)}>
                      <Image src={item.image_url} alt="Checkin proof" fill
                        referrerPolicy="no-referrer"
                        className="object-cover rounded-t-[16px]"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
                      {/* Status badge top-right */}
                      <span className={cn(
                        "absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-ambient border-none",
                        statusMeta.bg
                      )}>
                        {statusMeta.label}
                      </span>
                    </div>
                  )}

                  {/* Card body */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col bg-surface-container-lowest">
                    {/* User info row: avatar + name + dept + trust score */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 p-[2px] bg-surface-container-low ring-2 ring-primary ring-offset-2 ring-offset-surface-container-low bg-clip-content">
                        <UserAvatar
                          name={item.user.name}
                          src={item.user.avatar_url}
                          size="sm"
                          className="border-none shadow-none w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-on-surface truncate font-inter">
                          {item.user.name || "Thành viên"}
                        </p>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-inter border-none",
                        item.user.department === "TECH" ? "bg-blue-500/10 text-blue-700" :
                        item.user.department === "SALES" ? "bg-pink-500/10 text-pink-700" :
                        "bg-surface-container text-on-surface-variant"
                      )}>
                        {item.user.department || "N/A"}
                      </span>
                      {/* Trust score badge with adjust buttons */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTrustScoreAdjust(item.user.id, -5); }}
                          className="w-4 h-4 rounded-full bg-surface-container hover:bg-error-container text-on-surface-variant hover:text-on-error-container flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer border-none leading-none"
                          title="Giảm 5 điểm độ tin cậy"
                        >−</button>
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded-full text-[9px] font-bold font-inter border-none min-w-[28px] text-center cursor-default",
                            (item.user.trust_score ?? 50) >= 70 ? "bg-emerald-500/10 text-emerald-700" :
                            (item.user.trust_score ?? 50) >= 40 ? "bg-amber-500/10 text-amber-700" :
                            "bg-rose-500/10 text-rose-700"
                          )}
                          title="Độ tin cậy (thang điểm 100)"
                        >
                          {item.user.trust_score ?? 50}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTrustScoreAdjust(item.user.id, 5); }}
                          className="w-4 h-4 rounded-full bg-surface-container hover:bg-emerald-100 text-on-surface-variant hover:text-emerald-700 flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer border-none leading-none"
                          title="Tăng 5 điểm độ tin cậy"
                        >+</button>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-on-surface-variant font-inter">
                      {new Date(item.submitted_at).toLocaleString("vi-VN", {
                        hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric"
                      })}
                    </div>

                    {/* Card Title */}
                    {item.task_type === "PC_BUILD" ? (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-manrope">
                          💻 Bài tập Build PC - {item.user.name || "Nhân viên"}
                        </p>
                        {item.pc_task?.customer_need && (
                          <p className="text-[11px] font-semibold text-on-surface-variant line-clamp-2 font-inter leading-relaxed">
                            🎯 Nhu cầu: {item.pc_task.customer_need}
                          </p>
                        )}
                        {item.pc_task?.max_budget && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-inter">
                            💰 Ngân sách: {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(item.pc_task.max_budget)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-on-surface-variant line-clamp-1 font-inter">
                        📌 {item.post?.title || "Bài viết không xác định"}
                      </p>
                    )}

                    {/* FB profile link */}
                    <div className="flex items-center gap-1.5">
                      {item.user.facebook_profile_url ? (
                        <FacebookProfilePreview facebookLink={item.user.facebook_profile_url} />
                      ) : (
                        <span className="text-[10px] font-medium text-on-surface-variant/40 font-inter">Chưa có link FB</span>
                      )}
                    </div>

                    {/* AI Confidence meter + Extracted data */}
                    {item.task_type !== "PC_BUILD" && scanResult && (
                      <div className="space-y-1.5 p-2.5 rounded-lg bg-surface-container-low/50 border border-outline-variant/30">
                        <div className="flex items-center justify-between font-inter">
                          <span className="text-[10px] font-semibold text-on-surface-variant flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-primary" />
                            Độ tin cậy AI
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold",
                            scanResult.isValid ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {Math.round(scanResult.confidence * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-surface-container-high overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500 gradient-primary"
                            style={{
                              width: `${Math.round(scanResult.confidence * 100)}%`
                            }} />
                        </div>
                        {/* AI-extracted info */}
                        {(scanResult.extractedUsername || scanResult.extractedTitle) && (
                          <div className="mt-1.5 space-y-1 text-[10px] font-inter">
                            {scanResult.extractedUsername && (
                              <div className="flex items-start gap-1.5">
                                <span className="text-on-surface-variant/50 shrink-0 mt-0.5">👤</span>
                                <div>
                                  <span className="text-on-surface-variant/50">AI đọc tên: </span>
                                  <span className="font-semibold text-on-surface-variant">{scanResult.extractedUsername}</span>
                                </div>
                              </div>
                            )}
                            {scanResult.extractedTitle && (
                              <div className="flex items-start gap-1.5">
                                <span className="text-on-surface-variant/50 shrink-0 mt-0.5">📝</span>
                                <div>
                                  <span className="text-on-surface-variant/50">AI đọc bài: </span>
                                  <span className="font-semibold text-on-surface-variant line-clamp-2">{scanResult.extractedTitle}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-[10px] text-on-surface-variant/70 leading-relaxed mt-0.5 font-inter">
                          {scanResult.analysisReason || "Đã quét bằng AI."}
                        </p>
                      </div>
                    )}

                    {/* AI Scan loading placeholder */}
                    {item.task_type !== "PC_BUILD" && !scanResult && scanningId === item.id && (
                      <div className="space-y-1.5 py-1">
                        <div className="h-1 bg-surface-container-high rounded-full animate-pulse w-3/4" />
                        <div className="h-2 bg-surface-container-high rounded animate-pulse w-full" />
                      </div>
                    )}

                    {/* Reject reason display */}
                    {item.status === "REJECTED" && (
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-lg bg-error-container text-on-error-container text-[10px] font-semibold font-inter border-none">
                          Lý do: {item.reject_reason || "Chưa có lý do từ chối."}
                        </div>
                        {item.task_type !== "PC_BUILD" && (
                          <button
                            type="button"
                            onClick={() => handleAIReReview(item.id)}
                            disabled={isActionLoading || scanningId === item.id}
                            className="w-full px-3 py-2 rounded-[8px] bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 font-inter disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Yêu cầu AI quét và đưa ra quyết định lại cho bài đã từ chối"
                          >
                            {scanningId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-primary" />
                            )}
                            AI duyệt lại
                          </button>
                        )}
                      </div>
                    )}

                    {/* View Build Details Button (PC_BUILD only) */}
                    {item.task_type === "PC_BUILD" && (
                      <button
                        type="button"
                        onClick={() => setViewingBuildItem(item)}
                        className="w-full mt-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold font-inter transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Xem chi tiết cấu hình
                      </button>
                    )}

                    {/* Spacer for flex */}
                    <div className="flex-1" />

                    {/* Action row — only for items still pending */}
                    {item.status === "PENDING" && (
                      <>
                        {isRejectingId === item.id ? (
                          <div className="space-y-2 pt-1 animate-in slide-in-from-bottom-2 duration-200">
                            <div className="flex flex-wrap gap-1">
                              {presetReasons.map((r) => (
                                <button key={r} onClick={() => setRejectReason(r)}
                                  className={cn(
                                    "px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all duration-150 bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-primary font-inter",
                                    rejectReason === r && "border-primary"
                                  )}>
                                  {r}
                                </button>
                              ))}
                            </div>
                            <textarea placeholder="Nhập lý do từ chối..."
                              value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                              className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs resize-none transition-all border-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest font-inter"
                              rows={2} />
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => { setIsRejectingId(null); setRejectReason(""); }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-all duration-150 font-inter">
                                Hủy
                              </button>
                              <button onClick={() => handleSingleRejectSubmit(item.id)} disabled={isActionLoading}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all duration-150 bg-[#ba1a1a] hover:opacity-90 font-inter">
                                Xác nhận
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={cn("grid gap-2 pt-1", (!scanResult && item.task_type !== "PC_BUILD") ? "grid-cols-3" : "grid-cols-2")}>
                            {/* Reject */}
                            <button onClick={() => { setIsRejectingId(item.id); setRejectReason(""); }}
                              disabled={isActionLoading || scanningId === item.id}
                              className="px-3 py-1.5 rounded-[8px] bg-error-container text-on-error-container text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer border-none flex items-center justify-center gap-1 font-inter">
                              <X className="w-3.5 h-3.5" />
                              Từ chối
                            </button>
                            {/* AI Scan */}
                            {!scanResult && item.task_type !== "PC_BUILD" && (
                              <button onClick={() => handleAIScan(item.id)} disabled={isActionLoading}
                                className="px-3 py-1.5 rounded-[8px] bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer border-none flex items-center justify-center gap-1 font-inter">
                                <Sparkles className="w-3.5 h-3.5 text-primary" />
                                AI Scan
                              </button>
                            )}
                            {/* Approve */}
                            <button onClick={() => handleSingleApprove(item.id)} disabled={isActionLoading || scanningId === item.id}
                              className="px-3 py-1.5 rounded-[8px] gradient-primary text-white text-xs font-semibold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer border-none flex items-center justify-center gap-1 font-inter">
                              <Check className="w-3.5 h-3.5" />
                              Duyệt
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Revoke action — for AUTO_APPROVED items */}
                    {item.status === "AUTO_APPROVED" && (
                      <>
                        {isRevokingId === item.id ? (
                          <div className="space-y-2 pt-1 animate-in slide-in-from-bottom-2 duration-200">
                            <p className="text-[10px] text-on-surface-variant font-inter">
                              Lý do thu hồi (user sẽ thấy và được nộp lại nếu còn trong hạn):
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {["Chia sẻ sai bài viết", "Ảnh sai nội dung", "Tài khoản sai"].map((r) => (
                                <button key={r} onClick={() => setRevokeReason(r)}
                                  className={cn(
                                    "px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all duration-150 bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-rose-400 font-inter",
                                    revokeReason === r && "border-rose-500 bg-rose-50 text-rose-700"
                                  )}>
                                  {r}
                                </button>
                              ))}
                            </div>
                            <textarea
                              placeholder="Mô tả thêm lý do..."
                              value={revokeReason}
                              onChange={e => setRevokeReason(e.target.value)}
                              className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs resize-none border-none focus:outline-none focus:ring-2 focus:ring-rose-400/30 font-inter"
                              rows={2}
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => { setIsRevokingId(null); setRevokeReason(""); }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-all duration-150 font-inter"
                              >
                                Hủy
                              </button>
                              <button
                                onClick={() => handleRevokeSubmit(item.id)}
                                disabled={isActionLoading || !revokeReason.trim()}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all bg-rose-600 hover:bg-rose-700 disabled:opacity-50 font-inter"
                              >
                                {isActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                Thu hồi duyệt
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 pt-1">
                            <div className="flex-1 flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold font-inter bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              Đã tự động duyệt
                            </div>
                            <button
                              onClick={() => { setIsRevokingId(item.id); setRevokeReason(""); }}
                              disabled={isActionLoading}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 transition-all active:scale-[0.98] font-inter"
                              title="Thu hồi và cho phép nộp lại"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Thu hồi
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

      {/* Floating Bulk Action Bar - Glass style */}
      {activeTab === "PENDING" && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xl animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex items-center justify-between gap-4 px-5 py-3 rounded-[16px] shadow-[0_20px_40px_rgba(19,27,46,0.12)] border-none"
            style={{ background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
            <div className="flex items-center gap-2 text-sm font-semibold text-on-surface font-inter">
              <span>Đã chọn</span>
              <span className="text-primary font-bold text-base">{selectedIds.size}</span>
              <span>mục</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-all duration-150 font-inter">
                Hủy
              </button>
              <button onClick={() => { setIsBatchRejecting(true); setBatchRejectReason(""); }} disabled={isActionLoading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-error-container text-on-error-container hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer border-none font-inter">
                <X className="w-3.5 h-3.5 inline-block mr-1" />
                Từ chối tất cả
              </button>
              <button onClick={handleBatchApprove} disabled={isActionLoading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white gradient-primary hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer border-none font-inter">
                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline-block mr-1" /> : <Check className="w-3.5 h-3.5 inline-block mr-1" />}
                Duyệt tất cả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomImageUrl && (
        <div onClick={() => setZoomImageUrl(null)}
          className="fixed inset-0 z-[100] bg-slate-950/70 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300">
          <div className="relative max-w-3xl max-h-[85vh] w-[90vw] h-[85vh] overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200"
            style={{ boxShadow: "0 20px 40px rgba(19, 27, 46, 0.06)" }}>
            <Image src={zoomImageUrl} alt="Zoomed preview" fill referrerPolicy="no-referrer" className="object-contain" sizes="90vw" />
            <button onClick={() => setZoomImageUrl(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-950/70 text-white flex items-center justify-center hover:bg-black/60 transition-all duration-150">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Build Details Modal */}
      {viewingBuildItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div onClick={() => setViewingBuildItem(null)} className="absolute inset-0 bg-slate-950/70" />
          <div className="relative w-full max-w-2xl rounded-[16px] overflow-hidden animate-in zoom-in-95 duration-200 border-none max-h-[90vh] flex flex-col"
            style={{ background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 40px 80px rgba(19, 27, 46, 0.12)" }}>
            
            {/* Modal Header */}
            <div className="p-6 border-b border-outline/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-on-surface font-manrope">
                  Chi tiết bài nộp Build PC
                </h3>
                <p className="text-xs text-on-surface-variant font-inter mt-0.5">
                  Nhân viên: <strong>{viewingBuildItem.user.name}</strong> ({viewingBuildItem.user.department || "N/A"})
                </p>
              </div>
              <button onClick={() => setViewingBuildItem(null)} className="w-8 h-8 rounded-[8px] bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 no-scrollbar text-on-surface">
              {/* Nửa trên: Đề bài gốc */}
              <div className="space-y-3 p-4 rounded-xl bg-indigo-50/40 border border-indigo-100/30">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 font-inter flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Yêu cầu bài tập (Đề bài)
                </h4>
                {viewingBuildItem.pc_task ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-inter leading-relaxed">
                    <div className="space-y-1 md:col-span-2">
                      <span className="text-on-surface-variant/80 font-semibold">Nhu cầu khách hàng:</span>
                      <p className="text-on-surface font-medium text-sm">{viewingBuildItem.pc_task.customer_need}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-on-surface-variant/80 font-semibold">Ngân sách tối đa:</span>
                      <p className="text-emerald-600 font-bold text-sm">
                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(viewingBuildItem.pc_task.max_budget)}
                      </p>
                    </div>
                    <div className="space-y-1 md:col-span-2 text-on-surface/90">
                      <span className="text-on-surface-variant/80 font-semibold">Yêu cầu chi tiết khác:</span>
                      <p className="text-on-surface font-medium whitespace-pre-line">{viewingBuildItem.pc_task.requirements}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant font-inter italic">Không tìm thấy thông tin đề bài gốc.</p>
                )}
              </div>

              {/* Nửa dưới: Cục build_data */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-inter flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-primary" />
                  Cấu hình linh kiện nhân viên đề xuất
                </h4>
                
                <div className="overflow-hidden rounded-xl border border-outline/10 bg-surface-container-lowest">
                  <table className="w-full text-left border-collapse text-xs font-inter">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline/10 text-on-surface-variant font-bold">
                        <th className="p-3 w-1/3">Loại linh kiện</th>
                        <th className="p-3 w-1/2">Tên sản phẩm</th>
                        <th className="p-3 text-right">Đơn giá</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline/5">
                      {Object.entries(viewingBuildItem.build_data || {})
                        .filter(([key]) => key !== "total_price")
                        .map(([key, value]: [string, any]) => {
                          const categoryLabels: Record<string, string> = {
                            cpu: "Bộ vi xử lý (CPU)",
                            mainboard: "Bo mạch chủ (Mainboard)",
                            ram: "Bộ nhớ trong (RAM)",
                            vga: "Card màn hình (VGA)",
                            ssd: "Ổ cứng (SSD)",
                            psu: "Nguồn máy tính (PSU)",
                            cooler: "Tản nhiệt (Cooler)",
                            case: "Vỏ máy tính (Case)"
                          };
                          return (
                            <tr key={key} className="hover:bg-surface-container-low/20">
                              <td className="p-3 font-semibold text-on-surface-variant">
                                {categoryLabels[key] || key}
                              </td>
                              <td className="p-3 text-on-surface font-medium">
                                {value?.name || "Chưa chọn"}
                              </td>
                              <td className="p-3 text-right font-medium">
                                {value?.price ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value.price) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      
                      {/* Dòng cuối cùng in đậm: TỔNG TIỀN */}
                      <tr className="bg-surface-container-low/30 border-t border-outline/10 font-bold text-sm">
                        <td colSpan={2} className="p-3 text-right font-bold text-on-surface">
                          TỔNG TIỀN CẤU HÌNH:
                        </td>
                        <td className="p-3 text-right font-black text-indigo-600 dark:text-indigo-400">
                          {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(viewingBuildItem.build_data?.total_price || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* So sánh Budget */}
                {viewingBuildItem.pc_task && (
                  <div className="flex justify-end pt-1">
                    {(viewingBuildItem.build_data?.total_price || 0) <= viewingBuildItem.pc_task.max_budget ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        ✓ Trong ngân sách (Hợp lệ)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
                        ⚠ Vượt quá ngân sách cho phép!
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-outline/10 bg-surface-container-low/40 flex justify-between items-center gap-3">
              <button onClick={() => setViewingBuildItem(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-all duration-150 font-inter border-none cursor-pointer">
                Đóng
              </button>

              {viewingBuildItem.status === "PENDING" && (
                <div className="flex gap-2">
                  <button onClick={() => { setIsRejectingId(viewingBuildItem.id); setRejectReason(""); setViewingBuildItem(null); }}
                    disabled={isActionLoading}
                    className="px-4 py-2 rounded-lg bg-error-container text-on-error-container text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer border-none flex items-center gap-1 font-inter">
                    <X className="w-3.5 h-3.5" />
                    Từ chối
                  </button>
                  <button onClick={() => { handleSingleApprove(viewingBuildItem.id); setViewingBuildItem(null); }}
                    disabled={isActionLoading}
                    className="px-4 py-2 rounded-lg gradient-primary text-white text-xs font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer border-none flex items-center gap-1 font-inter">
                    <Check className="w-3.5 h-3.5" />
                    Duyệt cấu hình
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Batch Rejection Modal - Glass modal shell */}
      {isBatchRejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div onClick={() => setIsBatchRejecting(false)} className="absolute inset-0 bg-slate-950/70" />
          <div className="relative w-full max-w-md rounded-[16px] overflow-hidden animate-in zoom-in-95 duration-200 border-none"
            style={{ background: "rgba(255, 255, 255, 0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 40px 80px rgba(19, 27, 46, 0.12)" }}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-on-surface font-manrope">
                  Từ chối hàng loạt
                </h3>
                <button onClick={() => setIsBatchRejecting(false)} className="w-8 h-8 rounded-[8px] bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-on-surface-variant font-inter">
                Áp dụng lý do từ chối cho <strong>{selectedIds.size}</strong> lượt check-in đã chọn:
              </p>

              <div className="flex flex-wrap gap-1">
                {presetReasons.map((r) => (
                  <button key={r} onClick={() => setBatchRejectReason(r)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold border-none transition-all duration-150 font-inter",
                      batchRejectReason === r ? "bg-primary-container text-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    )}>
                    {r}
                  </button>
                ))}
              </div>

              <textarea placeholder="Nhập lý do cụ thể..."
                value={batchRejectReason} onChange={e => setBatchRejectReason(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-xs resize-none transition-all border-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest font-inter"
                rows={3} />

              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => { setIsBatchRejecting(false); setBatchRejectReason(""); }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-all duration-150 font-inter">
                  Hủy
                </button>
                <button onClick={handleBatchRejectSubmit} disabled={isActionLoading || !batchRejectReason.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all bg-[#ba1a1a] hover:opacity-90 active:scale-[0.98] font-inter border-none">
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
