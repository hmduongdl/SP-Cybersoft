"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  UploadCloud,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Cpu,
  ClipboardList,
  ImageIcon,
  BrainCircuit,
  Zap,
  ShieldCheck,
  ArrowRight,
  Trophy,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatVND } from "@/lib/pc-kho";

// ─── Types ──────────────────────────────────────────────────────────────────────
interface Part {
  name: string;
  price: number;
  partId: string;
}

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

interface Props {
  exercise: Exercise;
  state: ExerciseState;
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (exId: string, e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onSubmit: (exId: string) => Promise<void>;
  onCancel: (exId: string) => Promise<void>;
  onFetchData: () => Promise<void>;
  updateState: (updates: Partial<ExerciseState>) => void;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
}

// ─── Constants ──────────────────────────────────────────────────────────────────
const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Khó",
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  PENDING: { label: "Chờ duyệt", icon: <Clock className="h-3.5 w-3.5" />, className: "text-warn-text bg-warn-bg dark:text-amber-200 dark:bg-amber-400/10" },
  APPROVED: { label: "Đã duyệt", icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "text-success-text bg-success-bg dark:text-emerald-200 dark:bg-emerald-400/10" },
  REJECTED: { label: "Từ chối", icon: <XCircle className="h-3.5 w-3.5" />, className: "text-error-text bg-error-bg dark:text-rose-200 dark:bg-rose-400/10" },
  AUTO_APPROVED: { label: "Tự duyệt", icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "text-success-text bg-success-bg dark:text-emerald-200 dark:bg-emerald-400/10" },
  ANALYZING: { label: "Đang xử lý...", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, className: "text-amber-700 bg-amber-50 dark:text-amber-200 dark:bg-amber-400/10" },
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

// ─── Animation Variants ─────────────────────────────────────────────────────────
const SLIDE_VARIANTS = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

const FADE_UP = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const STAGGER_CHILDREN = {
  animate: { transition: { staggerChildren: 0.07 } },
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
function renderCheckIcon(status: string) {
  if (status === "PASS") return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
  if (status === "FAIL") return <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />;
  return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
}

const CHECK_DISPLAY_ORDER = ["requirement_fit", "display_output", "socket", "cooler_socket", "ram", "power", "case", "budget"];

const CHECK_LABELS: Record<string, string> = {
  requirement_fit: "Đối chiếu yêu cầu đề bài",
  display_output: "Khả năng xuất hình",
  socket: "Tương thích CPU và mainboard",
  cooler_socket: "Tương thích tản nhiệt và socket",
  ram: "Tương thích bộ nhớ",
  power: "Đánh giá công suất nguồn",
  case: "Tương thích vỏ máy",
  budget: "Kiểm soát ngân sách",
};

function getOrderedChecks(checks: Record<string, any>) {
  return Object.entries(checks).sort(([a], [b]) => {
    const ai = CHECK_DISPLAY_ORDER.indexOf(a);
    const bi = CHECK_DISPLAY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function OverviewSlide({ exercise }: { exercise: Exercise }) {
  return (
    <motion.div variants={FADE_UP} className="space-y-5">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <h4 className="font-manrope text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5 dark:text-cyan-200">
          <ClipboardList className="h-3.5 w-3.5" />
          Mô tả đề bài
        </h4>
        <p className="font-inter text-sm text-indigo-900/80 leading-relaxed dark:text-slate-100/85">{exercise.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div variants={FADE_UP} className="rounded-xl border border-surface-container-high bg-surface-container-low p-3.5 dark:border-white/10 dark:bg-white/[0.06]">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-on-muted mb-1 dark:text-slate-400">Ngân sách</p>
          <p className="font-manrope text-lg font-extrabold text-primary dark:text-cyan-200">{formatVND(exercise.requirements.budget)}</p>
        </motion.div>
        <motion.div variants={FADE_UP} className="rounded-xl border border-surface-container-high bg-surface-container-low p-3.5 dark:border-white/10 dark:bg-white/[0.06]">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-on-muted mb-1 dark:text-slate-400">Độ khó</p>
          <span className={cn(
            "inline-block rounded-md px-2 py-0.5 text-[11px] font-extrabold border",
            exercise.difficulty === "easy" ? "border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-300/30 dark:text-emerald-200 dark:bg-emerald-400/10" :
            exercise.difficulty === "medium" ? "border-amber-200 text-amber-600 bg-amber-50 dark:border-amber-300/30 dark:text-amber-200 dark:bg-amber-400/10" :
            "border-rose-200 text-rose-600 bg-rose-50 dark:border-rose-300/30 dark:text-rose-200 dark:bg-rose-400/10"
          )}>
            {DIFFICULTY_LABEL[exercise.difficulty] || exercise.difficulty}
          </span>
        </motion.div>
      </div>

      {exercise.requirements.constraints.length > 0 && (
        <motion.div variants={FADE_UP} className="rounded-xl border border-surface-container-high bg-surface-container-low p-3.5 space-y-1.5 dark:border-white/10 dark:bg-white/[0.06]">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-on-muted flex items-center gap-1 dark:text-slate-400">
            <AlertTriangle className="h-3 w-3 text-amber-500 dark:text-amber-300" />
            Ghi chú ràng buộc
          </p>
          <ul className="space-y-1">
            {exercise.requirements.constraints.map((c, i) => (
              <motion.li
                key={i}
                variants={FADE_UP}
                className="flex items-start gap-2 text-xs text-on-surface-variant dark:text-slate-200/80"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0 dark:bg-cyan-300/70" />
                {c}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {exercise.requirements.hints.length > 0 && (
        <motion.div variants={FADE_UP} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-1.5 dark:border-amber-300/25 dark:bg-amber-300/10">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1 dark:text-amber-200">
            <Sparkles className="h-3 w-3" />
            Gợi ý
          </p>
          <ul className="space-y-1">
            {exercise.requirements.hints.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-amber-800/80 italic dark:text-amber-100/85">
                <span className="text-amber-500 mt-0.5 dark:text-amber-300">💡</span>
                {h}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}

function UploadSlide({
  exercise,
  state,
  fileInputRef,
  onImageSelect,
  onSubmit,
  onCancel,
}: {
  exercise: Exercise;
  state: ExerciseState;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onImageSelect: (exId: string, e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onSubmit: (exId: string) => Promise<void>;
  onCancel: (exId: string) => Promise<void>;
}) {
  const fileInputRefInner = useRef<HTMLInputElement | null>(null);

  // Sync the ref so parent can access it too
  useEffect(() => {
    fileInputRef.current = fileInputRefInner.current;
  }, [fileInputRef]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    onImageSelect(exercise.id, e);
  };

  return (
    <motion.div variants={FADE_UP} className="space-y-4">
      {/* Upload zone */}
      {!state.previewImage ? (
        <motion.div
          variants={FADE_UP}
          onClick={() => fileInputRefInner.current?.click()}
          className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/30 hover:bg-indigo-50/60 p-8 text-center cursor-pointer transition-all hover:border-indigo-400 min-h-[200px] group dark:border-cyan-300/25 dark:bg-cyan-300/[0.07] dark:hover:bg-cyan-300/[0.11] dark:hover:border-cyan-300/55"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <UploadCloud className="h-10 w-10 text-indigo-400 group-hover:text-indigo-500 transition-colors mb-3 dark:text-cyan-300/80 dark:group-hover:text-cyan-200" />
          </motion.div>
          <p className="text-sm font-bold text-on-surface mb-1 dark:text-slate-50">Tải lên ảnh cấu hình máy tính</p>
          <p className="text-xs text-on-muted mb-4 dark:text-slate-400">Chọn ảnh chụp báo giá</p>

          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white border border-surface-container-high px-3 py-1.5 text-[10px] font-semibold text-on-muted shadow-sm dark:bg-white/[0.08] dark:border-white/10 dark:text-slate-300">
              <ImageIcon className="h-3 w-3" />
              Ảnh (JPG, PNG)
            </span>
          </div>
          <input
            type="file"
            ref={fileInputRefInner}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />
        </motion.div>
      ) : (
        <motion.div
          variants={FADE_UP}
          className="relative rounded-2xl overflow-hidden border border-surface-container-high bg-black/5 p-2 min-h-[200px] flex items-center justify-center dark:border-white/10 dark:bg-slate-950/45"
        >
          <img src={state.previewImage} alt="Quote" className="w-full object-contain max-h-[220px]" />
          {!state.isAnalyzing && (
            <button
              onClick={() => onCancel(exercise.id)}
              className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </motion.div>
      )}

      {/* Explanation textarea */}
      {state.previewImage && (
        <motion.div variants={FADE_UP}>
          <textarea
            value={state.explanation}
            onChange={(e) => {
              // Update explanation through parent
              const event = new CustomEvent("pc-exercise-explanation", { detail: { exId: exercise.id, explanation: e.target.value } });
              window.dispatchEvent(event);
            }}
            placeholder="Giải thích ngắn về cấu hình của bạn (tùy chọn)..."
            className="w-full rounded-xl border border-surface-container-high bg-surface-container-lowest px-3.5 py-2.5 text-xs font-inter text-on-surface placeholder:text-on-muted/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[60px] dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-cyan-300/30"
          />
        </motion.div>
      )}

      {/* Action buttons */}
      {state.previewImage && (
        <motion.div variants={FADE_UP} className="flex justify-end gap-2 pt-1">
          <button
            onClick={() => onCancel(exercise.id)}
            disabled={state.submitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-surface-container text-on-surface hover:bg-surface-container-low transition-all cursor-pointer disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Chọn lại
          </button>
          <button
            onClick={() => onSubmit(exercise.id)}
            disabled={state.submitting || state.isAnalyzing}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white transition-all shadow-sm cursor-pointer disabled:opacity-50 dark:bg-cyan-400 dark:bg-none dark:text-slate-950 dark:hover:bg-cyan-300 dark:shadow-[0_12px_30px_rgba(34,211,238,0.24)]"
          >
            {state.submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Xác nhận nộp bài
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

function AnalyzingSlide() {
  const [progressIndex, setProgressIndex] = useState(0);
  const steps = [
    { icon: ImageIcon, label: "Đọc dữ liệu cấu hình...", color: "text-indigo-500" },
    { icon: BrainCircuit, label: "AI phân tích linh kiện...", color: "text-violet-500" },
    { icon: Zap, label: "Thẩm định cấu hình...", color: "text-amber-500" },
    { icon: ShieldCheck, label: "Đánh giá tổng quan...", color: "text-emerald-500" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgressIndex(prev => Math.min(prev + 1, steps.length - 1));
    }, 2000);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center justify-center py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center ring-4 ring-indigo-50 dark:bg-cyan-300/10 dark:bg-none dark:ring-cyan-300/10 dark:border dark:border-cyan-300/20"
      >
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin dark:text-cyan-300" />
      </motion.div>

      <div className="space-y-3 w-full max-w-sm">
        {steps.map((step, i) => {
          const isActive = i === progressIndex;
          const isDone = i < progressIndex;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{
                opacity: isActive ? 1 : isDone ? 0.6 : 0.4,
                x: 0,
              }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                isActive
                  ? "border-indigo-200 bg-indigo-50 shadow-sm dark:border-cyan-300/25 dark:bg-cyan-300/10"
                  : isDone
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-300/25 dark:bg-emerald-300/10"
                  : "border-surface-container-high bg-surface-container-low dark:border-white/10 dark:bg-white/[0.05]"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                isActive ? "bg-indigo-100 dark:bg-cyan-300/15" : isDone ? "bg-emerald-100 dark:bg-emerald-300/15" : "bg-surface-mid dark:bg-white/10"
              )}>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <step.icon className={cn("w-4 h-4", isActive ? step.color : "text-on-muted dark:text-slate-500")} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-xs font-bold transition-all",
                  isActive ? "text-indigo-700 dark:text-cyan-100" : isDone ? "text-emerald-700 dark:text-emerald-100" : "text-on-muted dark:text-slate-500"
                )}>
                  {step.label}
                </p>
              </div>
              {isActive && (
                <motion.div
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin dark:text-cyan-300" />
                </motion.div>
              )}
              {isDone && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              )}
            </motion.div>
          );
        })}
      </div>

      <motion.p
        key={progressIndex}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs text-on-muted text-center max-w-xs dark:text-slate-400"
      >
        {progressIndex === 0 && "Đang đọc thông tin linh kiện từ ảnh/file của bạn..."}
        {progressIndex === 1 && "AI đang phân loại và xác định từng linh kiện..."}
        {progressIndex === 2 && "Đang kiểm tra sự tương thích giữa các linh kiện..."}
        {progressIndex === 3 && "Sắp hoàn tất, chuẩn bị kết quả..."}
      </motion.p>
    </div>
  );
}

function ResultSlide({
  state,
  exercise,
  onCancel,
  onClose,
}: {
  state: ExerciseState;
  exercise: Exercise;
  onCancel: (exId: string) => Promise<void>;
  onClose: () => void;
}) {
  const isApproved = isApprovedStatus(state.status) || state.isApproved;
  const isRejected = isRejectedStatus(state.status);
  const st = STATUS_CONFIG[state.status || (isApproved ? "APPROVED" : "PENDING")] || STATUS_CONFIG.PENDING;
  const hasCompatibilityChecks = state.compatibilityChecks && Object.keys(state.compatibilityChecks).length > 0;

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <motion.div
        variants={FADE_UP}
        className={cn(
          "flex items-center justify-between gap-3 p-4 rounded-xl border",
          isApproved
            ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-300/10 dark:border-emerald-300/25"
            : isRejected
            ? "bg-rose-50 border-rose-200 dark:bg-rose-300/10 dark:border-rose-300/25"
            : "bg-amber-50 border-amber-200 dark:bg-amber-300/10 dark:border-amber-300/25"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            isApproved ? "bg-emerald-100 dark:bg-emerald-300/15" : isRejected ? "bg-rose-100 dark:bg-rose-300/15" : "bg-amber-100 dark:bg-amber-300/15"
          )}>
            {isApproved ? (
              <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
            ) : isRejected ? (
              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-300" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-300" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface dark:text-slate-50">
              {isApproved ? "Hoàn tất thẩm định" : isRejected ? "Yêu cầu hiệu chỉnh" : "Đang thẩm định"}
            </p>
            {state.approvalReason && (
              <p className="text-xs text-on-muted mt-0.5 leading-relaxed dark:text-slate-300/85">
                <span className="font-semibold text-on-surface dark:text-slate-200">Nhận xét: </span>
                {state.approvalReason}
              </p>
            )}
          </div>
        </div>
        <span className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border shrink-0",
          isApproved
            ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-300/15 dark:text-emerald-100 dark:border-emerald-300/25"
            : isRejected
            ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-300/15 dark:text-rose-100 dark:border-rose-300/25"
            : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-300/15 dark:text-amber-100 dark:border-amber-300/25"
        )}>
          {st.icon}
          {st.label}
        </span>
      </motion.div>

      {/* Image preview */}
      {state.previewImage && (
        <motion.div variants={FADE_UP} className="rounded-xl overflow-hidden border border-surface-container-high bg-black/5 flex items-center justify-center dark:border-white/10 dark:bg-slate-950/45">
          <img src={state.previewImage} alt="Submitted" className="w-full object-contain max-h-[160px]" />
        </motion.div>
      )}

      {/* Compatibility checklist */}
      {hasCompatibilityChecks && (
        <motion.div variants={FADE_UP} className="rounded-xl border border-surface-container-high bg-surface-container-low p-3.5 space-y-2 dark:border-white/10 dark:bg-white/[0.06]">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-on-muted flex items-center gap-1 dark:text-slate-400">
            <ShieldCheck className="h-3 w-3 text-emerald-500 dark:text-emerald-300" />
            Báo cáo thẩm định cấu hình
          </p>
          <div className="space-y-1.5">
            {getOrderedChecks(state.compatibilityChecks).map(([key, check]: any, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-2 items-start text-xs"
              >
                {renderCheckIcon(check.status)}
                <span className="text-on-muted dark:text-slate-300">
                  <span className="font-semibold text-on-surface dark:text-slate-100">
                    {CHECK_LABELS[key] || key}:
                  </span>{" "}
                  {check.message}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Parts list */}
      {state.extractedParts && (Array.isArray(state.extractedParts) ? state.extractedParts.length > 0 : Object.keys(state.extractedParts).length > 0) && (
        <motion.div variants={FADE_UP} className="rounded-xl border border-surface-container-high bg-surface-container-low p-3.5 space-y-2 dark:border-white/10 dark:bg-white/[0.06]">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-on-muted dark:text-slate-400">
            Linh kiện ({Array.isArray(state.extractedParts) ? state.extractedParts.length : Object.keys(state.extractedParts).length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {(Array.isArray(state.extractedParts) ? state.extractedParts : Object.entries(state.extractedParts)).map((part: any, i: number) => {
              const cat = Array.isArray(state.extractedParts) ? part.category || "" : part[0];
              const p = Array.isArray(state.extractedParts) ? part : part[1];
              return (
                <motion.div
                  key={cat || i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between rounded-lg bg-white border border-surface-container-high px-3 py-2 dark:bg-slate-950/35 dark:border-white/10"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-on-muted truncate dark:text-slate-500">
                      {CATEGORY_LABELS[cat] || cat}
                    </p>
                    <p className="text-xs font-semibold text-on-surface truncate dark:text-slate-100">{p.name}</p>
                  </div>
                  {p.price > 0 && (
                    <p className="text-xs font-bold text-primary ml-2 shrink-0 dark:text-cyan-200">{formatVND(p.price)}</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Rejected: show edit button */}
      {isRejected && (
        <motion.div variants={FADE_UP} className="flex justify-end gap-2 pt-1">
          <button
            onClick={() => onCancel(exercise.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-surface-container text-on-surface hover:bg-surface-container-low transition-all cursor-pointer dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Làm lại bài này
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white transition-all cursor-pointer dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
          >
            Đóng
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}

      {/* Approved: close button only */}
      {!isRejected && (
        <motion.div variants={FADE_UP} className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white transition-all cursor-pointer dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
          >
            Hoàn tất
            <CheckCircle2 className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </div>
  );
}

function PendingSlide({ state, exercise, onCancel, onClose }: {
  state: ExerciseState;
  exercise: Exercise;
  onCancel: (exId: string) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-6 space-y-5">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center ring-4 ring-amber-50 dark:bg-amber-300/[0.12] dark:ring-amber-300/10 dark:border dark:border-amber-300/25"
      >
        <Clock className="w-10 h-10 text-amber-600 dark:text-amber-300" />
      </motion.div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold text-on-surface dark:text-slate-50">Đang thẩm định</h3>
        <p className="text-xs text-on-muted max-w-xs mx-auto leading-relaxed dark:text-slate-400">
          Cấu hình đã được ghi nhận và đang được đối chiếu với yêu cầu đề bài, tiêu chí tương thích kỹ thuật và giới hạn ngân sách.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onCancel(exercise.id)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-surface-container text-on-surface hover:bg-surface-container-low transition-all cursor-pointer dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Sửa cấu hình
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white transition-all cursor-pointer dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

// ─── Generate animation ─────────────────────────────────────────────────────────
function GeneratingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center ring-4 ring-indigo-50 dark:bg-cyan-300/10 dark:ring-cyan-300/10 dark:border dark:border-cyan-300/20"
      >
        <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse dark:text-cyan-300" />
      </motion.div>

      <div className="w-full max-w-xs space-y-3">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "100%", opacity: 1 }}
            transition={{ duration: 0.6, delay: i * 0.3, ease: "circOut" }}
            className="flex gap-3 items-center"
          >
            <div className="h-4 w-1/4 rounded-md bg-slate-200 dark:bg-white/10" />
            <div className="h-4 w-3/4 rounded-md bg-indigo-100 border border-indigo-200 dark:bg-cyan-300/10 dark:border-cyan-300/20" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Modal ─────────────────────────────────────────────────────────────────
export default function PcExerciseModal({
  exercise,
  state,
  isOpen,
  onClose,
  onImageSelect,
  onSubmit,
  onCancel,
  onFetchData,
  updateState,
  fileInputRef,
}: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [explanation, setExplanation] = useState(state.explanation || "");

  // Listen for explanation updates from UploadSlide
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.exId === exercise.id) {
        setExplanation(detail.explanation);
        updateState({ explanation: detail.explanation });
      }
    };
    window.addEventListener("pc-exercise-explanation", handler);
    return () => window.removeEventListener("pc-exercise-explanation", handler);
  }, [exercise.id, updateState]);

  // Determine initial step based on exercise state
  useEffect(() => {
    if (!isOpen) return;

    // Sync explanation from state
    setExplanation(state.explanation || "");

    if (state.isAnalyzing) {
      setStep(100); // Analyzing mode
    } else if (state.extractedParts || state.compatibilityChecks || isApprovedStatus(state.status) || state.status === "REJECTED") {
      setStep(101); // Result mode
    } else if (state.status === "PENDING" && state.submission_id) {
      setStep(102); // Pending mode — must check before previewImage
    } else if (state.previewImage) {
      setStep(1); // Already uploaded, go to upload step
    } else {
      setStep(0); // Start at overview
    }
  }, [isOpen, state.isAnalyzing, state.extractedParts, state.compatibilityChecks, state.status, state.previewImage, state.submission_id, state.explanation]);

  const navigate = (delta: number) => {
    setDir(delta);
    setStep(s => s + delta);
  };

  // The step determines which content to show
  // 0 = Overview
  // 1 = Upload
  // 100 = Analyzing
  // 101 = Results
  // 102 = Pending
  const showNavigator = step < 100; // Only show nav for onboarding steps
  const isLastOnboardingStep = step === 1; // Upload is the last onboarding step

  const totalOnboardingSteps = 2; // Overview + Upload

  // Custom close handler: cancel if draft
  const handleClose = useCallback(() => {
    if (state.isDraft && state.previewImage && !state.submitting && !state.isAnalyzing) {
      onCancel(exercise.id);
    }
    onClose();
  }, [state.isDraft, state.previewImage, state.submitting, state.isAnalyzing, onCancel, exercise.id, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 dark:bg-slate-950/75 dark:backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 20 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col dark:border dark:border-white/10 dark:bg-[#101a35] dark:text-slate-100 dark:shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-0 dark:opacity-100 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_46%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_42%)]" />
        {/* ── Header ── */}
        <div className="relative shrink-0 flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-sm dark:bg-cyan-300/15 dark:bg-none dark:border dark:border-cyan-300/25">
              <Cpu className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-on-surface truncate font-manrope dark:text-slate-50">{exercise.title}</h2>
              <p className="text-[10px] text-on-muted truncate dark:text-slate-400">
                {DIFFICULTY_LABEL[exercise.difficulty] || exercise.difficulty} · {formatVND(exercise.requirements.budget)}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-muted hover:text-on-surface hover:bg-surface-mid transition-all cursor-pointer shrink-0 dark:text-slate-400 dark:hover:text-slate-50 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="relative flex-1 overflow-y-auto px-6 py-4">
          {/* Onboarding steps (0-1) */}
          {step < 100 && (
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={`onboarding-${step}`}
                custom={dir}
                variants={SLIDE_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                {/* Step 0: Overview */}
                {step === 0 && (
                  <motion.div variants={STAGGER_CHILDREN} initial="initial" animate="animate" className="space-y-4">
                    <OverviewSlide exercise={exercise} />
                  </motion.div>
                )}

                {/* Step 1: Upload */}
                {step === 1 && (
                  <motion.div variants={STAGGER_CHILDREN} initial="initial" animate="animate" className="space-y-4">
                    <UploadSlide
                      exercise={exercise}
                      state={{ ...state, explanation }}
                      fileInputRef={fileInputRef}
                      onImageSelect={onImageSelect}
                      onSubmit={onSubmit}
                      onCancel={onCancel}
                    />
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Analyzing mode */}
          {step === 100 && (
            <AnalyzingSlide />
          )}

          {/* Result mode */}
          {step === 101 && (
            <AnimatePresence mode="wait">
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ResultSlide state={state} exercise={exercise} onCancel={onCancel} onClose={handleClose} />
              </motion.div>
            </AnimatePresence>
          )}

          {/* Pending mode */}
          {step === 102 && (
            <AnimatePresence mode="wait">
              <motion.div
                key="pending"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <PendingSlide state={state} exercise={exercise} onCancel={onCancel} onClose={handleClose} />
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* ── Navigation (onboarding only) ── */}
        {showNavigator && (
          <div className="relative shrink-0 flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-white/10 dark:bg-slate-950/20">
            <button
              onClick={() => navigate(-1)}
              disabled={step === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-on-muted hover:text-on-surface hover:bg-surface-mid transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer dark:text-slate-400 dark:hover:text-slate-50 dark:hover:bg-white/10"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Quay lại
            </button>

            {/* Step dots */}
            <div className="flex gap-1.5">
              {Array.from({ length: totalOnboardingSteps }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === step ? "w-5 bg-indigo-500 dark:bg-cyan-300" : "w-1.5 bg-slate-200 dark:bg-white/20"
                  )}
                />
              ))}
            </div>

            {isLastOnboardingStep ? (
              <div className="w-20" /> // Spacer to balance
            ) : (
              <button
                onClick={() => navigate(1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm cursor-pointer dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
              >
                Tiếp theo
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
