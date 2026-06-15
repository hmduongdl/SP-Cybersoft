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
  User, 
  Clock, 
  AlertTriangle, 
  Loader2, 
  Eye, 
  CheckSquare, 
  Square,
  Sparkles,
  Inbox,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Checkin {
  id: string;
  userId: string;
  postId: string;
  image_url: string;
  exif_time: string | null;
  status: string;
  reject_reason: string | null;
  is_ai_flagged: boolean;
  ai_confidence: number | null;
  submittedAt: string;
  note: string | null;
  user: {
    name: string | null;
    email: string;
    image: string | null;
    avatar: string | null;
    department: string | null;
  };
  post: {
    title: string;
    thumbnailUrl: string | null;
    scheduledAt: string;
    start_at: string;
  };
}

interface QueueClientProps {
  initialCheckins: any[];
}

export default function QueueClient({ initialCheckins }: QueueClientProps) {
  const [checkins, setCheckins] = useState<Checkin[]>(initialCheckins);
  const [activeTab, setActiveTab] = useState<"PENDING" | "AUTO_APPROVED" | "REJECTED">("PENDING");
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

  // AI Scan States & Handler
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [aiScanResults, setAiScanResults] = useState<Record<string, { isValid: boolean, confidence: number, analysisReason: string }>>({});

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
    if (activeTab === "AUTO_APPROVED" && item.status !== "AUTO_APPROVED" && item.status !== "APPROVED") return false;
    if (activeTab === "REJECTED" && item.status !== "REJECTED") return false;

    // 2. Search filter
    const userName = item.user.name?.toLowerCase() || "";
    const postTitle = item.post.title?.toLowerCase() || "";
    const query = searchTerm.toLowerCase();
    const matchesSearch = userName.includes(query) || postTitle.includes(query);

    // 3. Department filter
    const matchesDept = deptFilter === "ALL" || item.user.department === deptFilter;

    return matchesSearch && matchesDept;
  });

  // KPI Counts
  const pendingCount = checkins.filter(c => c.status === "PENDING").length;
  const approvedCount = checkins.filter(c => c.status === "AUTO_APPROVED" || c.status === "APPROVED").length;
  const rejectedCount = checkins.filter(c => c.status === "REJECTED").length;

  const handleSelectAll = () => {
    if (selectedIds.size === filteredCheckins.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCheckins.map(c => c.id)));
    }
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

  const handleSingleRejectSubmit = () => {
    if (!isRejectingId || !rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối.");
      return;
    }
    executeAction([isRejectingId], "REJECT", rejectReason.trim());
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
      return { label: "Không tìm thấy EXIF", type: "warning" };
    }
    const postStart = new Date(item.post.start_at).getTime();
    const exifTimeMs = new Date(item.exif_time).getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    const postEnd = postStart + twentyFourHoursMs;

    if (exifTimeMs > postEnd) {
      return { label: "Quá giới hạn 24 giờ", type: "error" };
    }
    if (exifTimeMs < postStart) {
      return { label: "Chụp trước khi post bắt đầu", type: "warning" };
    }
    return { label: "EXIF hợp lệ", type: "success" };
  };

  // Predefined rejection reasons
  const presetReasons = ["Ảnh mờ", "Ảnh sai nội dung share", "Ảnh trùng lặp", "Bài đăng không ở chế độ công khai"];

  return (
    <div className="space-y-6">
      
      {/* Header & KPI Summary cards */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 mb-2">
            Hàng đợi kiểm duyệt
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Duyệt Bằng Chứng Share</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Quản trị viên duyệt thủ công các check-in không có EXIF hoặc có nghi vấn.</p>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chờ Duyệt</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-xl">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã Duyệt / Tự Động Duyệt</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{approvedCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 rounded-xl">
            <X className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã Từ Chối</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{rejectedCount}</p>
          </div>
        </div>
      </div>

      {/* Control panel: tabs, search, filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Tabs */}
        <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => { setActiveTab("PENDING"); setSelectedIds(new Set()); }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === "PENDING"
                ? "bg-white text-indigo-600 shadow dark:bg-slate-700 dark:text-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            Chờ Duyệt ({pendingCount})
          </button>
          <button
            onClick={() => { setActiveTab("AUTO_APPROVED"); setSelectedIds(new Set()); }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === "AUTO_APPROVED"
                ? "bg-white text-indigo-600 shadow dark:bg-slate-700 dark:text-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            Đã Duyệt ({approvedCount})
          </button>
          <button
            onClick={() => { setActiveTab("REJECTED"); setSelectedIds(new Set()); }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === "REJECTED"
                ? "bg-white text-indigo-600 shadow dark:bg-slate-700 dark:text-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            Đã Từ Chối ({rejectedCount})
          </button>
        </div>

        {/* Search & Department Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Tìm nhân viên, bài viết..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-60 pl-9 pr-4 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Department Filter */}
          <div className="relative">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="appearance-none w-full pr-8 pl-4 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">Tất cả Phòng Ban</option>
              <option value="Marketing">Marketing</option>
              <option value="Tech">Tech</option>
              <option value="HR">HR</option>
              <option value="Sales">Sales</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Filter className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

      </div>

      {/* Batch Operations Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Đang chọn <strong className="text-indigo-600 dark:text-indigo-400">{selectedIds.size}</strong> lượt check-in
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            >
              Bỏ Chọn
            </button>
            <button
              onClick={handleBatchApprove}
              disabled={isActionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Duyệt Hàng Loạt
            </button>
            <button
              onClick={() => setIsBatchRejecting(true)}
              disabled={isActionLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Từ Chối Hàng Loạt
            </button>
          </div>
        </div>
      )}

      {/* Grid List */}
      {filteredCheckins.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-full inline-block text-slate-400 dark:text-slate-500 mb-4">
            <Inbox className="w-10 h-10 mx-auto" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Hàng đợi trống
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Không có lượt check-in nào trong hàng đợi phù hợp với bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCheckins.map((item) => {
            const exifInfo = getExifSublabel(item);
            const isSelected = selectedIds.has(item.id);
            const isProcessed = processedIds.has(item.id);

            return (
              <div
                key={item.id}
                className={cn(
                  "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between overflow-hidden shadow-sm group",
                  isSelected && "border-indigo-300 dark:border-indigo-800 ring-2 ring-indigo-500/10 bg-indigo-50/10",
                  isProcessed && "opacity-0 scale-90 translate-x-10 max-h-0 pointer-events-none duration-500" // Processed animation transition
                )}
              >
                
                {/* Batch selection Checkbox overlay */}
                <div 
                  onClick={() => handleSelectOne(item.id)}
                  className="absolute top-4 left-4 z-10 p-1.5 rounded-lg bg-white/95 dark:bg-slate-800/95 shadow-md border border-slate-100 dark:border-slate-700 cursor-pointer hover:scale-105 active:scale-95 transition-all text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400 stroke-[2.5]" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </div>

                {/* Exif Tag Overlay on top right */}
                <div className="absolute top-4 right-4 z-10">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide backdrop-blur-md shadow-sm border",
                    exifInfo.type === "success" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                    exifInfo.type === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                    exifInfo.type === "error" && "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                  )}>
                    {exifInfo.type === "error" && <AlertCircle className="w-3 h-3" />}
                    {exifInfo.type === "warning" && <AlertTriangle className="w-3 h-3" />}
                    {exifInfo.label}
                  </span>
                </div>

                <div className="space-y-4">
                  
                  {/* Image Thumbnail with zoom hover */}
                  <div 
                    onClick={() => setZoomImageUrl(item.image_url)}
                    className="relative h-44 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 group/img cursor-pointer"
                  >
                    <img 
                      src={item.image_url} 
                      alt="Checkin proof" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                    />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="p-3 bg-white/20 backdrop-blur-md text-white rounded-full scale-90 group-hover/img:scale-100 transition-all duration-300">
                        <Eye className="w-5 h-5" />
                      </span>
                    </div>
                  </div>

                  {/* Employee Info Header */}
                  <div className="flex items-center gap-3">
                    {item.user.avatar || item.user.image ? (
                      <img 
                        src={item.user.avatar || item.user.image || ""} 
                        alt={item.user.name || "User"} 
                        className="w-10 h-10 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800 shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">
                        {item.user.name ? item.user.name.charAt(0) : "U"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {item.user.name || "Thành viên"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-500 font-medium">
                          {item.user.email}
                        </span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                          item.user.department === "Tech" && "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                          item.user.department === "Marketing" && "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
                          item.user.department === "Sales" && "bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
                          item.user.department === "HR" && "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
                          !item.user.department && "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        )}>
                          {item.user.department || "No Dept"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Task Info & Time details */}
                  <div className="space-y-2 pt-1">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Yêu cầu chia sẻ</span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-2 mt-0.5">
                        {item.post.title}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-50 dark:border-slate-800/40">
                      <div>
                        <span className="font-semibold block text-slate-400">Thời gian nộp</span>
                        <span className="font-bold text-slate-600 dark:text-slate-400 inline-flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(item.submittedAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })} - {new Date(item.submittedAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold block text-slate-400">Thời gian EXIF</span>
                        <span className="font-bold text-slate-600 dark:text-slate-400 inline-flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {item.exif_time 
                            ? `${new Date(item.exif_time).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })} - ${new Date(item.exif_time).toLocaleDateString("vi-VN")}`
                            : "Không có EXIF"
                          }
                        </span>
                      </div>
                    </div>

                    {/* Show Rejection Reason if tab is Rejected */}
                    {activeTab === "REJECTED" && item.reject_reason && (
                      <div className="p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-950/20 rounded-xl mt-2 text-[11px] text-red-600 dark:text-red-400 font-semibold">
                        Lý do từ chối: {item.reject_reason}
                      </div>
                    )}

                    {/* AI Flag warning alert if PENDING and flagged */}
                    {item.is_ai_flagged && item.status === "PENDING" && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl mt-2 flex items-start gap-2 text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-600 animate-pulse" />
                        <div>
                          <span>AI Cảnh báo: Trùng khớp thấp ({item.ai_confidence ? Math.round(item.ai_confidence * 100) : 0}%)</span>
                        </div>
                      </div>
                    )}

                    {/* AI Scan Action & Results */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/40">
                      {(() => {
                        const scanResult = aiScanResults[item.id] || (item.ai_confidence !== null ? {
                          isValid: !item.is_ai_flagged,
                          confidence: item.ai_confidence,
                          analysisReason: item.note?.startsWith("[AI Scan] ") 
                            ? item.note.replace("[AI Scan] ", "") 
                            : (item.note || "Đã quét AI trước đó")
                        } : null);

                        if (scanResult) {
                          return (
                            <div className={cn(
                              "p-3 rounded-xl border text-[11px] space-y-1.5",
                              scanResult.isValid
                                ? "bg-emerald-50/50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/10 dark:border-emerald-950/20 dark:text-emerald-300"
                                : "bg-red-50/50 border-red-100 text-red-800 dark:bg-red-950/10 dark:border-red-950/20 dark:text-red-300"
                            )}>
                              <div className="flex items-center justify-between font-bold">
                                <span className="flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                  AI Phân Tích
                                </span>
                                <span>Độ tin cậy: {Math.round(scanResult.confidence * 100)}%</span>
                              </div>
                              <p className="font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                                {scanResult.analysisReason}
                              </p>
                            </div>
                          );
                        }

                        if (item.status === "PENDING") {
                          return (
                            <button
                              type="button"
                              disabled={scanningId !== null || isActionLoading}
                              onClick={() => handleAIScan(item.id)}
                              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/20 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              {scanningId === item.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Đang phân tích ảnh...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  AI Kiểm Tra Bằng Chứng
                                </>
                              )}
                            </button>
                          );
                        }

                        return null;
                      })()}
                    </div>

                  </div>


                </div>

                {/* Inline Popover Rejection / Action Footer */}
                {isRejectingId === item.id ? (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-2xl space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Lý do từ chối check-in:</p>
                    
                    {/* Preset reason tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {presetReasons.map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setRejectReason(reason)}
                          className="px-2.5 py-1 text-[10px] rounded-full border border-slate-200 dark:border-slate-600 hover:border-indigo-400 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors font-semibold"
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
                      className="w-full px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => { setIsRejectingId(null); setRejectReason(""); }}
                        className="px-3 py-1.5 rounded-lg text-xs bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-300/50 transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleSingleRejectSubmit}
                        disabled={isActionLoading}
                        className="px-3.5 py-1.5 rounded-lg text-xs bg-red-600 hover:bg-red-500 text-white font-semibold shadow-sm transition-colors"
                      >
                        Xác Nhận
                      </button>
                    </div>
                  </div>
                ) : (
                  activeTab === "PENDING" && (
                    <div className="flex gap-3 mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/40">
                      <button
                        onClick={() => setIsRejectingId(item.id)}
                        disabled={isActionLoading}
                        className="flex-1 py-2 rounded-xl text-xs font-bold border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-950/20 dark:text-red-400 dark:hover:bg-red-950/10 transition-colors inline-flex items-center justify-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        Từ Chối
                      </button>
                      <button
                        onClick={() => handleSingleApprove(item.id)}
                        disabled={isActionLoading}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Phê Duyệt
                      </button>
                    </div>
                  )
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Zoom Preview Modal */}
      {zoomImageUrl && (
        <div 
          onClick={() => setZoomImageUrl(null)}
          className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300"
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200">
            <img 
              src={zoomImageUrl} 
              alt="Zoomed preview" 
              className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-2xl"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200 p-6 space-y-4">
            
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">Từ chối hàng loạt ({selectedIds.size} mục)</h3>
              <button 
                onClick={() => setIsBatchRejecting(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-500">Áp dụng lý do từ chối cho toàn bộ {selectedIds.size} lượt check-in đã chọn:</p>
              
              <div className="flex flex-wrap gap-1.5">
                {presetReasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setBatchRejectReason(reason)}
                    className="px-2.5 py-1 text-[10px] rounded-full border border-slate-200 dark:border-slate-600 hover:border-indigo-400 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors font-semibold"
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
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => { setIsBatchRejecting(false); setBatchRejectReason(""); }}
                className="px-4 py-2 rounded-xl text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleBatchRejectSubmit}
                disabled={isActionLoading || !batchRejectReason.trim()}
                className="px-4 py-2 rounded-xl text-xs bg-red-600 hover:bg-red-500 text-white font-bold shadow-sm transition-colors"
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
