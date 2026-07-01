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
  PENDING: { label: "Chờ duyệt", icon: <Clock className="h-3.5 w-3.5" />, className: "text-amber-200 bg-amber-400/10" },
  APPROVED: { label: "Đã duyệt", icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "text-emerald-200 bg-emerald-400/10" },
  REJECTED: { label: "Từ chối", icon: <XCircle className="h-3.5 w-3.5" />, className: "text-rose-200 bg-rose-400/10" },
  AUTO_APPROVED: { label: "Tự duyệt", icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "text-emerald-200 bg-emerald-400/10" },
  ANALYZING: { label: "Đang xử lý...", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, className: "text-amber-200 bg-amber-400/10" },
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

// ─── Sub-components ─────────────────────────────────────────────────────────────

function OverviewSlide({ exercise }: { exercise: Exercise }) {
  return (
    <motion.div variants={FADE_UP} className="space-y-5">
      <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <h4 className="font-manrope text-xs font-bold text-cyan-200 uppercase tracking-wider flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5" />
          Mô tả đề bài
        </h4>
        <p className="font-inter text-sm text-slate-100/85 leading-relaxed">{exercise.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div variants={FADE_UP} className="rounded-xl border border-white/10 bg-white/[0.06] p-3.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Ngân sách</p>
          <p className="font-manrope text-lg font-extrabold text-cyan-200">{formatVND(exercise.requirements.budget)}</p>
        </motion.div>
        <motion.div variants={FADE_UP} className="rounded-xl border border-white/10 bg-white/[0.06] p-3.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Độ khó</p>
          <span className={cn(
            "inline-block rounded-md px-2 py-0.5 text-[11px] font-extrabold border",
            exercise.difficulty === "easy" ? "border-emerald-300/30 text-emerald-200 bg-emerald-400/10" :
            exercise.difficulty === "medium" ? "border-amber-300/30 text-amber-200 bg-amber-400/10" :
            "border-rose-300/30 text-rose-200 bg-rose-400/10"
          )}>
            {DIFFICULTY_LABEL[exercise.difficulty] || exercise.difficulty}
          </span>
        </motion.div>
      </div>

      {exercise.requirements.constraints.length > 0 && (
        <motion.div variants={FADE_UP} className="rounded-xl border border-white/10 bg-white/[0.06] p-3.5 space-y-1.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-300" />
            Ghi chú ràng buộc
          </p>
          <ul className="space-y-1">
            {exercise.requirements.constraints.map((c, i) => (
              <motion.li
                key={i}
                variants={FADE_UP}
                className="flex items-start gap-2 text-xs text-slate-200/80"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300/70 mt-1.5 shrink-0" />
                {c}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {exercise.requirements.hints.length > 0 && (
        <motion.div variants={FADE_UP} className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-3.5 space-y-1.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-200 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Gợi ý
          </p>
          <ul className="space-y-1">
            {exercise.requirements.hints.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-amber-100/85 italic">
                <span className="text-amber-300 mt-0.5">💡</span>
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
          className="flex flex-col items-center justify-center border-2 border-dashed border-cyan-300/25 rounded-2xl bg-cyan-300/[0.07] hover:bg-cyan-300/[0.11] p-8 text-center cursor-pointer transition-all hover:border-cyan-300/55 min-h-[200px] group"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <UploadCloud className="h-10 w-10 text-cyan-300/80 group-hover:text-cyan-200 transition-colors mb-3" />
          </motion.div>
          <p className="text-sm font-bold text-slate-50 mb-1">Tải lên ảnh cấu hình máy tính</p>
          <p className="text-xs text-slate-400 mb-4">Chọn ảnh chụp báo giá</p>

          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] border border-white/10 px-3 py-1.5 text-[10px] font-semibold text-slate-300 shadow-sm">
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
          className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-950/45 p-2 min-h-[200px] flex items-center justify-center"
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
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-xs font-inter text-slate-100 placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-300/30 min-h-[60px]"
          />
        </motion.div>
      )}

      {/* Action buttons */}
      {state.previewImage && (
        <motion.div variants={FADE_UP} className="flex justify-end gap-2 pt-1">
          <button
            onClick={() => onCancel(exercise.id)}
            disabled={state.submitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-200 hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Chọn lại
          </button>
          <button
            onClick={() => onSubmit(exercise.id)}
            disabled={state.submitting || state.isAnalyzing}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-all shadow-[0_12px_30px_rgba(34,211,238,0.24)] cursor-pointer disabled:opacity-50"
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
    { icon: Zap, label: "Kiểm tra tương thích...", color: "text-amber-500" },
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
        className="w-20 h-20 rounded-2xl bg-cyan-300/10 flex items-center justify-center ring-4 ring-cyan-300/10 border border-cyan-300/20"
      >
        <Loader2 className="w-10 h-10 text-cyan-300 animate-spin" />
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
                  ? "border-cyan-300/25 bg-cyan-300/10 shadow-sm"
                  : isDone
                  ? "border-emerald-300/25 bg-emerald-300/10"
                  : "border-white/10 bg-white/[0.05]"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                isActive ? "bg-cyan-300/15" : isDone ? "bg-emerald-300/15" : "bg-white/10"
              )}>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <step.icon className={cn("w-4 h-4", isActive ? step.color : "text-slate-500")} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-xs font-bold transition-all",
                  isActive ? "text-cyan-100" : isDone ? "text-emerald-100" : "text-slate-500"
                )}>
                  {step.label}
                </p>
              </div>
              {isActive && (
                <motion.div
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Loader2 className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
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
        className="text-xs text-slate-400 text-center max-w-xs"
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
            ? "bg-emerald-300/10 border-emerald-300/25"
            : isRejected
            ? "bg-rose-300/10 border-rose-300/25"
            : "bg-amber-300/10 border-amber-300/25"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            isApproved ? "bg-emerald-300/15" : isRejected ? "bg-rose-300/15" : "bg-amber-300/15"
          )}>
            {isApproved ? (
              <Trophy className="h-5 w-5 text-emerald-300" />
            ) : isRejected ? (
              <AlertTriangle className="h-5 w-5 text-rose-300" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-300" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-50">
              {isApproved ? "Hoàn thành" : isRejected ? "Cần điều chỉnh" : "Đang chờ duyệt"}
            </p>
            {state.approvalReason && (
              <p className="text-xs text-slate-300/85 mt-0.5 leading-relaxed">{state.approvalReason}</p>
            )}
          </div>
        </div>
        <span className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border shrink-0",
          isApproved
            ? "bg-emerald-300/15 text-emerald-100 border-emerald-300/25"
            : isRejected
            ? "bg-rose-300/15 text-rose-100 border-rose-300/25"
            : "bg-amber-300/15 text-amber-100 border-amber-300/25"
        )}>
          {st.icon}
          {st.label}
        </span>
      </motion.div>

      {/* Image preview */}
      {state.previewImage && (
        <motion.div variants={FADE_UP} className="rounded-xl overflow-hidden border border-white/10 bg-slate-950/45 flex items-center justify-center">
          <img src={state.previewImage} alt="Submitted" className="w-full object-contain max-h-[160px]" />
        </motion.div>
      )}

      {/* Compatibility checklist */}
      {hasCompatibilityChecks && (
        <motion.div variants={FADE_UP} className="rounded-xl border border-white/10 bg-white/[0.06] p-3.5 space-y-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-300" />
            Kiểm tra tương thích
          </p>
          <div className="space-y-1.5">
            {Object.entries(state.compatibilityChecks).map(([key, check]: any, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-2 items-start text-xs"
              >
                {renderCheckIcon(check.status)}
                <span className="text-slate-300">{check.message}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Parts list */}
      {state.extractedParts && (Array.isArray(state.extractedParts) ? state.extractedParts.length > 0 : Object.keys(state.extractedParts).length > 0) && (
        <motion.div variants={FADE_UP} className="rounded-xl border border-white/10 bg-white/[0.06] p-3.5 space-y-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
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
                  className="flex items-center justify-between rounded-lg bg-slate-950/35 border border-white/10 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">
                      {CATEGORY_LABELS[cat] || cat}
                    </p>
                    <p className="text-xs font-semibold text-slate-100 truncate">{p.name}</p>
                  </div>
                  {p.price > 0 && (
                    <p className="text-xs font-bold text-cyan-200 ml-2 shrink-0">{formatVND(p.price)}</p>
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-200 hover:bg-white/10 transition-all cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Làm lại bài này
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-all cursor-pointer"
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
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-all cursor-pointer"
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
        className="w-20 h-20 rounded-2xl bg-amber-300/[0.12] flex items-center justify-center ring-4 ring-amber-300/10 border border-amber-300/25"
      >
        <Clock className="w-10 h-10 text-amber-300" />
      </motion.div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold text-slate-50">Đang chờ duyệt</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
          Cấu hình của bạn đã được ghi nhận và đang chờ hệ thống AI xem xét. Bạn sẽ nhận được thông báo khi có kết quả.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onCancel(exercise.id)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-200 hover:bg-white/10 transition-all cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Sửa cấu hình
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-all cursor-pointer"
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
        className="w-16 h-16 rounded-2xl bg-cyan-300/10 flex items-center justify-center ring-4 ring-cyan-300/10 border border-cyan-300/20"
      >
        <Sparkles className="w-8 h-8 text-cyan-300 animate-pulse" />
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
            <div className="h-4 w-1/4 rounded-md bg-white/10" />
            <div className="h-4 w-3/4 rounded-md bg-cyan-300/10 border border-cyan-300/20" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4">
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 20 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#101a35] text-slate-100 shadow-[0_24px_80px_rgba(0,0,0,0.55)] max-h-[90vh] flex flex-col"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_46%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_42%)]" />
        {/* ── Header ── */}
        <div className="relative shrink-0 flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-300/15 border border-cyan-300/25 flex items-center justify-center shrink-0 shadow-sm">
              <Cpu className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-50 truncate font-manrope">{exercise.title}</h2>
              <p className="text-[10px] text-slate-400 truncate">
                {DIFFICULTY_LABEL[exercise.difficulty] || exercise.difficulty} · {formatVND(exercise.requirements.budget)}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-50 hover:bg-white/10 transition-all cursor-pointer shrink-0"
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
          <div className="relative shrink-0 flex items-center justify-between px-6 py-4 border-t border-white/10 bg-slate-950/20">
            <button
              onClick={() => navigate(-1)}
              disabled={step === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-50 hover:bg-white/10 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
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
                    i === step ? "w-5 bg-cyan-300" : "w-1.5 bg-white/20"
                  )}
                />
              ))}
            </div>

            {isLastOnboardingStep ? (
              <div className="w-20" /> // Spacer to balance
            ) : (
              <button
                onClick={() => navigate(1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-all shadow-sm cursor-pointer"
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
