"use client";

import React, { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  X,
  Search,
  Clock,
  Loader2,
  Cpu,
  ChevronDown,
  ImageIcon,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Pagination } from "@/components/ui/pagination";
import { formatVND } from "@/lib/pc-kho";
import Image from "next/image";

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
      };
  image_urls: string[];
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
    title: string;
    description: string;
    difficulty: string;
    requirements: { budget?: number; useCase?: string };
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

const presetReasons = ["Linh kiện không tương thích", "Vượt ngân sách", "Giải thích chưa đủ", "Sai yêu cầu đề bài"];

function getSubmissionParts(partsAnswer: PcSubmissionItem["parts_answer"]) {
  if (Array.isArray(partsAnswer)) return partsAnswer;
  return Array.isArray(partsAnswer?.parts) ? partsAnswer.parts : [];
}

function getSubmissionTotal(partsAnswer: PcSubmissionItem["parts_answer"], parts: ReturnType<typeof getSubmissionParts>) {
  if (!Array.isArray(partsAnswer) && typeof partsAnswer?.total_price === "number") {
    return partsAnswer.total_price;
  }
  return parts.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [deptFilter, setDeptFilter] = useState(initialDept);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    setSubmissions(initialSubmissions);
    setActiveTab(initialTab);
    setSearchTerm(initialSearch);
    setDeptFilter(initialDept);
    setSelectedIds(new Set());
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

  const handleAction = async (ids: string[], action: "APPROVE" | "REJECT", reason?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/build-pc/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionIds: ids, action, rejectReason: reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSubmissions((prev) =>
        prev.map((s) =>
          ids.includes(s.id)
            ? { ...s, status: action === "APPROVE" ? "APPROVED" : "REJECTED", reject_reason: reason || null }
            : s
        )
      );
      setSelectedIds(new Set());
      setRejectingId(null);
      toast.success(action === "APPROVE" ? "Đã duyệt bài." : "Đã từ chối bài.");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi xử lý.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateExercises = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/build-pc/generate-exercises", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Đã tạo ${data.count} bài tập mới cho hôm nay.`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi sinh bài tập.");
    } finally {
      setGenerating(false);
    }
  };

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
        <button
          onClick={handleGenerateExercises}
          disabled={generating}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-manrope text-xs font-bold text-on-primary transition-all hover:opacity-90 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", generating && "animate-spin")} />
          {generating ? "Đang tạo..." : "Sinh bài tập"}
        </button>
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
            {tab === "PENDING" ? <Clock className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            {tab === "PENDING" ? `Chờ duyệt (${pendingCount})` : `Đã xử lý (${reviewedCount})`}
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
      {activeTab === "PENDING" && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-primary-container/20 px-4 py-2">
          <span className="font-inter text-xs text-on-surface">{selectedIds.size} đã chọn</span>
          <button
            onClick={() => handleAction([...selectedIds], "APPROVE")}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg bg-success-bg px-3 py-1.5 font-manrope text-[10px] font-bold text-success-text cursor-pointer"
          >
            <Check className="h-3 w-3" /> Duyệt
          </button>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {submissions.length === 0 ? (
          <p className="py-12 text-center text-sm text-on-muted">Không có bài nộp.</p>
        ) : (
          submissions.map((s) => {
            const parts = getSubmissionParts(s.parts_answer);
            const images = (s.image_urls as string[]) || [];
            const totalPrice = getSubmissionTotal(s.parts_answer, parts);
            const isExpanded = expandedId === s.id;
            const aiScore = s.ai_score ?? (!Array.isArray(s.parts_answer) ? s.parts_answer?.temp_ai_score ?? null : null);
            const aiFeedback = s.ai_feedback || (!Array.isArray(s.parts_answer) ? s.parts_answer?.temp_ai_feedback || null : null);

            return (
              <div key={s.id} className="rounded-2xl border border-surface-container-high bg-surface-mid overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                  {activeTab === "PENDING" && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) next.add(s.id);
                        else next.delete(s.id);
                        setSelectedIds(next);
                      }}
                      className="mt-1"
                    />
                  )}
                  <UserAvatar name={s.user.name} src={s.user.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-manrope text-sm font-bold text-on-surface">{s.user.name}</span>
                      <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-inter text-[10px] text-on-muted">
                        {s.user.department}
                      </span>
                    </div>
                    <p className="mt-0.5 font-manrope text-xs font-semibold text-primary">{s.exercise.title}</p>
                    <p className="font-inter text-[10px] text-on-muted">
                      {new Date(s.submitted_at).toLocaleString("vi-VN")} · {parts.length} linh kiện · {formatVND(totalPrice)}
                    </p>
                    {aiScore != null && (
                      <p className="mt-1 flex items-center gap-1 font-inter text-[10px] text-on-muted">
                        <Sparkles className="h-3 w-3 text-primary" />
                        AI: {Math.round(aiScore)}đ — {aiFeedback}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {activeTab === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleAction([s.id], "APPROVE")}
                          disabled={loading}
                          className="rounded-xl bg-success-bg p-2 text-success-text hover:opacity-80 cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setRejectingId(s.id)}
                          className="rounded-xl bg-error-bg p-2 text-error-text hover:opacity-80 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
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
                  <div className="border-t border-surface-container-high bg-surface-container-low/30 px-4 py-4 space-y-3">
                    <p className="font-inter text-xs text-on-muted">{s.exercise.description}</p>
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
                    {images.length > 0 && (
                      <div className="flex gap-2">
                        {images.map((url, i) => (
                          <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-surface-container-high">
                            <Image src={url} alt="" fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    {s.status === "REJECTED" && s.reject_reason && (
                      <p className="font-inter text-xs text-error-text">Lý do từ chối: {s.reject_reason}</p>
                    )}
                  </div>
                )}

                {rejectingId === s.id && (
                  <div className="border-t border-surface-container-high bg-error-bg/30 px-4 py-3 space-y-2">
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Lý do từ chối..."
                      className="w-full rounded-xl border border-surface-container-high bg-surface-mid px-3 py-2 font-inter text-xs outline-none"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {presetReasons.map((r) => (
                        <button key={r} onClick={() => setRejectReason(r)} className="rounded-lg bg-surface-mid px-2 py-1 font-inter text-[10px] text-on-muted cursor-pointer">
                          {r}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction([s.id], "REJECT", rejectReason)}
                        disabled={!rejectReason || loading}
                        className="rounded-xl bg-error-text px-4 py-1.5 font-manrope text-xs font-bold text-on-primary cursor-pointer disabled:opacity-50"
                      >
                        Xác nhận từ chối
                      </button>
                      <button onClick={() => setRejectingId(null)} className="rounded-xl px-4 py-1.5 font-inter text-xs text-on-muted cursor-pointer">
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => updateUrl({ page: String(p), module: "build-pc" })}
        />
      )}
    </div>
  );
}
