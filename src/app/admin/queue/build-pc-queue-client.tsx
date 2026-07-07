"use client";

import React, { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Clock,
  Loader2,
  Cpu,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Pagination } from "@/components/ui/pagination";
import { formatVND } from "@/lib/pc-kho";

interface PcSubmissionItem {
  id: string;
  status: string;
  submitted_at: string | Date;
  explanation: string;
  parts_answer:
    | Array<{ name: string; price: number; category: string; reason?: string }>
    | {
      parts?: Array<{ name: string; price: number; category: string; reason?: string }>;
      total_price?: number;
      temp_ai_score?: number;
      temp_ai_feedback?: string;
      [key: string]: unknown;
    };
  image_urls: string[];
  reviewed_at?: string | Date | null;
  ai_score: number | null;
  ai_feedback: string | null;
  reject_reason: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
    department: string | null;
  };
  exercise: {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    requirements: {
      budget?: number;
      useCase?: string;
      constraints?: string[];
      hints?: string[];
      [key: string]: unknown;
    };
    exercise_date?: string | Date;
  };
}

interface Props {
  initialSubmissions: PcSubmissionItem[];
  currentPage?: number;
  totalPages?: number;
  activeTab?: "PENDING" | "REVIEWED";
  searchTerm?: string;
  deptFilter?: string;
  pendingCount?: number;
  reviewedCount?: number;
}

function getSubmissionParts(partsAnswer: PcSubmissionItem["parts_answer"]) {
  if (Array.isArray(partsAnswer)) return partsAnswer;
  if (Array.isArray(partsAnswer?.parts)) return partsAnswer.parts;
  if (!partsAnswer || typeof partsAnswer !== "object") return [];

  return Object.entries(partsAnswer)
    .filter(([key, value]) =>
      !["total_price", "checks", "reason", "is_analyzing", "explanation", "is_draft", "is_approved", "temp_ai_score", "temp_ai_feedback", "extracted_raw", "analysis_step", "analysis_message"].includes(key) &&
      value &&
      typeof value === "object" &&
      "name" in value
    )
    .map(([category, value]) => ({
      category,
      name: String((value as any).name || ""),
      price: Number((value as any).price) || 0,
      reason: "",
    }))
    .filter((part) => part.name);
}

function getSubmissionTotal(partsAnswer: PcSubmissionItem["parts_answer"], parts: ReturnType<typeof getSubmissionParts>) {
  if (!Array.isArray(partsAnswer) && typeof partsAnswer?.total_price === "number") {
    return partsAnswer.total_price;
  }
  return parts.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
}

function getExerciseDisplayTitle(exercise: PcSubmissionItem["exercise"]) {
  const title = String(exercise.title || "").trim();
  const description = String(exercise.description || "").trim();
  if (title.toLowerCase() === "yêu cầu cấu hình" && description) return description;
  return title || description || "Đề bài Build PC";
}

function formatExerciseRequirements(exercise: PcSubmissionItem["exercise"]) {
  const requirements = exercise.requirements || {};
  const lines: string[] = [];

  if (requirements.useCase) lines.push(String(requirements.useCase));
  if (typeof requirements.budget === "number" && requirements.budget > 0) {
    lines.push(`Ngân sách tối đa: ${formatVND(requirements.budget)}`);
  }
  if (Array.isArray(requirements.constraints)) {
    lines.push(...requirements.constraints.map((item) => String(item).trim()).filter(Boolean));
  }
  if (Array.isArray(requirements.hints) && requirements.hints.length > 0) {
    lines.push(`Gợi ý: ${requirements.hints.map((item) => String(item).trim()).filter(Boolean).join(", ")}`);
  }

  return lines.filter(Boolean);
}

function groupSubmissionsByExercise(submissions: PcSubmissionItem[]) {
  const groups: Array<{ key: string; exercise: PcSubmissionItem["exercise"]; items: PcSubmissionItem[] }> = [];

  submissions.forEach((submission) => {
    const key = submission.exercise.id || submission.exercise.title;
    const group = groups.find((item) => item.key === key);
    if (group) {
      group.items.push(submission);
    } else {
      groups.push({ key, exercise: submission.exercise, items: [submission] });
    }
  });

  return groups;
}

export default function BuildPcQueueClient({
  initialSubmissions,
  currentPage = 1,
  totalPages = 1,
  activeTab: initialTab = "PENDING",
  searchTerm: initialSearch = "",
  deptFilter: initialDept = "ALL",
  pendingCount = 0,
  reviewedCount = 0,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [deptFilter, setDeptFilter] = useState(initialDept);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState("");
  type AnalysisPhase = "connecting" | "vision" | "deepseek" | "scoring" | "done" | "error";
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>("connecting");

  useEffect(() => {
    setSubmissions(initialSubmissions);
    setActiveTab(initialTab);
    setSearchTerm(initialSearch);
    setDeptFilter(initialDept);
    setExpandedId(null);
  }, [initialSubmissions, initialTab, initialSearch, initialDept]);

  const updateUrl = (params: Record<string, string>) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) p.set(k, v);
      else p.delete(k);
    });
    router.push(`/admin/queue?${p.toString()}`);
  };

  const STEPS: Array<{
    phase: AnalysisPhase;
    label: string;
    pct: [number, number];
    duration: [number, number];
  }> = [
    { phase: "connecting", label: "Kết nối API AI...", pct: [5, 10], duration: [400, 800] },
    { phase: "vision", label: "AI Vision đang đọc ảnh báo giá và bóc tách linh kiện...", pct: [10, 40], duration: [1200, 2000] },
    { phase: "deepseek", label: "DeepSeek đang phân loại linh kiện và kiểm tra tương thích...", pct: [40, 80], duration: [800, 1500] },
    { phase: "scoring", label: "AI đang đánh giá và ra quyết định tự động...", pct: [80, 95], duration: [600, 1000] },
  ];

  const handleProcess = async (ids: string[]) => {
    setLoading(true);
    setProcessingAction("PROCESS");
    setProgress(0);
    setProgressStep("Bắt đầu xử lý hàng chờ...");
    setAnalysisPhase("connecting");

    try {
      const total = ids.length;
      let completed = 0;

      for (const id of ids) {
        const submission = submissions.find(s => s.id === id);
        const name = submission?.user?.name || submission?.user?.email || "Bài nộp";
        setProgressStep(`Đang duyệt bài của ${name} (${completed + 1}/${total})...`);
        setAnalysisPhase("vision");
        setProgress(Math.round((completed / total) * 100) + 5);

        try {
          const res = await fetch("/api/admin/build-pc/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submissionIds: [id], action: "PROCESS" }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Lỗi xử lý.");

          if (Array.isArray(data.results) && data.results.length > 0) {
            setSubmissions((prev) =>
              prev.map((sub) => {
                const updated = data.results.find((item: any) => item.id === sub.id);
                return updated
                  ? {
                      ...sub,
                      status: updated.status,
                      ai_score: updated.ai_score,
                      ai_feedback: updated.ai_feedback,
                      reject_reason: updated.reject_reason,
                      parts_answer: updated.parts_answer ?? sub.parts_answer,
                      image_urls: updated.image_urls ?? sub.image_urls,
                    }
                  : sub;
              })
            );
          }
        } catch (err: any) {
          console.error(`Lỗi khi xử lý bài ${id}:`, err);
          toast.error(`Lỗi khi xử lý bài của ${name}: ${err.message || err}`);
        }

        completed++;
        setProgress(Math.round((completed / total) * 100));
      }

      setAnalysisPhase("done");
      setProgressStep("Hoàn tất xử lý tất cả bài tập.");
      setProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setProcessingAction(null);
      toast.success("Đã hoàn tất hàng chờ phân tích AI.");
      router.refresh();
    } catch (err: unknown) {
      setAnalysisPhase("error");
      setProgressStep("Lỗi hàng chờ xử lý.");
      toast.error(err instanceof Error ? err.message : "Lỗi xử lý.");
    } finally {
      setLoading(false);
    }
  };

  const groupedSubmissions = groupSubmissionsByExercise(submissions);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-2xl">
            <Cpu className="h-5 w-5 text-on-primary" />
          </div>
          <div>
            <h1 className="font-manrope text-xl font-bold text-on-surface">Duyệt Bài — Build PC</h1>
            <p className="font-inter text-xs text-on-muted">Bài tập lắp PC nộp hàng ngày</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["PENDING", "REVIEWED"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => updateUrl({ tab, module: "build-pc", page: "1" })}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 font-manrope text-xs font-bold transition-all cursor-pointer",
              activeTab === tab
                ? "bg-primary-container/30 text-primary"
                : "text-on-muted hover:bg-surface-container-low"
            )}
          >
            {tab === "PENDING" ? <Clock className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {tab === "PENDING" ? `Chờ xử lý (${pendingCount})` : `Đã xử lý (${reviewedCount})`}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-muted" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && updateUrl({ search: searchTerm, module: "build-pc" })}
            placeholder="Tìm theo tên, đề bài..."
            className="w-full rounded-xl border border-surface-container-high bg-surface-mid py-2 pl-10 pr-4 font-inter text-xs outline-none focus:border-primary"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => updateUrl({ dept: e.target.value, module: "build-pc" })}
          className="rounded-xl border border-surface-container-high bg-surface-mid px-3 py-2 font-inter text-xs outline-none"
        >
          <option value="ALL">Tất cả phòng ban</option>
          <option value="TECH">Kỹ thuật</option>
          <option value="SALES">Kinh doanh</option>
          <option value="MARKETING">Marketing</option>
        </select>
      </div>

      {/* Batch actions */}
      {activeTab === "PENDING" && (
        <div className="flex items-center gap-3 rounded-xl bg-primary-container/20 px-4 py-3">
          <span className="font-inter text-xs text-on-surface">{submissions.length} bài đang chờ xử lý</span>
          <button
            onClick={() => handleProcess(submissions.map((s) => s.id))}
            disabled={loading || submissions.length === 0}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-manrope text-[11px] font-bold text-on-primary cursor-pointer disabled:opacity-50 transition-all hover:opacity-90"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            AI tự động duyệt tất cả
          </button>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {submissions.length === 0 ? (
          <p className="py-12 text-center text-sm text-on-muted">Không có bài nộp.</p>
        ) : (
          groupedSubmissions.map((group) => (
            <div key={group.key} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-surface-container-high bg-surface-container-low px-3 py-2">
                <span className="rounded-lg bg-primary-container/30 px-2 py-1 font-manrope text-[10px] font-bold uppercase text-primary">
                  Đề bài
                </span>
                <span className="min-w-0 flex-1 truncate font-manrope text-xs font-bold text-on-surface">
                  {getExerciseDisplayTitle(group.exercise)}
                </span>
                <span className="font-inter text-[10px] text-on-muted">{group.items.length} bài</span>
              </div>

              {group.items.map((s) => {
                const parts = getSubmissionParts(s.parts_answer);
                const totalPrice = getSubmissionTotal(s.parts_answer, parts);
                const isExpanded = expandedId === s.id;
                const aiScore = s.ai_score ?? (!Array.isArray(s.parts_answer) ? s.parts_answer?.temp_ai_score ?? null : null);
                const aiFeedback = s.ai_feedback || (!Array.isArray(s.parts_answer) ? s.parts_answer?.temp_ai_feedback || null : null);
                const partsObj = (!Array.isArray(s.parts_answer) && typeof s.parts_answer === "object" ? s.parts_answer : null) as any;
                const isAnalyzing = partsObj?.is_analyzing === true;
                const analysisStep = partsObj?.analysis_step as string | undefined;
                const analysisMessage = partsObj?.analysis_message as string | undefined;

                return (
                  <div key={s.id} className="overflow-hidden rounded-2xl border border-surface-container-high bg-surface-mid">
                    <div className="flex items-start gap-3 p-4">
                      <UserAvatar name={s.user.name} src={s.user.avatar_url} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-manrope text-sm font-bold text-on-surface">{s.user.name}</span>
                          <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-inter text-[10px] text-on-muted">
                            {s.user.department}
                          </span>
                          {(() => {
                            if (isAnalyzing) {
                              return (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-inter text-[10px] font-bold text-primary">
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                  {analysisStep === "vision" ? "AI Vision đang đọc ảnh..." : analysisStep === "deepseek" ? "DeepSeek đang kiểm tra..." : "Đang phân tích AI..."}
                                </span>
                              );
                            }
                            if (s.status === "APPROVED" || s.status === "AUTO_APPROVED") {
                              return (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-inter text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> Đã duyệt
                                </span>
                              );
                            }
                            if (s.status === "REJECTED") {
                              return (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 font-inter text-[9px] font-extrabold text-rose-700 uppercase tracking-wider">
                                  <XCircle className="h-2.5 w-2.5" /> Từ chối
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <p className="mt-0.5 font-manrope text-xs font-semibold text-primary">{getExerciseDisplayTitle(s.exercise)}</p>
                        <p className="font-inter text-[10px] text-on-muted">
                          {activeTab === "REVIEWED" && s.reviewed_at
                            ? `Duyệt lúc ${new Date(s.reviewed_at).toLocaleString("vi-VN")}`
                            : new Date(s.submitted_at).toLocaleString("vi-VN")} · {parts.length} linh kiện · {formatVND(totalPrice)}
                        </p>
                        {isAnalyzing ? (
                          <p className="mt-1 flex items-center gap-1 font-inter text-[10px] text-on-muted italic">
                            <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />
                            {analysisMessage || "AI đang xử lý bài nộp này, vui lòng chờ..."}
                          </p>
                        ) : aiScore != null ? (
                          <p className="mt-1 flex items-center gap-1 font-inter text-[10px] text-on-muted">
                            <Sparkles className="h-3 w-3 text-primary" />
                            AI: {Math.round(aiScore)}đ — {aiFeedback}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {activeTab === "PENDING" && !isAnalyzing && (
                          <button
                            onClick={() => handleProcess([s.id])}
                            disabled={loading}
                            className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 font-manrope text-[10px] font-bold text-on-primary cursor-pointer disabled:opacity-50 transition-all hover:opacity-90"
                          >
                            <Sparkles className="h-3 w-3" />
                            Duyệt AI
                          </button>
                        )}
                        {activeTab === "REVIEWED" && s.status === "REJECTED" && !isAnalyzing && (
                          <button
                            onClick={() => handleProcess([s.id])}
                            disabled={loading}
                            className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 font-manrope text-[10px] font-bold text-on-primary cursor-pointer disabled:opacity-50 transition-all hover:opacity-90"
                            title="Yêu cầu AI xử lý lại bài đã bị từ chối"
                          >
                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            AI duyệt lại
                          </button>
                        )}
                        {activeTab === "PENDING" && isAnalyzing && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary opacity-60" />
                        )}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : s.id)}
                          className="rounded-xl p-2 text-on-muted hover:bg-surface-container-low cursor-pointer"
                        >
                          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="space-y-3 border-t border-surface-container-high bg-surface-container-low/30 px-4 py-4">
                        <div className="flex items-center gap-3 rounded-xl bg-surface-mid p-3">
                          <UserAvatar name={s.user.name} src={s.user.avatar_url} size="md" />
                          <div className="min-w-0">
                            <p className="truncate font-manrope text-sm font-bold text-on-surface">{s.user.name || s.user.email}</p>
                            <p className="font-inter text-[10px] text-on-muted">{s.user.department || "Chưa có phòng ban"} · Người nộp</p>
                          </div>
                        </div>
                        <div className="grid gap-3 lg:grid-cols-2">
                          <div className="rounded-xl bg-surface-mid p-3">
                            <p className="mb-1 font-manrope text-[10px] font-bold uppercase text-on-muted">Đề bài</p>
                            <p className="font-inter text-xs leading-relaxed text-on-surface">{getExerciseDisplayTitle(s.exercise)}</p>
                          </div>
                          <div className="rounded-xl bg-surface-mid p-3">
                            <p className="mb-1 font-manrope text-[10px] font-bold uppercase text-on-muted">Yêu cầu cấu hình</p>
                            {formatExerciseRequirements(s.exercise).length > 0 ? (
                              <ul className="space-y-1 font-inter text-xs leading-relaxed text-on-surface">
                                {formatExerciseRequirements(s.exercise).map((line, index) => (
                                  <li key={index}>{line}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="font-inter text-xs leading-relaxed text-on-surface">{s.exercise.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {parts.map((p, i) => (
                            <div key={i} className="rounded-xl bg-surface-mid px-3 py-2">
                              <p className="font-manrope text-[10px] font-bold uppercase text-on-muted">{p.category}</p>
                              <p className="font-inter text-xs text-on-surface">{p.name}</p>
                              <p className="font-inter text-[10px] text-primary">{formatVND(p.price)}</p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-xl bg-surface-mid p-3">
                          <p className="mb-1 font-manrope text-[10px] font-bold text-on-muted">Giải thích</p>
                          <p className="font-inter text-xs leading-relaxed text-on-surface">{s.explanation}</p>
                        </div>
                        {/* AI Analysis Details */}
                        {(() => {
                          const renderCheckIcon = (status: string) => {
                            if (status === "PASS") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />;
                            if (status === "FAIL") return <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />;
                            return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />;
                          };

                          const hasChecks = !Array.isArray(s.parts_answer) && !!(s.parts_answer as any)?.checks;
                          
                          if (aiScore == null && !hasChecks) return null;

                          return (
                            <details className="group rounded-xl border border-surface-container-high bg-surface-mid overflow-hidden" open>
                              <summary className="flex items-center justify-between px-3.5 py-3 cursor-pointer select-none font-manrope text-[11px] font-extrabold uppercase text-primary hover:bg-surface-container-low transition-colors">
                                <span className="flex items-center gap-1.5">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Kết quả phân tích tự động (AI)
                                </span>
                                <div className="flex items-center gap-2">
                                  {aiScore != null && (
                                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-manrope text-[11px] font-extrabold text-primary normal-case">
                                      {Math.round(aiScore)} Điểm
                                    </span>
                                  )}
                                  <ChevronDown className="h-3.5 w-3.5 text-on-muted transition-transform group-open:rotate-180" />
                                </div>
                              </summary>
                              
                              <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-surface-container-high/40">
                                {aiFeedback && (
                                  <div className="rounded-lg bg-surface-container-low/50 p-2.5 border border-surface-container-high/60">
                                    <p className="font-manrope text-[10px] font-bold text-on-muted uppercase tracking-wider mb-1">Nhận xét của AI</p>
                                    <p className="font-inter text-xs text-on-surface leading-relaxed">{aiFeedback}</p>
                                  </div>
                                )}

                                {hasChecks && (
                                  <div className="space-y-2">
                                    <p className="font-manrope text-[10px] font-bold text-on-muted uppercase tracking-wider">Chi tiết tương thích</p>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      {Object.entries((s.parts_answer as any).checks).map(([key, check]: any) => (
                                        <div key={key} className="flex gap-2 items-start rounded-lg bg-surface-container-low/30 p-2 border border-surface-container-high/40 text-xs">
                                          {renderCheckIcon(check.status)}
                                          <div className="space-y-0.5">
                                            <p className="font-bold text-on-surface uppercase text-[9px] tracking-wider">
                                              {key.toUpperCase()}
                                            </p>
                                            <p className="text-on-muted text-[11px] leading-snug">{check.message}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </details>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => updateUrl({ page: String(p), module: "build-pc" })}
        />
      )}

      {/* AI Processing progress dialog */}
      {processingAction === "PROCESS" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="w-full max-w-sm rounded-3xl border border-surface-container bg-surface-mid p-6 shadow-ambient space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2">
              {analysisPhase === "error" ? (
                <XCircle className="h-5 w-5 text-rose-500" />
              ) : analysisPhase === "done" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              )}
              <h3 className="font-manrope text-sm font-extrabold text-on-surface">
                {analysisPhase === "error"
                  ? "Lỗi phân tích cấu hình"
                  : analysisPhase === "done"
                  ? "Hoàn tất phân tích cấu hình"
                  : "Đang phân tích cấu hình tự động"}
              </h3>
            </div>

            {/* Phase timeline */}
            <div className="space-y-2.5">
              {STEPS.map((step) => {
                const isActive = analysisPhase === step.phase;
                const isPast = STEPS.findIndex((s) => s.phase === analysisPhase) >
                  STEPS.findIndex((s) => s.phase === step.phase);
                const isError = analysisPhase === "error" && isActive;

                return (
                  <div key={step.phase} className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all duration-300",
                    isActive && !isError && "bg-primary/5 border border-primary/20",
                    isPast && "bg-emerald-50/50",
                    isError && "bg-rose-50 border border-rose-200"
                  )}>
                    {/* Status indicator */}
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {isPast ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : isActive && isError ? (
                        <XCircle className="h-4 w-4 text-rose-500" />
                      ) : isActive ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border-2 border-surface-container-high" />
                      )}
                    </div>
                    {/* Label */}
                    <span className={cn(
                      "font-inter text-[11px] transition-colors",
                      isPast && "text-emerald-700 font-medium",
                      isActive && !isError && "text-primary font-bold",
                      isActive && isError && "text-rose-700 font-medium",
                      !isActive && !isPast && "text-on-muted"
                    )}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500 ease-out",
                    analysisPhase === "error" ? "bg-rose-400" :
                    analysisPhase === "done" ? "bg-emerald-500" :
                    "bg-primary"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between font-inter text-[10px] text-on-muted">
                <span className="truncate">{progressStep}</span>
                <span className="shrink-0 ml-2">{progress}%</span>
              </div>
            </div>

            {analysisPhase === "error" && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setProcessingAction(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100/80 active:scale-[0.98] transition-all cursor-pointer border-none font-inter"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
