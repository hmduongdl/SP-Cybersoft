"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast, Toaster } from "sonner";
import { AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  History,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  X,
  Cpu,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  formatVND,
} from "@/lib/pc-kho";
import SubmissionHistoryList from "./SubmissionHistoryList";
import PcExerciseModal from "./pc-exercise-modal";

type Tab = "exercises" | "history";

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
  exercise_id: string;
  status: string;
  submitted_at: string;
  ai_score: number | null;
  ai_feedback: string | null;
  reject_reason?: string | null;
  explanation?: string;
  parts_answer?: any;
  image_urls?: string[];
  exercise: {
    title: string;
    difficulty: string;
    exercise_date?: string;
    requirements?: { budget?: number; useCase?: string; constraints?: string[] };
  };
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

function getSubmissionParts(partsAnswer: any) {
  if (Array.isArray(partsAnswer)) return partsAnswer;
  if (Array.isArray(partsAnswer?.parts)) return partsAnswer.parts;
  if (!partsAnswer || typeof partsAnswer !== "object") return [];

  return Object.entries(partsAnswer)
    .filter(([key, value]) =>
      !["total_price", "checks", "reason", "is_analyzing", "explanation", "is_draft", "is_approved", "temp_ai_score", "temp_ai_feedback", "extracted_raw", "analysis_step", "analysis_message"].includes(key) &&
      value &&
      typeof value === "object" &&
      (value as any).name
    )
    .map(([category, value]) => ({
      category,
      name: (value as any).name,
      price: Number((value as any).price) || 0,
    }));
}

function formatDateGroup(dateValue: string) {
  return new Date(dateValue).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function groupHistoryByDate(items: Submission[]) {
  return items.reduce<Array<{ dateLabel: string; items: Submission[] }>>((groups, item) => {
    const dateLabel = formatDateGroup(item.submitted_at);
    const group = groups.find((entry) => entry.dateLabel === dateLabel);
    if (group) group.items.push(item);
    else groups.push({ dateLabel, items: [item] });
    return groups;
  }, []);
}

function getLocalDateString(dateInput: Date | string): string {
  const d = new Date(dateInput);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 3600000 * 7);
  const year = vnTime.getFullYear();
  const month = String(vnTime.getMonth() + 1).padStart(2, "0");
  const day = String(vnTime.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function BuildPcClient() {
  const [tab, setTab] = useState<Tab>("exercises");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [remaining, setRemaining] = useState(5);
  const [history, setHistory] = useState<Submission[]>([]);

  const [modalExerciseId, setModalExerciseId] = useState<string | null>(null);
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
        setHistory(
          Array.isArray(data.submissions)
            ? data.submissions.filter((sub: any) => sub.parts_answer?.is_draft !== true)
            : []
        );

        // Restore exercise states from submissions list
        const states: Record<string, ExerciseState> = {};
        if (Array.isArray(data.submissions)) {
          data.submissions.forEach((sub: any) => {
            const parts = sub.parts_answer || {};
            const isAnalyzing = parts.is_analyzing === true;
            const isDraft = parts.is_draft === true;

            states[sub.exercise_id] = {
              previewImage: Array.isArray(sub.image_urls) ? sub.image_urls[0] || null : null,
              isAnalyzing,
              analysisStep: isAnalyzing ? "deepseek" : "idle",
              extractedParts: isAnalyzing ? null : getSubmissionParts(parts),
              compatibilityChecks: isAnalyzing ? null : parts.checks,
              isApproved: sub.status === "APPROVED" || sub.status === "AUTO_APPROVED" || parts.is_approved === true,
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
                    extractedParts: getSubmissionParts(result.data),
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
      const base64Data = await compressImage(file);
      updateExerciseState(exId, { 
        previewImage: base64Data, 
        isAnalyzing: false, 
        analysisStep: "idle",
        isDraft: true 
      });
      toast.success("Đã chọn ảnh thành công. Bấm nút Xác nhận nộp để hoàn thành.");
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
    if (state.submission_id) {
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
    if (!state.previewImage) return;

    updateExerciseState(exId, { submitting: true });
    const loadingToastId = toast.loading("Đang gửi cấu hình...");

    try {
      const res = await fetch("/api/build-pc/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_id: exId,
          image_urls: [state.previewImage],
          explanation: state.explanation.trim() || "Nộp bài tự động",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Đã nộp bài thành công. Kết quả sẽ được cập nhật sau.", { id: loadingToastId });
      updateExerciseState(exId, {
        submitting: false,
        isDraft: false,
        status: "PENDING",
      });
      setModalExerciseId(null);
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
            <p className="font-inter text-xs text-on-muted">Rèn luyện kỹ năng phân tích và phối hợp cấu hình máy tính.</p>
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
          <div className="rounded-2xl border border-surface-container-high bg-surface-mid p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-on-surface">
              <span>Tiến độ hoàn thành hôm nay:</span>
              <span className="font-manrope text-sm font-extrabold text-primary">{todayCount} / {exercises.length} bài tập</span>
            </div>
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${exercises.length > 0 ? (todayCount / exercises.length) * 100 : 0}%` }}
              />
            </div>
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
                const state = getExerciseState(ex.id);
                const isSubmitted = !!(state.previewImage && !state.isDraft);

                return (
                  <Card
                    key={ex.id}
                    className={cn(
                      "transition-all border hover:shadow-card duration-200 overflow-hidden cursor-pointer border-surface-container-high hover:border-primary/30 group",
                      modalExerciseId === ex.id && "ring-1 ring-primary/30"
                    )}
                    onClick={() => {
                      if (remaining <= 0 && !state.previewImage && !state.submission_id) {
                        toast.error("Hết lượt gửi bài hôm nay rồi, mai quay lại nha.");
                        return;
                      }
                      setModalExerciseId(ex.id);
                    }}
                  >
                    <div className="px-4 md:px-6 py-4 flex items-center justify-between bg-surface-mid/20 hover:bg-surface-mid/40 transition-all select-none">
                      <div className="space-y-1 pr-4 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={cn(
                            "rounded px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider border",
                            ex.difficulty === "easy" ? "border-emerald-200 text-emerald-600 bg-transparent" :
                            ex.difficulty === "medium" ? "border-amber-200 text-amber-600 bg-transparent" : "border-rose-200 text-rose-600 bg-transparent"
                          )}>
                            {DIFFICULTY_LABEL[ex.difficulty] || ex.difficulty}
                          </span>
                          <span className="font-manrope text-xs font-extrabold text-primary">{ex.title}</span>
                          {(() => {
                            const isGraded = !!(state.extractedParts || state.compatibilityChecks || state.status === "APPROVED" || state.status === "REJECTED");

                            if (state.isAnalyzing) {
                              return (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-600 border border-amber-200 animate-pulse flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Đang đọc...
                                </span>
                              );
                            }
                            if (isSubmitted) {
                              if (isGraded) {
                                const isApproved = state.status === "APPROVED" && state.isApproved;
                                if (isApproved) {
                                  return (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Hoàn thành
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1">
                                      <XCircle className="h-3 w-3" />
                                      Cần điều chỉnh
                                    </span>
                                  );
                                }
                              } else {
                                return (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Đang chờ duyệt
                                  </span>
                                );
                              }
                            }
                            if (state.previewImage && state.isDraft) {
                              return (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-200 text-indigo-600 bg-transparent flex items-center gap-1">
                                  Nháp
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <p className="font-inter text-xs text-on-surface leading-normal line-clamp-1">{ex.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-on-muted font-medium opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                          {state.submission_id ? "Xem chi tiết" : "Làm bài"}
                        </span>
                        <ArrowRight className="h-4 w-4 text-on-muted group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History View */}
      {tab === "history" && (
        <SubmissionHistoryList
          history={history}
          onCancelExercise={(exId) => handleCancelExercise(exId)}
        />
      )}

      {/* Exercise Modal */}
      <AnimatePresence>
        {modalExerciseId && (() => {
          const ex = exercises.find(e => e.id === modalExerciseId);
          if (!ex) return null;
          const state = getExerciseState(ex.id);
          return (
            <PcExerciseModal
              key={modalExerciseId}
              exercise={ex}
              state={state}
              isOpen={true}
              onClose={() => {
                setModalExerciseId(null);
                fetchData();
              }}
              onImageSelect={handleImageSelect}
              onSubmit={handleSubmit}
              onCancel={handleCancelExercise}
              onFetchData={fetchData}
              updateState={(updates) => updateExerciseState(ex.id, updates)}
              fileInputRef={{ current: fileInputRefs.current[ex.id] || null }}
            />
          );
        })()}
      </AnimatePresence>
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
