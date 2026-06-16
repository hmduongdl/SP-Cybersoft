"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { 
  Check, 
  X, 
  Search, 
  Image as ImageIcon, 
  Filter, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Loader2, 
  Eye, 
  CheckSquare, 
  Square,
  Inbox,
  AlertCircle,
  Sparkles,
  ExternalLink,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

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
}

export default function QueueClient({ initialCheckins }: QueueClientProps) {
  const [checkins, setCheckins] = useState<Checkin[]>(initialCheckins);
  const [activeTab, setActiveTab] = useState<"PENDING" | "AUTO_APPROVED" | "REVIEWED">("PENDING");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  
  // Single Rejection States
  const [isRejectingId, setIsRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Batch Rejection States
  const [isBatchRejecting, setIsBatchRejecting] = useState(false);
  const [batchRejectReason, setBatchRejectReason] = useState("");

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  // AI Scan state
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [aiScanResults, setAiScanResults] = useState<Record<string, { isValid: boolean; confidence: number; analysisReason: string }>>({});

  const handleAIScan = async (id: string) => {
    try {
      setScanningId(id);
      const res = await fetch("/api/admin/ai-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId: id })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Quét AI thất bại.");
      }
      
      setAiScanResults(prev => ({
        ...prev,
        [id]: {
          isValid: data.isValid,
          confidence: data.confidence,
          analysisReason: data.analysisReason
        }
      }));

      // Update local checkins state
      setCheckins(prev => 
        prev.map(c => {
          if (c.id === id) {
            return {
              ...c,
              is_ai_flagged: !data.isValid,
              ai_confidence: data.confidence,
              note: `[AI Scan] ${data.analysisReason}`
            };
          }
          return c;
        })
      );

      toast.success(data.isValid 
        ? "AI đánh giá: Bài nộp HỢP LỆ!" 
        : "AI đánh giá: Phát hiện NGHI VẤN!"
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Lỗi quét AI.");
    } finally {
      setScanningId(null);
    }
  };

  // Filter lists based on tab and Search
  const filteredCheckins = checkins.filter((item) => {
    // 1. Tab filter
    if (activeTab === "PENDING" && item.status !== "PENDING") return false;
    if (activeTab === "AUTO_APPROVED" && item.status !== "AUTO_APPROVED") return false;
    if (activeTab === "REVIEWED" && item.status !== "APPROVED" && item.status !== "REJECTED") return false;

    // 2. Search filter
    const userName = item.user.name?.toLowerCase() || "";
    const postTitle = item.post.title?.toLowerCase() || "";
    const query = searchTerm.toLowerCase();
    const matchesSearch = userName.includes(query) || postTitle.includes(query);

    // 3. Department filter
    const matchesDept = deptFilter === "ALL" || item.user.department === deptFilter;

    return matchesSearch && matchesDept;
  });

  // Counts based on actual statuses
  const pendingCount = checkins.filter(c => c.status === "PENDING").length;
  const autoApprovedCount = checkins.filter(c => c.status === "AUTO_APPROVED").length;
  const reviewedCount = checkins.filter(c => c.status === "APPROVED" || c.status === "REJECTED").length;

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
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // call API action
  const executeAction = async (ids: string[], action: "APPROVE" | "REJECT", reason?: string) => {
    try {
      setIsActionLoading(true);
      
      // Add to processed animation state
      const nextProcessed = new Set(processedIds);
      ids.forEach(id => nextProcessed.add(id));
      setProcessedIds(nextProcessed);

      const res = await fetch("/api/admin/checkin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkinIds: ids,
          action,
          rejectReason: reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể thực hiện hành động.");
      }

      toast.success(data.message || "Thao tác thành công.");

      // Delay actual state change slightly for transition animation
      setTimeout(() => {
        setCheckins(prev => 
          prev.map(c => {
            if (ids.includes(c.id)) {
              return { 
                ...c, 
                status: action === "APPROVE" ? "APPROVED" : "REJECTED",
                reject_reason: action === "REJECT" ? (reason || null) : null
              };
            }
            return c;
          })
        );
        // Clean up selections
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
      // Rollback animation state
      const nextProcessed = new Set(processedIds);
      ids.forEach(id => nextProcessed.delete(id));
      setProcessedIds(nextProcessed);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSingleApprove = (id: string) => {
    executeAction([id], "APPROVE");
  };

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

  // Helper: Exif sublabel analyzer
  const getExifSublabel = (item: Checkin) => {
    if (!item.exif_time) {
      return { label: "Lỗi: Không tìm thấy Metadata EXIF", type: "error" };
    }
    const postStart = new Date(item.post.start_at).getTime();
    const exifTimeMs = new Date(item.exif_time).getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    const postEnd = postStart + twentyFourHoursMs;

    if (exifTimeMs > postEnd) {
      const exifFormatted = new Date(item.exif_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const postStartFormatted = new Date(item.post.start_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      return { 
        label: `Lỗi: Ảnh chụp lúc ${exifFormatted} nhưng bài viết bắt đầu lúc ${postStartFormatted} ngày hôm trước - Quá 24 giờ`, 
        type: "error" 
      };
    }
    return { label: "EXIF hợp lệ", type: "success" };
  };

  const presetReasons = ["Ảnh sai nội dung", "Ảnh bị mờ", "Ảnh nộp trùng"];

  // Excel Export state
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
      if (!res.ok) {
        throw new Error("Lỗi khi tải file từ server");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const yyyy = today.getFullYear();
      a.download = `${mm}.${dd}.${yyyy} - Bao Cao Cong Viec Like Share.xlsx`;
      
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

  return (
    <div className="space-y-6 text-slate-900 animate-in fade-in duration-300">
      
      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-2">
            Hàng đợi kiểm duyệt
          </span>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Kiểm duyệt Hàng đợi</h1>
          <p className="text-slate-500 text-sm mt-1">Duyệt hoặc từ chối các bài nộp check-in của nhân viên.</p>
        </div>

        {/* Date Range & Export Excel */}
        <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-soft">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Từ:</span>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Đến:</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
            Xuất Báo Cáo
          </button>
        </div>
      </header>

      {/* Thống kê nhanh số lượng (Shadcn Cards style) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1: Chờ duyệt */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-soft hover:shadow-md transition-shadow duration-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chờ Duyệt (Pending)</p>
            <p className="text-3xl font-extrabold text-slate-950 mt-1">{pendingCount}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-500 border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Đã tự động duyệt */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-soft hover:shadow-md transition-shadow duration-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tự Động Duyệt (Auto Approved)</p>
            <p className="text-3xl font-extrabold text-slate-950 mt-1">{autoApprovedCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500 border border-emerald-100">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Đã duyệt / Từ chối thủ công */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-soft hover:shadow-md transition-shadow duration-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đã Kiểm Duyệt (Reviewed)</p>
            <p className="text-3xl font-extrabold text-slate-950 mt-1">{reviewedCount}</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-500 border border-indigo-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control panel: tabs, search, filter */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Status Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50">
          <button
            onClick={() => { setActiveTab("PENDING"); setSelectedIds(new Set()); }}
            className={cn(
              "px-4 py-2 rounded-md text-xs font-bold transition-all",
              activeTab === "PENDING"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            Chờ Duyệt ({pendingCount})
          </button>
          <button
            onClick={() => { setActiveTab("AUTO_APPROVED"); setSelectedIds(new Set()); }}
            className={cn(
              "px-4 py-2 rounded-md text-xs font-bold transition-all",
              activeTab === "AUTO_APPROVED"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            Đã Tự Động Duyệt ({autoApprovedCount})
          </button>
          <button
            onClick={() => { setActiveTab("REVIEWED"); setSelectedIds(new Set()); }}
            className={cn(
              "px-4 py-2 rounded-md text-xs font-bold transition-all",
              activeTab === "REVIEWED"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            Đã Duyệt / Từ Chối ({reviewedCount})
          </button>
        </div>

        {/* Search & Department Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Tìm nhân viên, bài viết..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-56 pl-9 pr-4 py-2 rounded-lg text-sm border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Department Filter */}
          <div className="relative">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="appearance-none w-full pr-8 pl-4 py-2 rounded-lg text-sm border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">Tất cả Phòng Ban</option>
              <option value="Marketing">Marketing</option>
              <option value="Tech">Tech</option>
              <option value="HR">HR</option>
              <option value="Sales">Sales</option>
              <option value="Other">Khác</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Filter className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

      </div>

      {/* Select All Checkbox (when in Pending) */}
      {activeTab === "PENDING" && filteredCheckins.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            {filteredCheckins.every(c => selectedIds.has(c.id)) ? (
              <CheckSquare className="w-4 h-4 text-indigo-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            Chọn tất cả trên trang này
          </button>
        </div>
      )}

      {/* Grid List */}
      {filteredCheckins.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-soft">
          <div className="p-4 bg-slate-50 rounded-full inline-block text-slate-400 mb-4 border border-slate-100">
            <Inbox className="w-10 h-10 mx-auto" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Hàng đợi trống
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Không có lượt check-in nào trong hàng đợi phù hợp với bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCheckins.map((item) => {
            const exifInfo = getExifSublabel(item);
            const isSelected = selectedIds.has(item.id);
            const isProcessed = processedIds.has(item.id);

            // AI Vision scan state resolver
            const scanResult = aiScanResults[item.id] || (item.ai_confidence !== null ? {
              isValid: !item.is_ai_flagged,
              confidence: item.ai_confidence,
              analysisReason: item.note?.startsWith("[AI Scan] ") 
                ? item.note.replace("[AI Scan] ", "") 
                : (item.note || "")
            } : null);

            return (
              <div
                key={item.id}
                className={cn(
                  "bg-white border border-slate-200 rounded-xl p-5 relative transition-all duration-350 hover:shadow-lg flex flex-col justify-between overflow-hidden shadow-soft group",
                  isSelected && "border-indigo-500 ring-2 ring-indigo-500/10 bg-indigo-50/10",
                  isProcessed && "opacity-0 scale-90 translate-x-10 max-h-0 pointer-events-none duration-500 py-0 my-0 border-none"
                )}
              >
                
                {/* Batch selection Checkbox */}
                {activeTab === "PENDING" && (
                  <div 
                    onClick={() => handleSelectOne(item.id)}
                    className="absolute top-4 left-4 z-10 p-1.5 rounded-lg bg-white/90 shadow-sm border border-slate-200 cursor-pointer hover:scale-105 active:scale-95 transition-all text-slate-400 hover:text-indigo-600"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4.5 h-4.5 text-indigo-600 stroke-[2.5]" />
                    ) : (
                      <Square className="w-4.5 h-4.5" />
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  
                  {/* Grid details: left employee, right screenshot */}
                  <div className="grid grid-cols-2 gap-4 pb-1">
                    
                    {/* Personnel Area (Avatar, Name, Dept, Time stacked vertically left) */}
                    <div className="flex flex-col gap-2 justify-between">
                      <div className="flex flex-col gap-1.5">
                        
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden shadow-sm flex-shrink-0 bg-slate-100">
                          {item.user.avatar_url ? (
                            <img src={item.user.avatar_url} alt={item.user.name || "Avatar"} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-sm">
                              {item.user.name ? item.user.name.charAt(0) : "U"}
                            </div>
                          )}
                        </div>

                        {/* Name and email */}
                        <div>
                          <p className="text-xs font-bold text-slate-900 line-clamp-1">{item.user.name || "Thành viên"}</p>
                          <p className="text-[10px] text-slate-400 truncate">{item.user.email}</p>
                        </div>

                        {/* Department badge */}
                        <div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border",
                            item.user.department === "Tech" ? "bg-blue-50 text-blue-700 border-blue-150" :
                            item.user.department === "Marketing" ? "bg-purple-50 text-purple-700 border-purple-150" :
                            item.user.department === "Sales" ? "bg-pink-50 text-pink-700 border-pink-150" :
                            item.user.department === "HR" ? "bg-teal-50 text-teal-700 border-teal-150" :
                            "bg-slate-50 text-slate-500 border-slate-150"
                          )}>
                            {item.user.department || "No Dept"}
                          </span>
                        </div>

                      </div>

                      {/* Submitted time */}
                      <div className="text-[9px] text-slate-400">
                        <span className="font-semibold block text-slate-400">Thời gian nộp:</span>
                        <span className="font-bold text-slate-600 block">
                          {new Date(item.submitted_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} {new Date(item.submitted_at).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>

                    {/* Screenshot Preview Area (aspect ratio 3:4/vertical, compact screenshot right) */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block text-right">Bằng chứng</span>
                      
                      <div 
                        onClick={() => setZoomImageUrl(item.image_url)}
                        className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-slate-900 border border-slate-200 group/img cursor-zoom-in shadow-inner"
                      >
                        <img 
                          src={item.image_url} 
                          alt="Checkin proof" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="p-2 bg-white/20 backdrop-blur-md text-white rounded-full">
                            <Eye className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Task details */}
                  <div className="space-y-2.5">
                    
                    {/* Share Post Title */}
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Yêu cầu chia sẻ</span>
                      <p className="text-xs font-bold text-slate-700 line-clamp-1 mt-0.5">
                        {item.post.title}
                      </p>
                    </div>

                    {/* System error warning (Red badge if metadata/deadline validation fails) */}
                    {exifInfo.type === "error" && (
                      <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-[10px] rounded-lg font-bold flex items-center gap-1.5 leading-snug">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{exifInfo.label}</span>
                      </div>
                    )}

                    {/* May show exif time in normal state */}
                    {exifInfo.type === "success" && (
                      <div className="text-[9px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Chụp lúc: {item.exif_time ? new Date(item.exif_time).toLocaleString("vi-VN") : "EXIF hợp lệ"}</span>
                      </div>
                    )}

                    {/* Show Rejection Reason if status is Rejected */}
                    {item.status === "REJECTED" && item.reject_reason && (
                      <div className="p-2.5 bg-rose-50 border border-rose-150 rounded-lg text-[10px] text-rose-700 font-semibold leading-relaxed">
                        Lý do từ chối: {item.reject_reason}
                      </div>
                    )}

                    {/* isolated Trợ lý Phân Tích Gemini Panel */}
                    <div className="p-3 bg-indigo-50/40 border border-indigo-100/60 rounded-xl flex flex-col gap-2 shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-indigo-700 tracking-wider flex items-center gap-1 uppercase">
                          <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
                          Trợ Lý Phân Tích Gemini
                        </span>
                        {scanResult && (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-extrabold border shadow-sm",
                            scanResult.isValid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            {Math.round(scanResult.confidence * 100)}% Tin cậy
                          </span>
                        )}
                      </div>

                      {scanningId === item.id ? (
                        /* Skeleton loading glow animation */
                        <div className="space-y-1.5 py-1">
                          <div className="h-3 bg-indigo-200/30 rounded-full animate-pulse w-3/4" />
                          <div className="h-3 bg-indigo-100/20 rounded-full animate-pulse w-full" />
                          <div className="h-3 bg-indigo-100/20 rounded-full animate-pulse w-5/6" />
                        </div>
                      ) : scanResult ? (
                        <div className="text-[10px] leading-relaxed text-slate-600 font-medium">
                          <p className="text-slate-700">
                            {scanResult.analysisReason || "Đã quét bằng AI, không phát hiện dấu hiệu vi phạm."}
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={scanningId !== null || isActionLoading}
                          onClick={() => handleAIScan(item.id)}
                          className="w-full py-1.5 bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600 hover:from-indigo-700 hover:to-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 duration-200"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Kích Hoạt AI Quét
                        </button>
                      )}
                    </div>

                  </div>

                </div>

                {/* Inline Rejection Form */}
                {isRejectingId === item.id ? (
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                    <p className="text-xs font-bold text-slate-700">Lý do từ chối check-in:</p>
                    
                    {/* Preset reason tags */}
                    <div className="flex flex-wrap gap-1">
                      {presetReasons.map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setRejectReason(reason)}
                          className={cn(
                            "px-2.5 py-0.5 text-[9px] rounded-full border transition-colors font-bold bg-white text-slate-600 border-slate-200 hover:border-indigo-500",
                            rejectReason === reason && "border-indigo-500 bg-indigo-50 text-indigo-700"
                          )}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="Lý do khác..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => { setIsRejectingId(null); setRejectReason(""); }}
                        className="px-2.5 py-1.5 rounded-md text-xs bg-slate-200 hover:bg-slate-350 text-slate-650 font-bold transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSingleRejectSubmit(item.id)}
                        disabled={isActionLoading}
                        className="px-3.5 py-1.5 rounded-md text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm transition-colors"
                      >
                        Xác Nhận
                      </button>
                    </div>
                  </div>
                ) : (
                  activeTab === "PENDING" && (
                    <div className="flex gap-3 mt-4 pt-3 border-t border-slate-150">
                      <button
                        onClick={() => { setIsRejectingId(item.id); setRejectReason(""); }}
                        disabled={isActionLoading || scanningId === item.id}
                        className="flex-1 py-1.5 rounded-lg text-xs font-bold border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        ✗ Reject
                      </button>
                      <button
                        onClick={() => handleSingleApprove(item.id)}
                        disabled={isActionLoading || scanningId === item.id}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        ✓ Approve
                      </button>
                    </div>
                  )
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Floating Batch Operations Bar at the bottom */}
      {activeTab === "PENDING" && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between gap-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 w-[90%] max-w-xl">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-semibold text-slate-700">
              Đang chọn <strong className="text-indigo-600">{selectedIds.size}</strong> mục
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleBatchApprove}
              disabled={isActionLoading}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
            >
              {isActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Duyệt
            </button>
            <button
              onClick={() => { setIsBatchRejecting(true); setBatchRejectReason(""); }}
              disabled={isActionLoading}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              Từ chối
            </button>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom Dialog Modal */}
      {zoomImageUrl && (
        <div 
          onClick={() => setZoomImageUrl(null)}
          className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300"
        >
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-xl animate-in zoom-in-95 duration-200">
            <img 
              src={zoomImageUrl} 
              alt="Zoomed preview" 
              className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-xl border border-slate-800"
            />
            <button 
              onClick={() => setZoomImageUrl(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Batch Rejection Modal Dialog */}
      {isBatchRejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 p-6 space-y-4">
            
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Từ chối hàng loạt ({selectedIds.size} mục)</h3>
              <button 
                onClick={() => setIsBatchRejecting(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-500">Áp dụng lý do từ chối cho toàn bộ {selectedIds.size} lượt check-in đã chọn:</p>
              
              <div className="flex flex-wrap gap-1">
                {presetReasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setBatchRejectReason(reason)}
                    className={cn(
                      "px-2.5 py-0.5 text-[9px] rounded-full border transition-colors font-bold bg-white text-slate-600 border-slate-200 hover:border-indigo-500",
                      batchRejectReason === reason && "border-indigo-500 bg-indigo-50 text-indigo-700"
                    )}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <textarea
                placeholder="Nhập lý do cụ thể..."
                rows={3}
                value={batchRejectReason}
                onChange={(e) => setBatchRejectReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => { setIsBatchRejecting(false); setBatchRejectReason(""); }}
                className="px-4 py-2 rounded-lg text-xs bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleBatchRejectSubmit}
                disabled={isActionLoading || !batchRejectReason.trim()}
                className="px-4 py-2 rounded-lg text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm transition-colors"
              >
                Từ Chối Tất Cả
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
