"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast, Toaster } from "sonner";
import {
  BookOpen,
  ClipboardList,
  History,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  X,
  Cpu,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  formatVND,
  DAILY_PC_SUBMISSION_MIN,
  DAILY_PC_SUBMISSION_MAX,
  getStartOfDayVN,
} from "@/lib/pc-kho";

type Tab = "exercises" | "guides" | "history";

interface Exercise {
  id: string;
  title: string;
  description: string;
  requirements: {
    budget: number;
    useCase: string;
    constraints: string[];
    hints: string[];
  };
  difficulty: string;
}

interface Submission {
  id: string;
  status: string;
  submitted_at: string;
  ai_score: number | null;
  ai_feedback: string | null;
  exercise: { title: string; difficulty: string };
}

interface Part {
  name: string;
  price: number;
  partId: string;
}

interface ExerciseState {
  previewImage: string | null;
  isAnalyzing: boolean;
  analysisStep: "idle" | "vision" | "deepseek" | "done";
  extractedParts: Record<string, Part> | null;
  compatibilityChecks: any;
  isApproved: boolean;
  approvalReason: string;
  explanation: string;
  submitting: boolean;
  submission_id?: string;
  status?: string;
  isDraft?: boolean;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Khó",
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  PENDING: { label: "Chờ duyệt", icon: <Clock className="h-3.5 w-3.5" />, className: "text-warn-text bg-warn-bg" },
  APPROVED: { label: "Đã duyệt", icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "text-success-text bg-success-bg" },
  REJECTED: { label: "Từ chối", icon: <XCircle className="h-3.5 w-3.5" />, className: "text-error-text bg-error-bg" },
  AUTO_APPROVED: { label: "Tự duyệt", icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "text-success-text bg-success-bg" },
  ANALYZING: { label: "Đang xử lý...", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, className: "text-amber-700 bg-amber-50" },
};

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

const DEFAULT_EXERCISE_STATE: ExerciseState = {
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

const PC_GUIDES = [
  {
    id: "guide-1",
    title: "Nguyên tắc chọn CPU & Mainboard",
    content: "Socket CPU và mainboard phải khớp (Ví dụ: LGA1700 cho Intel 12-14th, AM5 cho Ryzen 7000). Kiểm tra chipset hỗ trợ RAM DDR4/DDR5 trước khi chọn."
  },
  {
    id: "guide-2",
    title: "Tính công suất PSU",
    content: "Tổng TDP ước tính = CPU + VGA + ~100W phần còn lại. Chọn PSU có công suất ≥ 120% tổng TDP, ưu tiên công suất thực 80 Plus cho độ ổn định."
  },
  {
    id: "guide-3",
    title: "Tương thích tản nhiệt",
    content: "Tản nhiệt AIO cần case hỗ trợ radiator tương ứng. Tản nhiệt khí (Air cooler) phải vừa chiều sâu của case. Luôn kiểm tra khoảng cách RAM nếu dùng tản nhiệt tháp lớn."
  },
  {
    id: "guide-4",
    title: "Cách nộp bài tập hàng ngày",
    content: "Nhận đề → chọn đồ → chụp ảnh → gửi bài. Làm ít nhất 1 bài/ngày, tối đa 5 bài là nghỉ. Dễ như ăn bánh!"
  }
];

export default function BuildPcClient() {
  const [tab, setTab] = useState<Tab>("exercises");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [remaining, setRemaining] = useState(5);
  const [history, setHistory] = useState<Submission[]>([]);

  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [exerciseStates, setExerciseStates] = useState<Record<string, ExerciseState>>({});

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getExerciseState = (exId: string): ExerciseState => {
    return exerciseStates[exId] || DEFAULT_EXERCISE_STATE;
  };

  const updateExerciseState = (exId: string, updates: Partial<ExerciseState>) => {
    setExerciseStates((prev) => ({
      ...prev,
      [exId]: {
        ...(prev[exId] || DEFAULT_EXERCISE_STATE),
        ...updates,
      },
    }));
  };

  const fetchData = useCallback(async () => {
    try {
      const [exRes, subRes] = await Promise.all([
        fetch("/api/build-pc/exercises/today"),
        fetch("/api/build-pc/submissions"),
      ]);
      if (exRes.ok) {
        const data = await exRes.json();
        setExercises(data.exercises || []);
      }
      if (subRes.ok) {
        const data = await subRes.json();
        setTodayCount(data.todayCount);
        setRemaining(data.remaining);
        setHistory(data.submissions || []);

        // Restore exercise states from today's submissions list
        const states: Record<string, ExerciseState> = {};
        if (Array.isArray(data.submissions)) {
          const todayStart = getStartOfDayVN();
          data.submissions.forEach((sub: any) => {
            const subDate = new Date(sub.submitted_at);
            if (subDate.getTime() < todayStart.getTime()) return; // Skip historical ones

            const parts = sub.parts_answer || {};
            const isAnalyzing = parts.is_analyzing === true;
            const isDraft = parts.is_draft !== false; // Default to draft unless explicitly false

            states[sub.exercise_id] = {
              previewImage: Array.isArray(sub.image_urls) ? sub.image_urls[0] || null : null,
              isAnalyzing,
              analysisStep: isAnalyzing ? "deepseek" : "idle",
              extractedParts: isAnalyzing ? null : (parts.checks ? parts : null),
              compatibilityChecks: isAnalyzing ? null : parts.checks,
              isApproved: sub.status === "AUTO_APPROVED" || parts.is_approved === true,
              approvalReason: parts.reason || "",
              explanation: sub.explanation || "",
              submitting: false,
              submission_id: sub.id,
              status: sub.status,
              isDraft: isDraft,
            };
          });
          setExerciseStates(states);
        }
      }
    } catch {
      toast.error("Không tải được dữ liệu.");
    } finally {
      setLoadingExercises(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for background worker updates dynamically
  useEffect(() => {
    const pollingIntervals: Record<string, NodeJS.Timeout> = {};

    Object.entries(exerciseStates).forEach(([exId, state]) => {
      const subId = state.submission_id;
      if (state.isAnalyzing && subId && !pollingIntervals[exId]) {
        pollingIntervals[exId] = setInterval(async () => {
          try {
            const res = await fetch(`/api/training/pc-build/status?id=${subId}&type=submission`);
            if (res.ok) {
              const result = await res.json();
              if (!result.isAnalyzing) {
                clearInterval(pollingIntervals[exId]);
                delete pollingIntervals[exId];

                if (result.hasError) {
                  toast.error(result.errorMsg || "Bị lỗi xử lý ảnh rồi, thử lại nha.");
                  updateExerciseState(exId, {
                    isAnalyzing: false,
                    analysisStep: "idle",
                    previewImage: null,
                  });
                } else {
                  updateExerciseState(exId, {
                    isAnalyzing: false,
                    analysisStep: "idle",
                    extractedParts: result.data,
                    isApproved: result.status === "AUTO_APPROVED" || result.data?.is_approved === true,
                    approvalReason: result.data?.reason || "",
                    compatibilityChecks: result.data?.checks || null,
                    status: result.status,
                    isDraft: result.data?.is_draft !== false,
                  });
                  toast.success("Xong phần check rồi! Vô viết vài dòng giải thích rồi gửi bài thôi.");
                  fetchData();
                }
              }
            }
          } catch (e) {
            console.error("Lỗi polling submission:", e);
          }
        }, 4000);
      }
    });

    return () => {
      Object.values(pollingIntervals).forEach(clearInterval);
    };
  }, [exerciseStates, fetchData]);

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

  const handleImageSelect = async (exId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const nameLower = file.name.toLowerCase();
      const typeLower = (file.type || "").toLowerCase();
      const isExcel = nameLower.endsWith(".xlsx") || nameLower.endsWith(".xls") || typeLower.includes("spreadsheetml") || typeLower.includes("excel");
      let base64Data = "";
      if (isExcel) {
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });
      } else {
        base64Data = await compressImage(file);
      }
      updateExerciseState(exId, { previewImage: base64Data, isAnalyzing: true, analysisStep: "vision" });

      const res = await fetch("/api/build-pc/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_id: exId,
          image_urls: [base64Data],
          explanation: "Bản nháp phân tích cấu hình cho bài tập...", // Temporary placeholder (>=20 chars)
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      updateExerciseState(exId, {
        submission_id: data.submission?.id || data.submission_id,
        isAnalyzing: true,
        status: "PENDING",
        isDraft: true,
      });

	      toast.success("Đang tải lên, chút xíu nha...");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Tải ảnh bị lỗi, thử lại nha.");
      updateExerciseState(exId, { previewImage: null, isAnalyzing: false });
    }
  };

  const clearExerciseState = (exId: string) => {
    setExerciseStates((prev) => {
      const copy = { ...prev };
      delete copy[exId];
      return copy;
    });
  };

  const handleCancelExercise = async (exId: string) => {
    const state = getExerciseState(exId);
    if (state.submission_id && state.isDraft) {
      try {
        await fetch("/api/training/pc-build/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: state.submission_id, type: "submission" }),
        });
      } catch (e) {
        console.error(e);
      }
    }
    clearExerciseState(exId);
    fetchData();
  };

  const handleSubmit = async (exId: string) => {
    const state = getExerciseState(exId);
    if (!state.submission_id) return;

    if (state.explanation.trim().length < 20) {
      toast.error("Viết dài dài tí nha, 20 ký tự trở lên á.");
      return;
    }

    updateExerciseState(exId, { submitting: true });
    const loadingToastId = toast.loading("Đang gửi bài nè...");

    try {
      const res = await fetch("/api/training/pc-build/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: state.submission_id,
          type: "submission",
          explanation: state.explanation.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Đã gửi bài thành công! 🔥 🎉", { id: loadingToastId });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gửi bài thất bại.", { id: loadingToastId });
      updateExerciseState(exId, { submitting: false });
    }
  };

  const renderCheckIcon = (status: string) => {
    if (status === "PASS") return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
    if (status === "FAIL") return <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />;
    return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm">
            <Cpu className="h-5 w-5 text-on-primary" />
          </div>
          <div>
            <h1 className="font-manrope text-xl font-bold text-on-surface">Thực hành Build PC</h1>
            <p className="font-inter text-xs text-on-muted">Thực chiến build PC mỗi ngày — Quẹo ảnh linh kiện là có review liền</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 rounded-2xl bg-surface-mid p-1 shadow-sm max-w-md">
        <button
          onClick={() => setTab("exercises")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 font-manrope text-xs font-bold transition-all cursor-pointer",
            tab === "exercises"
              ? "bg-surface-container-lowest text-primary shadow-sm"
              : "text-on-muted hover:text-on-surface"
          )}
        >
          <ClipboardList className="h-4 w-4" />
          Bài tập hôm nay
        </button>
        <button
          onClick={() => setTab("guides")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 font-manrope text-xs font-bold transition-all cursor-pointer",
            tab === "guides"
              ? "bg-surface-container-lowest text-primary shadow-sm"
              : "text-on-muted hover:text-on-surface"
          )}
        >
          <BookOpen className="h-4 w-4" />
          Hướng dẫn
        </button>
        <button
          onClick={() => setTab("history")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 font-manrope text-xs font-bold transition-all cursor-pointer",
            tab === "history"
              ? "bg-surface-container-lowest text-primary shadow-sm"
              : "text-on-muted hover:text-on-surface"
          )}
        >
          <History className="h-4 w-4" />
          Lịch sử nộp
        </button>
      </div>

      {/* Exercises View */}
      {tab === "exercises" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-surface-container-high bg-surface-mid p-4 flex flex-col justify-between sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-muted">Đã làm hôm nay:</span>
              <span className="font-manrope text-sm font-extrabold text-primary">{todayCount} / {DAILY_PC_SUBMISSION_MAX}</span>
            </div>
            <p className="text-xs text-on-muted italic">Mỗi ngày cần hoàn thành ít nhất {DAILY_PC_SUBMISSION_MIN} bài tập để đạt KPI.</p>
          </div>

          {loadingExercises ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : exercises.length === 0 ? (
            <p className="py-8 text-center text-sm text-on-muted">Hôm nay không có đề, rảnh thì mai làm nha ✨</p>
          ) : (
            <div className="space-y-4">
              {exercises.map((ex) => {
                const isExpanded = expandedExerciseId === ex.id;
                const state = getExerciseState(ex.id);
                const isSubmitted = !!(state.previewImage && !state.isDraft);

                return (
                  <Card
                    key={ex.id}
                    className={cn(
                      "transition-all border hover:shadow-card duration-200 overflow-hidden",
                      isExpanded ? "ring-1 ring-primary/30 border-primary/30 shadow-md" : "border-surface-container-high"
                    )}
                  >
                    {/* Header bar */}
                    <div
                      onClick={() => {
                        if (remaining <= 0) {
                          toast.error("Hết lượt gửi bài hôm nay rồi, mai quay lại nha.");
                          return;
                        }
                        setExpandedExerciseId(isExpanded ? null : ex.id);
                      }}
                      className="px-4 md:px-6 py-4 flex items-center justify-between cursor-pointer bg-surface-mid/20 hover:bg-surface-mid/40 transition-all select-none"
                    >
                      <div className="space-y-1 pr-4 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={cn(
                            "rounded px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider",
                            ex.difficulty === "easy" ? "bg-success-bg text-success-text" :
                            ex.difficulty === "medium" ? "bg-warn-bg text-warn-text" : "bg-error-bg text-error-text"
                          )}>
                            {DIFFICULTY_LABEL[ex.difficulty] || ex.difficulty}
                          </span>
                          <span className="font-manrope text-xs font-extrabold text-primary">{ex.title}</span>
                          {state.previewImage && (
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1",
                              state.isAnalyzing 
                                ? "bg-amber-50 text-amber-600 animate-pulse" 
                                : (isSubmitted ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600")
                            )}>
                              {state.isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                              {state.isAnalyzing
                                ? "Đang soi..."
                                : (isSubmitted
                                    ? (state.status === "AUTO_APPROVED" || state.isApproved ? "Oke nha 🎉" : "Đã gửi")
                                    : "Mới nháp")
                              }
                            </span>
                          )}
                        </div>
                        <p className="font-inter text-xs text-on-surface leading-normal line-clamp-1">{ex.description}</p>
                        <p className="font-inter text-[11px] text-on-muted">💰 Tiền tối đa: <span className="font-bold text-on-surface">{formatVND(ex.requirements.budget)}</span></p>
                      </div>
                      <div>
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-on-muted" /> : <ChevronDown className="h-5 w-5 text-on-muted" />}
                      </div>
                    </div>

                    {/* Expandable submit area */}
                    {isExpanded && (
                      <div className="border-t border-surface-container-high px-4 md:px-6 py-5 bg-surface-container-lowest space-y-6 animate-in slide-in-from-top-2 duration-200">
                        {/* Constraints detail list */}
                        <div className="rounded-lg bg-surface-container-low p-3.5 text-xs text-on-muted font-inter space-y-1">
                          <span className="font-bold text-on-surface uppercase tracking-wider block text-[10px] mb-1">Yêu cầu Ràng buộc & Gợi ý: Mẹo:</span>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {ex.requirements.constraints?.map((c, i) => <li key={i}>{c}</li>)}
                            {ex.requirements.hints?.map((h, i) => <li key={i} className="text-primary italic">💡 Gợi ý: {h}</li>)}
                          </ul>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                          {/* Left upload image column */}
                          <div className="md:col-span-5 space-y-3">
                            <label className="block font-manrope text-xs font-bold text-on-surface">Hình ảnh báo giá / Hóa đơn</label>

                            {!state.previewImage ? (
                              <div
                                onClick={() => fileInputRefs.current[ex.id]?.click()}
                                className="flex flex-col items-center justify-center border-2 border-dashed border-surface-container-high rounded-2xl bg-surface-container-low p-6 text-center cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5/20 min-h-[180px]"
                              >
                                <UploadCloud className="h-8 w-8 text-on-muted mb-2 animate-bounce" />
                                <p className="text-xs font-semibold text-on-surface">Thả ảnh hoặc Excel vô đây nè</p>
                                <p className="text-[10px] text-on-muted mt-1">Chấp hết JPG, PNG, WEBP, Excel luôn nha ✌️</p>
                                <input
                                  type="file"
                                  ref={(el) => { fileInputRefs.current[ex.id] = el; }}
                                  onChange={(e) => handleImageSelect(ex.id, e)}
                                  accept="image/*,.xls,.xlsx"
                                  className="hidden"
                                />
                              </div>
                            ) : (
                              <div className="relative rounded-2xl overflow-hidden border border-surface-container-high bg-black/5 group p-4 min-h-[120px] flex items-center justify-center">
                                {(() => {
                                  const isExcel = state.previewImage?.startsWith("data:application/vnd") || state.previewImage?.includes("spreadsheetml") || state.previewImage?.includes("excel");
                                  if (isExcel) {
                                    return (
                                      <div className="flex flex-col items-center gap-2 p-2 text-center w-full">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner">
                                          <FileSpreadsheet className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-0.5">
                                          <p className="text-xs font-bold text-on-surface">File Excel (.xlsx)</p>
                                          <p className="text-[10px] text-on-muted">Đã tải lên và sẵn sàng xử lý</p>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return <img src={state.previewImage} alt="Quote" className="w-full object-contain max-h-[260px]" />;
                                })()}
                                {!state.isAnalyzing && !isSubmitted && (
                                  <button
                                    onClick={() => handleCancelExercise(ex.id)}
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
                                  <p className="text-xs font-bold text-on-surface">Đang check ảnh cho bạn...</p>
                                  <p className="text-[10px] text-on-muted mt-0.5">Bạn có thể chuyển sang tab khác và quay lại sau.</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right results column */}
                          <div className="md:col-span-7 space-y-4">
                            {state.extractedParts ? (
                              <div className="space-y-4 animate-in fade-in duration-300">
                                {/* Status Report bar */}
                                <div className={cn(
                                  "flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold",
                                  state.isApproved
                                    ? "bg-success-bg/30 border-success-bg text-success-text"
                                    : "bg-error-bg/30 border-error-bg text-error-text"
                                )}>
                                  {state.isApproved ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
                                  <div>
                                    <p className="font-bold">{state.isApproved ? "NGON — Cấu hình chuẩn lun!" : "CHỊU — Coi lại mấy món kia đi!"}</p>
                                    {state.approvalReason && <p className="text-[10px] font-normal mt-0.5">{state.approvalReason}</p>}
                                  </div>
                                </div>

                                {/* Compatibility checklist */}
                                {state.compatibilityChecks && (
                                  <div className="rounded-xl border border-surface-container-high bg-surface-mid/40 p-3.5 space-y-2">
                                    <h4 className="font-manrope text-[10px] font-bold text-on-surface uppercase tracking-wider">Check tương thích</h4>
                                    
                                    <div className="space-y-2">
                                      <div className="flex gap-2 text-[11px]">
                                        {renderCheckIcon(state.compatibilityChecks.socket?.status)}
                                        <div>
                                          <span className="font-bold text-on-surface">CPU Socket CPU & Main:  Mainboard: </span>
                                          <span className="text-on-muted">{state.compatibilityChecks.socket?.message}</span>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 text-[11px]">
                                        {renderCheckIcon(state.compatibilityChecks.ram?.status)}
                                        <div>
                                          <span className="font-bold text-on-surface">RAM và Hỗ trợ DDR: </span>
                                          <span className="text-on-muted">{state.compatibilityChecks.ram?.message}</span>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 text-[11px]">
                                        {renderCheckIcon(state.compatibilityChecks.power?.status)}
                                        <div>
                                          <span className="font-bold text-on-surface">Công suất bộ nguồn: </span>
                                          <span className="text-on-muted">{state.compatibilityChecks.power?.message}</span>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 text-[11px]">
                                        {renderCheckIcon(state.compatibilityChecks.case?.status)}
                                        <div>
                                          <span className="font-bold text-on-surface">Kích thước linh kiện & vỏ: </span>
                                          <span className="text-on-muted">{state.compatibilityChecks.case?.message}</span>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 text-[11px]">
                                        {renderCheckIcon(state.compatibilityChecks.budget?.status)}
                                        <div>
                                          <span className="font-bold text-on-surface">💰 Tiền thực tế: </span>
                                          <span className="text-on-muted">{state.compatibilityChecks.budget?.message}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Extracted parts list */}
                                <div className="rounded-xl border border-surface-container-high overflow-hidden">
                                  <div className="bg-surface-mid/80 px-3 py-1.5 border-b border-surface-container-high flex justify-between items-center text-[10px]">
                                    <span className="font-bold text-on-surface">Linh kiện có trong phiếu</span>
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
                                  {state.isAnalyzing ? "Đang check ảnh cho bạn..." : "Vui lòng tải ảnh linh kiện ở cột bên trái"}
                                </p>
                                <p className="text-[10px]">
                                  {state.isAnalyzing ? "Kết quả sẽ hiển thị tự động sau khi kiểm tra." : "Kết quả đánh giá bộ linh kiện sẽ hiện ra tại đây"}
                                </p>
                              </div>
                            )}

                            {/* Explanation input */}
                            <div className="space-y-1">
                              <label className="block font-manrope text-[10px] font-bold text-on-surface uppercase">Kể admin nghe vì sao bạn chọn mấy món này (tối thiểu 20 ký tự)</label>
                              <textarea
                                rows={2}
                                value={state.explanation}
                                disabled={isSubmitted}
                                onChange={(e) => updateExerciseState(ex.id, { explanation: e.target.value })}
                                placeholder="Ví dụ: con CPU với main này socket khớp nhau, RAM đủ mạnh cho tác vụ A, nguồn đủ công suất..."
                                className="w-full resize-none rounded-xl border border-surface-container-high bg-surface-container-low px-3 py-2 font-inter text-xs text-on-surface outline-none focus:border-primary disabled:opacity-60"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Expandable Footer buttons */}
                        {!isSubmitted && (
                          <div className="border-t border-surface-container-high pt-4 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => handleCancelExercise(ex.id)} disabled={state.submitting}>
                              Hủy bỏ
                            </Button>
                            <Button
                              onClick={() => handleSubmit(ex.id)}
                              disabled={state.submitting || state.isAnalyzing || !state.previewImage || state.explanation.trim().length < 20}
                            >
                              {state.submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                              Gửi bài
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
        </div>
      )}

      {/* Guides View */}
      {tab === "guides" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {PC_GUIDES.map((g) => (
            <div key={g.id} className="rounded-2xl border border-surface-container-high bg-surface-mid p-5">
              <div className="mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="font-manrope text-sm font-bold text-on-surface">{g.title}</h3>
              </div>
              <p className="font-inter text-xs leading-relaxed text-on-muted">{g.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* History View */}
      {tab === "history" && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-on-muted">Chưa có bài nộp nào.</p>
          ) : (
            history.map((s) => {
              const st = STATUS_CONFIG[s.status] || STATUS_CONFIG.PENDING;
              return (
                <div key={s.id} className="flex flex-col gap-3 rounded-2xl border border-surface-container-high bg-surface-mid p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-manrope text-xs font-bold text-on-surface">{s.exercise.title}</h4>
                      <p className="text-[10px] text-on-muted mt-0.5">{new Date(s.submitted_at).toLocaleString()}</p>
                    </div>
                    <span className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold", st.className)}>
                      {st.icon}
                      {st.label}
                    </span>
                  </div>
                  {s.ai_score !== null && (
                    <div className="rounded-xl bg-surface-container-low p-3 space-y-1 text-xs">
                      <p className="font-bold text-primary">Điểm đánh giá: {s.ai_score}/100</p>
                      {s.ai_feedback && <p className="text-on-muted font-inter leading-relaxed">{s.ai_feedback}</p>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// Fallback button
function Button({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  return (
    <button
      className={cn(
        "rounded-xl px-4 py-2 font-manrope text-xs font-bold cursor-pointer transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5",
        props.variant === "outline"
          ? "border border-surface-container text-on-surface hover:bg-surface-container-low"
          : "gradient-primary text-on-primary hover:opacity-95",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
