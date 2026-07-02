"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
  Trophy,
  Star,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  formatVND,
} from "@/lib/pc-kho";
import SubmissionHistoryList from "./SubmissionHistoryList";
import PcExerciseModal from "./pc-exercise-modal";

type Tab = "exercises" | "history" | "leaderboard";

interface Exercise {
  id: string;
  title: string;
  description: string;
  exercise_date?: string;
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

interface FeaturedBuild {
  id: string;
  ai_score: number | null;
  submitted_at: string;
  exercise: {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    exercise_date?: string;
  };
  user: {
    id: string;
    name: string;
    avatar_url?: string | null;
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

const isApprovedStatus = (status?: string) => status === "APPROVED" || status === "AUTO_APPROVED";
const isRejectedStatus = (status?: string) => status === "REJECTED";

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
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("exercises");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [remaining, setRemaining] = useState(5);
  const [history, setHistory] = useState<Submission[]>([]);

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [featuredBuilds, setFeaturedBuilds] = useState<FeaturedBuild[]>([]);

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
      const [exRes, subRes, leaderRes] = await Promise.all([
        fetch("/api/build-pc/exercises/today"),
        fetch("/api/build-pc/submissions"),
        fetch("/api/build-pc/leaderboard"),
      ]);
      if (exRes.ok) {
        const data = await exRes.json();
        setExercises(data.exercises || []);
      }
      if (leaderRes.ok) {
        const data = await leaderRes.json();
        setLeaderboard(data.leaderboard || []);
        setFeaturedBuilds(data.featuredBuilds || []);
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

  useEffect(() => {
    if (searchParams.get("submissionId")) {
      setTab("history");
    }
  }, [searchParams]);

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
      <div className="flex gap-1.5 rounded-2xl bg-surface-mid p-1 shadow-sm max-w-[600px]">
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
        <button
          onClick={() => setTab("leaderboard")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 font-manrope text-xs font-bold transition-all cursor-pointer",
            tab === "leaderboard"
              ? "bg-surface-container-lowest text-primary shadow-sm"
              : "text-on-muted hover:text-on-surface"
          )}
        >
          <Trophy className="h-4 w-4" />
          Bảng xếp hạng
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
                      "transition-all border overflow-hidden",
                      (ex as any).is_archived 
                        ? "opacity-75 bg-surface-mid/30 cursor-not-allowed border-surface-container" 
                        : "hover:shadow-card duration-200 cursor-pointer border-surface-container-high hover:border-primary/30 group",
                      modalExerciseId === ex.id && "ring-1 ring-primary/30"
                    )}
                    onClick={() => {
                      if ((ex as any).is_archived) {
                        toast.error("Bài tập này đã hết hạn / bị khoá.");
                        return;
                      }
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
                          <span className="font-manrope text-xs font-extrabold text-primary">
                            {(function() {
                              if (!ex.exercise_date) return ex.title;
                              const d = new Date(ex.exercise_date);
                              const day = String(d.getDate()).padStart(2, "0");
                              const month = String(d.getMonth() + 1).padStart(2, "0");
                              const year = d.getFullYear();
                              return `${day}/${month}/${year} - ${ex.description}`;
                            })()}
                          </span>
                          {(() => {
                            if (state.isAnalyzing) {
                              return (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-600 border border-amber-200 animate-pulse flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Đang đọc...
                                </span>
                              );
                            }
                            if (isSubmitted) {
                              const isApproved = isApprovedStatus(state.status) || state.isApproved;
                              if (isApproved) {
                                return (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Hoàn tất thẩm định
                                  </span>
                                );
                              }
                              if (isRejectedStatus(state.status)) {
                                return (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1">
                                    <XCircle className="h-3 w-3" />
                                    Yêu cầu hiệu chỉnh
                                  </span>
                                );
                              }
                              return (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Đang thẩm định
                                </span>
                              );
                            }
                            if ((ex as any).is_archived) {
                              return (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-surface-container-high text-on-muted border border-surface-container flex items-center gap-1">
                                  Đã khoá
                                </span>
                              );
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
                        <div className="flex items-center gap-3 mt-1.5">
                          <p className="font-inter text-xs text-on-surface leading-normal line-clamp-1">{ex.requirements.constraints?.join(" • ") || "Không có ràng buộc"}</p>
                          
                          {/* Completed Users Avatars */}
                          {(ex as any).submissions && (ex as any).submissions.length > 0 && (
                            <div className="flex items-center -space-x-1.5" title={`${(ex as any).submissions.length} người đã hoàn thành`}>
                              {(ex as any).submissions.slice(0, 5).map((sub: any) => (
                                <img
                                  key={sub.user.id}
                                  src={sub.user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${sub.user.name}`}
                                  alt={sub.user.name}
                                  className="w-5 h-5 rounded-full border border-surface-container-lowest object-cover relative z-10"
                                />
                              ))}
                              {(ex as any).submissions.length > 5 && (
                                <div className="w-5 h-5 rounded-full border border-surface-container-lowest bg-surface-container flex items-center justify-center text-[9px] font-bold text-on-muted z-20 relative">
                                  +{(ex as any).submissions.length - 5}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
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

      {/* Leaderboard View */}
      {tab === "leaderboard" && (
        <div className="space-y-6">
          <Card className="border-surface-container-high shadow-sm">
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h2 className="font-manrope text-lg font-bold text-on-surface">Top Điểm Build PC</h2>
              </div>
              {leaderboard.length === 0 ? (
                <div className="text-center py-10 text-on-muted text-sm">Chưa có ai ghi điểm.</div>
              ) : (
                <>
                  <div className="h-64 w-full mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leaderboard.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          cursor={{ fill: 'currentColor', opacity: 0.05 }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="pc_score" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-3">
                    {leaderboard.map((user, idx) => (
                      <div key={user.id} className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-lowest border border-surface-container hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-3">
                          <span className={cn("w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold", 
                            idx === 0 ? "bg-amber-100 text-amber-600" : 
                            idx === 1 ? "bg-slate-200 text-slate-700" : 
                            idx === 2 ? "bg-orange-100 text-orange-700" : 
                            "bg-surface-container-high text-on-muted"
                          )}>
                            {idx + 1}
                          </span>
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container border border-surface-container">
                            {user.avatar_url ? <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-on-muted">{user.name.charAt(0)}</div>}
                          </div>
                          <span className="text-sm font-semibold text-on-surface">{user.name}</span>
                        </div>
                        <span className="text-sm font-bold text-primary">{user.pc_score} điểm</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card className="border-surface-container-high shadow-sm">
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  <h2 className="font-manrope text-lg font-bold text-on-surface">Bài Build PC nổi bật trong tuần</h2>
                </div>
                <span className="hidden sm:inline-flex text-[10px] font-extrabold uppercase tracking-wider text-on-muted bg-surface-container px-2.5 py-1 rounded-full">
                  7 ngày gần nhất
                </span>
              </div>

              {featuredBuilds.length === 0 ? (
                <div className="text-center py-10 text-on-muted text-sm">Tuần này chưa có bài điểm cao.</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {featuredBuilds.map((build, idx) => (
                    <div
                      key={build.id}
                      className="rounded-2xl border border-surface-container bg-surface-container-lowest p-4 hover:border-primary/25 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn(
                              "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                              idx === 0 ? "bg-amber-100 text-amber-600" :
                              idx === 1 ? "bg-slate-200 text-slate-700" :
                              idx === 2 ? "bg-orange-100 text-orange-700" :
                              "bg-surface-container-high text-on-muted"
                            )}>
                              {idx + 1}
                            </span>
                            <span className={cn(
                              "rounded px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider border",
                              build.exercise.difficulty === "easy" ? "border-emerald-200 text-emerald-600 bg-transparent" :
                              build.exercise.difficulty === "medium" ? "border-amber-200 text-amber-600 bg-transparent" :
                              "border-rose-200 text-rose-600 bg-transparent"
                            )}>
                              {DIFFICULTY_LABEL[build.exercise.difficulty] || build.exercise.difficulty}
                            </span>
                            <span className="text-[10px] font-semibold text-on-muted">
                              {formatDateGroup(build.submitted_at)}
                            </span>
                          </div>
                          <p className="font-manrope text-sm font-bold text-on-surface line-clamp-2">
                            {build.exercise.description || build.exercise.title}
                          </p>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-surface-container border border-surface-container shrink-0">
                              {build.user.avatar_url ? (
                                <img src={build.user.avatar_url} alt={build.user.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-on-muted">
                                  {(build.user.name || "?").charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-semibold text-on-surface truncate">{build.user.name}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-2xl font-black text-primary leading-none">
                            {Math.round(build.ai_score || 0)}
                          </div>
                          <div className="text-[10px] font-bold text-on-muted uppercase tracking-wider">điểm</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* History View */}
      {tab === "history" && (
        <SubmissionHistoryList
          history={history}
          onCancelExercise={(exId) => handleCancelExercise(exId)}
          initialSubmissionId={searchParams.get("submissionId")}
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
