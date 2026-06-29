"use client";

import React, { useEffect, useState, useRef } from "react";
import { toast, Toaster } from "sonner";
import {
  Loader2,
  Send,
  Cpu,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatVND } from "@/lib/pc-kho";

interface PcBuildTask {
  id: string;
  customer_need: string;
  max_budget: number;
  requirements: string;
  deadline?: string | null;
}

interface Part {
  name: string;
  price: number;
  partId: string;
}

interface TaskState {
  previewImage: string | null;
  isAnalyzing: boolean;
  analysisStep: "idle" | "kimi" | "deepseek";
  extractedParts: Record<string, Part> | null;
  compatibilityChecks: any;
  isApproved: boolean;
  approvalReason: string;
  explanation: string;
  submitting: boolean;
  checkin_id?: string;
  status?: string;
  isDraft?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  cpu: "Bộ vi xử lý (CPU)",
  mainboard: "Bo mạch chủ (Mainboard)",
  ram: "Bộ nhớ trong (RAM)",
  vga: "Card đồ họa (VGA)",
  ssd: "Ổ cứng (SSD/HDD)",
  psu: "Nguồn máy tính (PSU)",
  case: "Vỏ máy tính (Case)",
  cooler_fan: "Tản nhiệt & Quạt (Cooling)",
  monitor: "Màn hình (Monitor)",
  keyboard_mouse: "Bàn phím & Chuột",
  headphone: "Tai nghe (Headphone)",
  desk_chair: "Bàn ghế (Furniture)",
};

const DEFAULT_TASK_STATE: TaskState = {
  previewImage: null,
  isAnalyzing: false,
  analysisStep: "idle",
  extractedParts: null,
  compatibilityChecks: null,
  isApproved: false,
  approvalReason: "",
  explanation: "",
  submitting: false,
  isDraft: true,
};

export default function PcBuildTrainingClient() {
  const [tasks, setTasks] = useState<PcBuildTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(5);

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [taskStates, setTaskStates] = useState<Record<string, TaskState>>({});

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getTaskState = (taskId: string): TaskState => {
    return taskStates[taskId] || DEFAULT_TASK_STATE;
  };

  const updateTaskState = (taskId: string, updates: Partial<TaskState>) => {
    setTaskStates((prev) => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || DEFAULT_TASK_STATE),
        ...updates,
      },
    }));
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/training/pc-build/tasks");
      const data = await response.json();
      if (response.ok) {
        setTasks(data.tasks || []);
        setRemaining(data.remaining !== undefined ? data.remaining : 5);

        // Restore task states from today's submissions (both drafts and completed)
        const states: Record<string, TaskState> = {};
        if (Array.isArray(data.submissions)) {
          data.submissions.forEach((sub: any) => {
            const buildData = sub.build_data || {};
            const isAnalyzing = buildData.is_analyzing === true;
            const isDraft = buildData.is_draft !== false; // Default to draft unless explicitly false

            states[sub.pc_task_id] = {
              previewImage: sub.image_url || null,
              isAnalyzing,
              analysisStep: isAnalyzing ? "deepseek" : "idle",
              extractedParts: isAnalyzing ? null : (buildData.checks ? buildData : null),
              compatibilityChecks: isAnalyzing ? null : buildData.checks,
              isApproved: sub.status === "AUTO_APPROVED" || buildData.is_approved === true,
              approvalReason: buildData.reason || "",
              explanation: buildData.explanation || "",
              submitting: false,
              checkin_id: sub.id,
              status: sub.status,
              isDraft: isDraft,
            };
          });
          setTaskStates(states);
        }
      }
    } catch {
      toast.error("Không tải được đề bài hôm nay.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Poll for background worker updates dynamically
  useEffect(() => {
    const pollingIntervals: Record<string, NodeJS.Timeout> = {};

    Object.entries(taskStates).forEach(([taskId, state]) => {
      const checkinId = state.checkin_id;
      if (state.isAnalyzing && checkinId && !pollingIntervals[taskId]) {
        pollingIntervals[taskId] = setInterval(async () => {
          try {
            const res = await fetch(`/api/training/pc-build/status?id=${checkinId}&type=checkin`);
            if (res.ok) {
              const result = await res.json();
              if (!result.isAnalyzing) {
                clearInterval(pollingIntervals[taskId]);
                delete pollingIntervals[taskId];

                if (result.hasError) {
                  toast.error(result.errorMsg || "Lỗi xử lý báo giá.");
                  updateTaskState(taskId, {
                    isAnalyzing: false,
                    analysisStep: "idle",
                    previewImage: null,
                  });
                } else {
                  updateTaskState(taskId, {
                    isAnalyzing: false,
                    analysisStep: "idle",
                    extractedParts: result.data,
                    isApproved: result.status === "AUTO_APPROVED" || result.data?.is_approved === true,
                    approvalReason: result.data?.reason || "",
                    compatibilityChecks: result.data?.checks || null,
                    status: result.status,
                    isDraft: result.data?.is_draft !== false,
                  });
                  toast.success("AI đã phân tích xong cấu hình! Hãy viết ghi chú và nộp bài để hoàn thành.");
                  fetchTasks();
                }
              }
            }
          } catch (e) {
            console.error("Lỗi polling checkin:", e);
          }
        }, 4000);
      }
    });

    return () => {
      Object.values(pollingIntervals).forEach(clearInterval);
    };
  }, [taskStates]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageSelect = async (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64Image = await compressImage(file);
      updateTaskState(taskId, { previewImage: base64Image, isAnalyzing: true, analysisStep: "kimi" });

      const res = await fetch("/api/training/pc-build/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pc_task_id: taskId,
          image_url: base64Image,
          explanation: "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      updateTaskState(taskId, {
        checkin_id: data.checkin_id,
        isAnalyzing: true,
        status: "PENDING",
        isDraft: true,
      });

      toast.success("Đang tải báo giá lên & phân tích chạy ngầm...");
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message || "Tải ảnh thất bại.");
      updateTaskState(taskId, { previewImage: null, isAnalyzing: false });
    }
  };

  const clearTask = (taskId: string) => {
    setTaskStates((prev) => {
      const copy = { ...prev };
      delete copy[taskId];
      return copy;
    });
  };

  const handleCancelTask = async (taskId: string) => {
    const state = getTaskState(taskId);
    if (state.checkin_id && state.isDraft) {
      try {
        await fetch("/api/training/pc-build/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: state.checkin_id, type: "checkin" }),
        });
      } catch (e) {
        console.error(e);
      }
    }
    clearTask(taskId);
    fetchTasks();
  };

  const handleSubmit = async (taskId: string) => {
    const state = getTaskState(taskId);
    if (!state.checkin_id) return;

    updateTaskState(taskId, { submitting: true });
    const loadingToastId = toast.loading("Đang nộp bài...");

    try {
      const res = await fetch("/api/training/pc-build/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: state.checkin_id,
          type: "checkin",
          explanation: state.explanation.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Đã nộp bài thành công! 🎉", { id: loadingToastId });
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message || "Nộp bài thất bại.", { id: loadingToastId });
      updateTaskState(taskId, { submitting: false });
    }
  };

  const renderCheckIcon = (status: string) => {
    if (status === "PASS") return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
    if (status === "FAIL") return <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />;
    return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm">
            <Cpu className="h-5 w-5 text-on-primary" />
          </div>
          <div>
            <h1 className="font-manrope text-xl font-bold text-on-surface">Đào tạo Build PC</h1>
            <p className="font-inter text-xs text-on-muted">
              Chọn đề bài → Upload ảnh báo giá (AI phân tích chạy ngầm, lưu lịch sử nháp chưa nộp)
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-surface-container-high bg-surface-mid px-4 py-2 text-center shadow-sm">
          <span className="font-manrope text-xs font-bold text-on-surface">Còn </span>
          <span className="font-manrope text-sm font-extrabold text-primary">{remaining}</span>
          <span className="font-manrope text-xs font-bold text-on-surface"> / 5 lượt hôm nay</span>
        </div>
      </div>

      {/* Tasks List */}
      <section className="space-y-4">
        <h2 className="font-manrope text-sm font-bold text-on-surface">Danh sách đề bài hôm nay</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-on-muted">
              Chưa có đề bài của hôm nay. Vui lòng tải lại trang.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tasks.map((task, idx) => {
              const isExpanded = expandedTaskId === task.id;
              const state = getTaskState(task.id);
              const isSubmitted = !!(state.previewImage && !state.isDraft);

              return (
                <Card
                  key={task.id}
                  className={cn(
                    "transition-all border hover:shadow-card duration-200 overflow-hidden",
                    isExpanded ? "ring-1 ring-primary/30 border-primary/30 shadow-md" : "border-surface-container-high"
                  )}
                >
                  {/* Card Title Box */}
                  <div
                    onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                    className="px-4 md:px-6 py-4 flex items-center justify-between cursor-pointer bg-surface-mid/20 hover:bg-surface-mid/40 transition-all select-none"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-manrope font-bold text-sm text-on-surface">Đề bài #{idx + 1}</span>
                        {task.deadline && (
                          <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            Hạn nộp: {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        )}
                        {state.previewImage && (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1",
                            state.isAnalyzing 
                              ? "bg-amber-50 text-amber-600 animate-pulse" 
                              : (isSubmitted ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600")
                          )}>
                            {state.isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            {state.isAnalyzing 
                              ? "AI Đang xử lý chạy ngầm..." 
                              : (isSubmitted 
                                  ? (state.status === "AUTO_APPROVED" ? "Đã duyệt tự động 🎉" : "Đã nộp bài (Chờ duyệt)") 
                                  : "Nháp phân tích (Chưa nộp)")
                            }
                          </span>
                        )}
                      </div>
                      <p className="font-inter text-xs text-on-surface font-semibold line-clamp-1">🎯 Nhu cầu: {task.customer_need}</p>
                      <p className="font-inter text-[11px] text-on-muted">💰 Ngân sách: <span className="font-bold text-on-surface">{formatVND(task.max_budget)}</span></p>
                    </div>
                    <div>
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-on-muted" /> : <ChevronDown className="h-5 w-5 text-on-muted" />}
                    </div>
                  </div>

                  {/* Expanded Submit Content */}
                  {isExpanded && (
                    <div className="border-t border-surface-container-high px-4 md:px-6 py-5 bg-surface-container-lowest space-y-6 animate-in slide-in-from-top-2 duration-200">
                      {/* Requirements detail */}
                      <div className="rounded-lg bg-surface-container-low p-3.5 text-xs text-on-muted font-inter space-y-1">
                        <span className="font-bold text-on-surface uppercase tracking-wider block text-[10px] mb-1">Yêu cầu kỹ thuật khác:</span>
                        <p>{task.requirements || "Không có yêu cầu đặc biệt."}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Left upload column */}
                        <div className="md:col-span-5 space-y-3">
                          <label className="block font-manrope text-xs font-bold text-on-surface">Hình ảnh báo giá / Cấu hình</label>

                          {!state.previewImage ? (
                            <div
                              onClick={() => fileInputRefs.current[task.id]?.click()}
                              className="flex flex-col items-center justify-center border-2 border-dashed border-surface-container-high rounded-2xl bg-surface-container-low p-6 text-center cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5/20 min-h-[180px]"
                            >
                              <UploadCloud className="h-8 w-8 text-on-muted mb-2 animate-bounce" />
                              <p className="text-xs font-semibold text-on-surface">Nhấp để tải ảnh báo giá lên</p>
                              <p className="text-[10px] text-on-muted mt-1">Hỗ trợ JPG, PNG, WEBP</p>
                              <input
                                type="file"
                                ref={(el) => { fileInputRefs.current[task.id] = el; }}
                                onChange={(e) => handleImageSelect(task.id, e)}
                                accept="image/*"
                                className="hidden"
                              />
                            </div>
                          ) : (
                            <div className="relative rounded-2xl overflow-hidden border border-surface-container-high bg-black/5 group">
                              <img src={state.previewImage} alt="Quote" className="w-full object-contain max-h-[260px]" />
                              {!state.isAnalyzing && !isSubmitted && (
                                <button
                                  onClick={() => handleCancelTask(task.id)}
                                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}

                          {state.isAnalyzing && (
                            <div className="flex flex-col items-center justify-center p-5 border border-surface-container-high rounded-2xl bg-surface-container-low/50 space-y-3">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              <div className="text-center">
                                <p className="text-xs font-bold text-on-surface">AI Đang phân tích chạy ngầm...</p>
                                <p className="text-[10px] text-on-muted mt-0.5">Bạn có thể chuyển trang, AI vẫn tiếp tục xử lý.</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right analysis results column */}
                        <div className="md:col-span-7 space-y-4">
                          {state.extractedParts ? (
                            <div className="space-y-4 animate-in fade-in duration-300">
                              {/* Status badge */}
                              <div className={cn(
                                "flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold",
                                state.isApproved
                                  ? "bg-success-bg/30 border-success-bg text-success-text"
                                  : "bg-error-bg/30 border-error-bg text-error-text"
                              )}>
                                {state.isApproved ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
                                <div>
                                  <p className="font-bold">{state.isApproved ? "ĐẠT - Cấu hình hợp lệ!" : "KHÔNG ĐẠT - Phát hiện lỗi tương thích!"}</p>
                                  {state.approvalReason && <p className="text-[10px] font-normal mt-0.5">{state.approvalReason}</p>}
                                </div>
                              </div>

                              {/* Checks report */}
                              {state.compatibilityChecks && (
                                <div className="rounded-xl border border-surface-container-high bg-surface-mid/40 p-3.5 space-y-2">
                                  <h4 className="font-manrope text-[10px] font-bold text-on-surface uppercase tracking-wider">Báo cáo tương thích AI</h4>
                                  
                                  <div className="space-y-2">
                                    <div className="flex gap-2 text-[11px]">
                                      {renderCheckIcon(state.compatibilityChecks.socket?.status)}
                                      <div>
                                        <span className="font-bold text-on-surface">Socket CPU & Main: </span>
                                        <span className="text-on-muted">{state.compatibilityChecks.socket?.message}</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 text-[11px]">
                                      {renderCheckIcon(state.compatibilityChecks.ram?.status)}
                                      <div>
                                        <span className="font-bold text-on-surface">Thế hệ RAM: </span>
                                        <span className="text-on-muted">{state.compatibilityChecks.ram?.message}</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 text-[11px]">
                                      {renderCheckIcon(state.compatibilityChecks.power?.status)}
                                      <div>
                                        <span className="font-bold text-on-surface">Bộ nguồn (PSU): </span>
                                        <span className="text-on-muted">{state.compatibilityChecks.power?.message}</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 text-[11px]">
                                      {renderCheckIcon(state.compatibilityChecks.case?.status)}
                                      <div>
                                        <span className="font-bold text-on-surface">Vỏ máy (Case): </span>
                                        <span className="text-on-muted">{state.compatibilityChecks.case?.message}</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 text-[11px]">
                                      {renderCheckIcon(state.compatibilityChecks.budget?.status)}
                                      <div>
                                        <span className="font-bold text-on-surface">Ngân sách: </span>
                                        <span className="text-on-muted">{state.compatibilityChecks.budget?.message}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Parts table */}
                              <div className="rounded-xl border border-surface-container-high overflow-hidden">
                                <div className="bg-surface-mid/80 px-3 py-1.5 border-b border-surface-container-high flex justify-between items-center text-[10px]">
                                  <span className="font-bold text-on-surface">Linh kiện trích xuất</span>
                                  <span className="font-bold text-primary">
                                    Tổng: {formatVND(Number(state.extractedParts.total_price?.price || state.extractedParts.total_price || 0))}
                                  </span>
                                </div>
                                <div className="max-h-[140px] overflow-y-auto divide-y divide-surface-container-high/60 bg-surface-container-lowest font-inter text-[10px]">
                                  {Object.entries(state.extractedParts)
                                    .filter(([k, v]) => k !== "total_price" && k !== "checks" && k !== "reason" && k !== "is_analyzing" && k !== "explanation" && k !== "is_draft" && k !== "is_approved" && k !== "temp_ai_score" && k !== "temp_ai_feedback" && v && (v as any).name)
                                    .map(([k, v]) => (
                                      <div key={k} className="flex justify-between px-3 py-1.5 hover:bg-surface-container-low/30">
                                        <span className="font-semibold text-on-surface shrink-0 w-24">{CATEGORY_LABELS[k] || k}</span>
                                        <span className="text-on-surface-variant truncate pr-2 flex-1 text-left">{(v as any).name}</span>
                                        <span className="text-on-surface font-bold shrink-0">{(v as any).price > 0 ? formatVND((v as any).price) : "-"}</span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center text-on-muted space-y-2 border border-surface-container-high border-dashed rounded-2xl min-h-[220px]">
                              <FileText className="h-8 w-8 text-outline" />
                              <p className="text-xs">
                                {state.isAnalyzing ? "AI đang tiến hành phân tích..." : "Vui lòng tải ảnh báo giá ở cột bên trái"}
                              </p>
                              <p className="text-[10px]">
                                {state.isAnalyzing ? "Kết quả kiểm tra tương thích sẽ tự động hiện lên khi xong." : "AI sẽ tự động phân tích và hiển thị kết quả tại đây"}
                              </p>
                            </div>
                          )}

                          {/* Explanation */}
                          <div className="space-y-1">
                            <label className="block font-manrope text-[10px] font-bold text-on-surface uppercase">Ghi chú của bạn</label>
                            <textarea
                              rows={1.5}
                              value={state.explanation}
                              disabled={isSubmitted}
                              onChange={(e) => updateTaskState(task.id, { explanation: e.target.value })}
                              placeholder="Nhập ý kiến/ghi chú..."
                              className="w-full resize-none rounded-xl border border-surface-container-high bg-surface-container-low px-3 py-2 font-inter text-xs text-on-surface outline-none focus:border-primary disabled:opacity-60"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions inside Card */}
                      {!isSubmitted && (
                        <div className="border-t border-surface-container-high pt-4 flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleCancelTask(task.id)}
                            disabled={state.submitting}
                          >
                            Hủy / Xóa ảnh
                          </Button>
                          <Button
                            onClick={() => handleSubmit(task.id)}
                            disabled={state.submitting || state.isAnalyzing || !state.previewImage}
                          >
                            {state.submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Nộp bài
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
