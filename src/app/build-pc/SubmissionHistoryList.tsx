"use client";

import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Cpu,
  AlertTriangle,
  Loader2,
  RotateCcw,
  ZoomIn,
  X as XIcon,
  CheckCheck,
  MessageSquare,
  ChevronDown,
  CalendarDays,
  ArrowRight,
  Pencil,
  Info,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatVND } from "@/lib/pc-kho";

/* ─────────────────────────────────────────
   Types
   ───────────────────────────────────────── */
interface Part {
  category?: string;
  name: string;
  price: number;
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
    requirements?: { budget?: number };
  };
}

interface Props {
  history: Submission[];
  onCancelExercise?: (exerciseId: string) => void;
  initialSubmissionId?: string | null;
}

/* ─────────────────────────────────────────
   Constants
   ───────────────────────────────────────── */
const CATEGORY_ORDER = [
  "cpu","mainboard","ram","vga","ssd","psu",
  "case","cooler_fan","monitor","keyboard_mouse","headphone","desk_chair",
];
const CATEGORY_LABELS: Record<string,string> = {
  cpu:"CPU", mainboard:"Mainboard", ram:"RAM", vga:"VGA",
  ssd:"SSD / HDD", psu:"Nguồn (PSU)", case:"Vỏ máy (Case)",
  cooler_fan:"Tản nhiệt", monitor:"Màn hình",
  keyboard_mouse:"Bàn phím & Chuột", headphone:"Tai nghe", desk_chair:"Bàn ghế",
};
const CHECK_LABELS: Record<string,string> = {
  socket:"Socket CPU / Mainboard", ram:"RAM tương thích",
  power:"Công suất nguồn (PSU)", case:"Vỏ case / Mainboard", budget:"Ngân sách",
};
const DIFFICULTY_CONFIG: Record<string,{label:string;cls:string}> = {
  easy:   {label:"Dễ",         cls:"bg-emerald-50 text-emerald-700 border-emerald-200"},
  medium: {label:"Trung bình", cls:"bg-amber-50 text-amber-700 border-amber-200"},
  hard:   {label:"Khó",        cls:"bg-rose-50 text-rose-700 border-rose-200"},
};

/* ─────────────────────────────────────────
   Helpers
   ───────────────────────────────────────── */
function getParts(pa: any): Part[] {
  const SKIP = new Set([
    "total_price","checks","reason","is_analyzing","explanation","is_draft",
    "is_approved","temp_ai_score","temp_ai_feedback","extracted_raw",
    "analysis_step","analysis_message","error","reviewed_locally_at",
  ]);
  let raw: Part[] = [];
  if (Array.isArray(pa)) raw = pa;
  else if (Array.isArray(pa?.parts)) raw = pa.parts;
  else if (pa && typeof pa === "object") {
    raw = Object.entries(pa)
      .filter(([k,v]) => !SKIP.has(k) && v && typeof v==="object" && (v as any).name)
      .map(([category,v]) => ({
        category, name:(v as any).name, price:Number((v as any).price)||0,
      }));
  }
  return raw
    .filter(p => p.name)
    .sort((a,b) => {
      const ai = CATEGORY_ORDER.indexOf(a.category??"");
      const bi = CATEGORY_ORDER.indexOf(b.category??"");
      if (ai===-1&&bi===-1) return 0;
      if (ai===-1) return 1; if (bi===-1) return -1;
      return ai-bi;
    });
}

function getTotal(pa: any, parts: Part[]) {
  if (!Array.isArray(pa) && typeof pa?.total_price==="number") return pa.total_price;
  return parts.reduce((s,p) => s+p.price, 0);
}

function isApproved(s: string) { return s==="APPROVED"||s==="AUTO_APPROVED"; }

function fmtTime(iso: string) {
  const d = new Date(iso);
  const vn = new Date(d.getTime()+(7*60+d.getTimezoneOffset())*60000);
  return vn.toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"});
}

function fmtDateLabel(iso: string) {
  const d = new Date(iso);
  const vn = new Date(d.getTime()+(7*60+d.getTimezoneOffset())*60000);
  return {
    key: vn.toISOString().slice(0,10),
    label: vn.toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"}),
  };
}

function groupByDate(items: Submission[]) {
  const groups: {dateKey:string; label:string; items:Submission[]}[] = [];
  for (const s of items) {
    const {key,label} = fmtDateLabel(s.submitted_at);
    const g = groups.find(x => x.dateKey===key);
    if (g) g.items.push(s); else groups.push({dateKey:key,label,items:[s]});
  }
  return groups;
}

/* ─────────────────────────────────────────
   Animated price counter
   ───────────────────────────────────────── */
function AnimatedPrice({target, delay=0}:{target:number;delay?:number}) {
  const [disp, setDisp] = useState(0);
  const raf = useRef<number|null>(null);
  useEffect(() => {
    let start: number|null = null;
    const dur = 900;
    const t = setTimeout(() => {
      const step = (ts:number) => {
        if (!start) start=ts;
        const p = Math.min((ts-start)/dur,1);
        setDisp(Math.round((1-Math.pow(1-p,3))*target));
        if (p<1) raf.current=requestAnimationFrame(step);
      };
      raf.current=requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(t); if(raf.current) cancelAnimationFrame(raf.current); };
  },[target,delay]);
  return <>{formatVND(disp)}</>;
}

/* ─────────────────────────────────────────
   Image Lightbox
   ───────────────────────────────────────── */
function Lightbox({src,onClose}:{src:string;onClose:()=>void}) {
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};
    document.addEventListener("keydown",h);
    return ()=>document.removeEventListener("keydown",h);
  },[onClose]);
  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      onClick={onClose}
    >
      <motion.div
        className="relative max-h-[90vh] max-w-[92vw]"
        initial={{scale:0.82,opacity:0}}
        animate={{scale:1,opacity:1}}
        exit={{scale:0.82,opacity:0}}
        transition={{type:"spring",stiffness:320,damping:26}}
        onClick={e=>e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Preview" className="rounded-2xl max-h-[86vh] max-w-[88vw] object-contain shadow-2xl"/>
        <button
          onClick={onClose}
          className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-100 cursor-pointer"
        >
          <XIcon className="h-4 w-4 text-gray-700"/>
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   Check status icon
   ───────────────────────────────────────── */
function CkIcon({status}:{status:string}) {
  if (status==="PASS") return <CheckCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500"/>;
  if (status==="FAIL") return <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-500"/>;
  return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500"/>;
}

/* ─────────────────────────────────────────
   Mini score ring (smaller version for rows)
   ───────────────────────────────────────── */
function MiniScoreRing({score}:{score:number}) {
  const r=14, circ=2*Math.PI*r, dash=(score/100)*circ;
  return (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      <svg width={36} height={36} className="-rotate-90" viewBox="0 0 36 36">
        <circle cx={18} cy={18} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-emerald-100"/>
        <circle cx={18} cy={18} r={r} fill="none" stroke="currentColor" strokeWidth={3}
          strokeLinecap="round" className="text-emerald-500"
          strokeDasharray={`${dash} ${circ}`}
        />
      </svg>
      <span className="absolute text-[8px] font-extrabold text-emerald-700">{score}</span>
    </div>
  );
}

/* ─────────────────────────────────────────
   Detail Modal (redesigned)
   ───────────────────────────────────────── */
function DetailModal({submission, onClose, onCancelExercise}:{submission:Submission;onClose:()=>void;onCancelExercise?:(exerciseId:string)=>void}) {
  const [lightbox, setLightbox] = useState<string|null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const parts = getParts(submission.parts_answer);
  const total = getTotal(submission.parts_answer, parts);
  const partsObj = !Array.isArray(submission.parts_answer)&&typeof submission.parts_answer==="object"
    ? submission.parts_answer as any : null;

  const budget = submission.exercise?.requirements?.budget ?? 0;
  const hasBudget = budget > 0;
  const budgetLimit = hasBudget ? Math.floor(budget * 1.02) : 0;
  const overBaseBudget = hasBudget && total > budget;
  const overBudget = hasBudget && total > budgetLimit;
  const overBaseAmount = hasBudget ? Math.max(total - budget, 0) : 0;
  const overLimitAmount = hasBudget ? Math.max(total - budgetLimit, 0) : 0;
  const imageUrl = Array.isArray(submission.image_urls) ? submission.image_urls[0] : null;

  const approved  = isApproved(submission.status);
  const rejected  = submission.status==="REJECTED";
  const pending   = submission.status==="PENDING";
  const analyzing = partsObj?.is_analyzing===true;

  const score  = submission.ai_score;
  const reason = partsObj?.reason || submission.ai_feedback || "";
  const checks: Record<string,{status:string;message:string}> = partsObj?.checks || {};
  const hasChecks = Object.keys(checks).length>0;

  const diffConf = DIFFICULTY_CONFIG[submission.exercise.difficulty] || DIFFICULTY_CONFIG.medium;

  const scoreColor = score == null ? "" : score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-500" : "text-red-500";
  const totalColor = overBudget ? "text-red-500" : overBaseBudget ? "text-amber-500" : "text-on-surface";
  const remainingColor = !hasBudget ? "text-neutral-400" : overBudget ? "text-red-500" : overBaseBudget ? "text-amber-500" : "text-emerald-600";

  // Close on Escape
  useEffect(() => {
    const h = (e:KeyboardEvent) => { if(e.key==="Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-8 pb-8 overflow-y-auto"
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      transition={{duration:0.15}}
      onClick={onClose}
    >
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        initial={{opacity:0,y:12,scale:0.98}}
        animate={{opacity:1,y:0,scale:1}}
        exit={{opacity:0,y:8,scale:0.98}}
        transition={{duration:0.2,ease:"easeOut"}}
        className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-[600px] mx-4 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e=>e.stopPropagation()}
      >
        {/* ══ Section 1 — Header (sticky) ══ */}
        <div className="sticky top-0 bg-white dark:bg-neutral-900 z-10 px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
              <Cpu className="h-[18px] w-[18px] text-violet-600 dark:text-violet-400"/>
            </div>
            <div className="min-w-0">
              <h2 id="modal-title" className="text-[15px] font-medium text-on-surface dark:text-neutral-100 truncate">
                {submission.exercise.title}
              </h2>
              <p className="text-[13px] text-neutral-400 dark:text-neutral-500 truncate">
                {diffConf.label} · tối đa {budget>0 ? budget.toLocaleString("vi-VN")+"₫ (+2%)" : "—"}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Đóng"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
            <XIcon className="h-4 w-4 text-neutral-400"/>
          </button>
        </div>

        {/* ══ Section 2 — 3 Metric cards ══ */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="grid grid-cols-3 gap-2 px-5 pt-4">
          {/* Card 1 — Score */}
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800 p-3 text-center">
            <p className={cn("text-lg font-bold leading-none", scoreColor)}>
              {pending ? "—" : score != null ? `${score}/100` : "—"}
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
              {pending ? "Chờ chấm điểm" : "Điểm admin"}
            </p>
          </div>

          {/* Card 2 — Total */}
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800 p-3 text-center">
            <p className={cn("text-lg font-bold leading-none", totalColor)}>
              {total.toLocaleString("vi-VN")}₫
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">Tổng linh kiện</p>
          </div>

          {/* Card 3 — Budget comparison */}
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800 p-3 text-center">
            <p className={cn("text-lg font-bold leading-none", remainingColor)}>
              {!hasBudget ? "—" : overBudget ? overLimitAmount.toLocaleString("vi-VN")+"₫" : overBaseBudget ? overBaseAmount.toLocaleString("vi-VN")+"₫" : "0₫"}
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
              {!hasBudget ? "Không có ngân sách" : overBudget ? "Vượt giới hạn 2%" : overBaseBudget ? "Trong ngưỡng 2%" : "Trong ngân sách"}
            </p>
          </div>
        </div>

        {/* ══ Section 3 — Banner ══ */}
        {pending ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 px-4 py-3 mx-5 mt-3">
            <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5"/>
            <div>
              <p className="text-[13px] font-medium text-blue-700 dark:text-blue-300">Đang chờ hệ thống AI duyệt</p>
              <p className="text-[12px] text-blue-600 dark:text-blue-400 mt-0.5">
                Kết quả và điểm số sẽ xuất hiện sau khi được phê duyệt.
              </p>
            </div>
          </div>
        ) : overBudget ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3 mx-5 mt-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5"/>
            <div>
              <p className="text-[13px] font-medium text-red-700 dark:text-red-300">
                Vượt giới hạn 2% {overLimitAmount.toLocaleString("vi-VN")}₫
              </p>
              <p className="text-[12px] text-red-600 dark:text-red-400 mt-0.5">
                Cấu hình cần giảm chi phí để được duyệt tự động.
              </p>
            </div>
          </div>
        ) : overBaseBudget ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-4 py-3 mx-5 mt-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5"/>
            <div>
              <p className="text-[13px] font-medium text-amber-700 dark:text-amber-300">
                Vượt nhẹ ngân sách {overBaseAmount.toLocaleString("vi-VN")}₫
              </p>
              <p className="text-[12px] text-amber-600 dark:text-amber-400 mt-0.5">
                Mức này vẫn nằm trong ngưỡng cho phép 2%.
              </p>
            </div>
          </div>
        ) : null}

        {/* ══ Section 4 — Compatibility checks ══ */}
        {hasChecks && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-5 pt-4 pb-2">
              Kiểm tra tương thích
            </p>
            <div className="space-y-0">
              {Object.entries(checks).map(([key,chk],i) => (
                <div key={key}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl px-3 py-2.5 mx-5 mb-1.5",
                    chk.status==="PASS"&&"bg-green-50 dark:bg-green-950",
                    chk.status==="WARN"&&"bg-amber-50 dark:bg-amber-950",
                    chk.status==="FAIL"&&"bg-red-50 dark:bg-red-950",
                  )}
                >
                  {chk.status==="PASS" && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500 mt-0.5"/>}
                  {chk.status==="WARN" && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5"/>}
                  {chk.status==="FAIL" && <XCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5"/>}
                  <div>
                    <p className="text-[13px] font-medium text-on-surface dark:text-neutral-100">
                      {CHECK_LABELS[key]??key}
                    </p>
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">
                      {chk.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pending skeleton for compatibility */}
        {pending && !hasChecks && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-5 pt-4 pb-2">
              Kiểm tra tương thích
            </p>
            <div className="space-y-2 px-5">
              {[1,2,3].map(i => (
                <div key={i} className="animate-pulse flex gap-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 px-3 py-3 mx-0">
                  <div className="h-4 w-4 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0"/>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-1/3 rounded bg-neutral-200 dark:bg-neutral-700"/>
                    <div className="h-2.5 w-2/3 rounded bg-neutral-100 dark:bg-neutral-700"/>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══ Section 5 — Parts grid ══ */}
        {parts.length>0 && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-5 pt-4 pb-2">
              Linh kiện đã chọn · {parts.length} món
            </p>
            <div className="grid grid-cols-2 gap-1.5 px-5">
              {parts.map((p,i) => (
                <motion.div
                  key={`${p.category}-${i}`}
                  initial={{opacity:0,y:6}}
                  animate={{opacity:1,y:0}}
                  transition={{delay:i*0.06,duration:0.25}}
                  className="rounded-xl bg-neutral-50 dark:bg-neutral-800 px-3 py-2"
                >
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
                    {CATEGORY_LABELS[p.category??""]||p.category||"Linh kiện"}
                  </p>
                  <p className="text-[12px] text-neutral-800 dark:text-neutral-100 leading-snug mt-0.5 line-clamp-2">
                    {p.name}
                  </p>
                  <p className="text-[11px] text-blue-500 mt-1 font-medium">{p.price.toLocaleString("vi-VN")}₫</p>
                </motion.div>
              ))}
            </div>
            {/* Total row */}
            <div className={cn(
              "flex items-center justify-between rounded-xl px-4 py-2.5 mx-5 mt-1.5",
              overBudget ? "bg-red-50 dark:bg-red-950" : overBaseBudget ? "bg-amber-50 dark:bg-amber-950" : "bg-neutral-50 dark:bg-neutral-800"
            )}>
              <p className="text-[13px] font-medium text-on-surface dark:text-neutral-100">Tổng linh kiện</p>
              <p className={cn("text-[14px] font-medium", overBudget ? "text-red-500" : overBaseBudget ? "text-amber-500" : "text-on-surface dark:text-neutral-100")}>
                <AnimatedPrice target={total} delay={parts.length*60+100}/>
              </p>
            </div>
          </>
        )}

        {/* ══ Section 6 — Admin note ══ */}
        {reason && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-5 pt-4 pb-2">
              Nhận xét của admin
            </p>
            <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800 px-4 py-3 mx-5 mb-2">
              <p className="text-[13px] text-neutral-700 dark:text-neutral-300 leading-relaxed">{reason}</p>
            </div>
          </>
        )}

        </div> {/* end scrollable body */}

        {/* ══ Footer (sticky) ══ */}
        <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-5 py-3 flex items-center justify-between mt-2">
          {/* Status badge */}
          <span className={cn(
            "inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium border",
            pending && "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
            approved && "bg-green-50 text-green-600 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
            rejected && "bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
            analyzing&& "bg-neutral-50 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700",
          )}>
            {pending && <Clock className="h-3 w-3 mr-1"/>}
            {approved && <CheckCircle2 className="h-3 w-3 mr-1"/>}
            {rejected && <XCircle className="h-3 w-3 mr-1"/>}
            {analyzing && <Loader2 className="h-3 w-3 mr-1 animate-spin"/>}
            {pending ? "Đang chờ duyệt" : approved ? "Đã duyệt" : rejected ? "Không đạt" : analyzing ? "Đang phân tích" : ""}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="text-[13px] px-3 py-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
              Đóng
            </button>
            {(pending||rejected) && (
              <button
                onClick={() => {
                  onCancelExercise?.(submission.exercise_id);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 text-[13px] px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
              >
                <Pencil className="h-[13px] w-[13px]"/>
                Sửa cấu hình
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && <Lightbox src={lightbox} onClose={()=>setLightbox(null)}/>}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   Compact Row
   ───────────────────────────────────────── */
function HistoryRow({submission, onClick}:{submission:Submission;onClick:()=>void}) {
  const parts = getParts(submission.parts_answer);
  const total = getTotal(submission.parts_answer, parts);
  const partsObj = !Array.isArray(submission.parts_answer)&&typeof submission.parts_answer==="object"
    ? submission.parts_answer as any : null;

  const approved  = isApproved(submission.status);
  const rejected  = submission.status==="REJECTED";
  const pending   = submission.status==="PENDING";
  const analyzing = partsObj?.is_analyzing===true;

  const score = submission.ai_score;
  const diffConf = DIFFICULTY_CONFIG[submission.exercise.difficulty] || DIFFICULTY_CONFIG.medium;

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-surface-container-high bg-surface-mid px-4 py-3 text-left transition-all hover:border-primary/30 hover:shadow-sm cursor-pointer"
    >
      {/* Left: score / status */}
      {score != null ? (
        <MiniScoreRing score={score}/>
      ) : (
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2",
          approved && "border-emerald-200 bg-emerald-50",
          rejected && "border-rose-200 bg-rose-50",
          pending  && "border-amber-200 bg-amber-50",
          analyzing&& "border-primary/20 bg-primary/5",
        )}>
          {approved  && <CheckCircle2 className="h-4 w-4 text-emerald-500"/>}
          {rejected  && <XCircle className="h-4 w-4 text-rose-500"/>}
          {pending   && <Clock className="h-4 w-4 text-amber-500"/>}
          {analyzing && <Loader2 className="h-4 w-4 animate-spin text-primary"/>}
        </div>
      )}

      {/* Middle */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1 mb-0.5">
          <span className={cn("rounded-md border px-1 py-0.5 text-[8px] font-extrabold uppercase tracking-wide", diffConf.cls)}>
            {diffConf.label}
          </span>
          {approved  && <span className="inline-flex items-center gap-0.5 rounded-md border border-emerald-200 bg-emerald-50 px-1 py-0.5 text-[8px] font-extrabold text-emerald-700"><CheckCircle2 className="h-2 w-2"/>Đã duyệt</span>}
          {rejected  && <span className="inline-flex items-center gap-0.5 rounded-md border border-rose-200 bg-rose-50 px-1 py-0.5 text-[8px] font-extrabold text-rose-700"><XCircle className="h-2 w-2"/>Từ chối</span>}
          {pending   && <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-200 bg-amber-50 px-1 py-0.5 text-[8px] font-extrabold text-amber-700"><Clock className="h-2 w-2"/>Chờ duyệt</span>}
          {analyzing && <span className="inline-flex items-center gap-0.5 rounded-md border border-primary/20 bg-primary/5 px-1 py-0.5 text-[8px] font-extrabold text-primary"><Loader2 className="h-2 w-2 animate-spin"/>Đang phân tích</span>}
        </div>
        <p className="font-manrope text-xs font-bold text-on-surface leading-snug truncate">{submission.exercise.title}</p>
        <div className="flex flex-wrap items-center gap-x-2 font-inter text-[10px] text-on-muted mt-0.5">
          {submission.exercise.exercise_date && (
            <span className="inline-flex items-center gap-0.5">
              <CalendarDays className="h-2.5 w-2.5"/> Hạn: {new Date(submission.exercise.exercise_date).toLocaleDateString("vi-VN")}
            </span>
          )}
          <span>Nộp {fmtTime(submission.submitted_at)}</span>
          {total>0 && <span className="font-bold text-primary">{formatVND(total)}</span>}
        </div>
      </div>

      {/* Right */}
      <ArrowRight className="h-4 w-4 shrink-0 text-on-muted group-hover:text-primary transition-colors"/>
    </button>
  );
}

/* ─────────────────────────────────────────
   Day Header
   ───────────────────────────────────────── */
function DayHeader({label, items}:{label:string; items:Submission[]}) {
  const approved = items.filter(s => isApproved(s.status)).length;
  const pending  = items.filter(s => s.status==="PENDING").length;
  const total    = items.length;

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-xl border border-surface-container-high bg-surface-container-low/90 px-3.5 py-2.5 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-3.5 w-3.5 text-on-muted"/>
        <div>
          <p className="font-manrope text-xs font-extrabold text-on-surface capitalize">{label}</p>
          <p className="font-inter text-[10px] text-on-muted">
            {total} bài{approved>0&&` · ${approved} đã duyệt`}{pending>0&&` · ${pending} chờ`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {approved>0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700">
            <CheckCircle2 className="h-2.5 w-2.5"/> {approved} đã duyệt
          </span>
        )}
        {pending>0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-extrabold text-amber-700">
            <Clock className="h-2.5 w-2.5"/> {pending} chờ
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Empty state
   ───────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-surface-container-high bg-surface-container-low">
        <Cpu className="h-8 w-8 text-on-muted"/>
      </div>
      <p className="font-manrope text-sm font-bold text-on-surface">Chưa có bài nộp nào</p>
      <p className="mt-1 font-inter text-xs text-on-muted max-w-[240px] leading-relaxed">
        Bài tập sẽ xuất hiện ở đây sau khi bạn nộp cấu hình.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main export
   ───────────────────────────────────────── */
export default function SubmissionHistoryList({history, onCancelExercise, initialSubmissionId}: Props) {
  const [modalSubmission, setModalSubmission] = useState<Submission|null>(null);

  useEffect(() => {
    if (!initialSubmissionId) return;

    const target = history.find((submission) => submission.id === initialSubmissionId);
    if (target) setModalSubmission(target);
  }, [history, initialSubmissionId]);

  if (history.length===0) return <EmptyState/>;

  const groups = groupByDate(history);

  return (
    <div className="space-y-5">
      {groups.map(g => (
        <div key={g.dateKey} className="space-y-2">
          <DayHeader label={g.label} items={g.items}/>
          {g.items.map(s => (
            <HistoryRow
              key={s.id}
              submission={s}
              onClick={()=>setModalSubmission(s)}
            />
          ))}
        </div>
      ))}

      {/* Modal */}
      <AnimatePresence>
        {modalSubmission && (
          <DetailModal
            submission={modalSubmission}
            onClose={()=>setModalSubmission(null)}
            onCancelExercise={onCancelExercise}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
