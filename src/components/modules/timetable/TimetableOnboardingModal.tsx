"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Timer,
  Briefcase,
  Sun,
  BookOpen,
  GraduationCap,
  Plug,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface OnboardingConfig {
  max_focus_time: number;
  is_job_flexible: boolean;
  best_energy_time: string;
  best_learning_time: string;
  max_learning_time: number;
  sync_task_manager: boolean;
}

interface Props {
  onComplete: (config: OnboardingConfig, rows: any[]) => void;
}

const STEPS = [
  {
    id: 1,
    icon: Timer,
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    ring: "ring-violet-200 dark:ring-violet-800",
    title: "Thời gian tập trung",
    subtitle: "Bạn có thể làm việc tập trung liên tục cho một công việc tối đa bao lâu?",
  },
  {
    id: 2,
    icon: Briefcase,
    color: "text-sky-500",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    ring: "ring-sky-200 dark:ring-sky-800",
    title: "Tính chất công việc",
    subtitle: "Công việc hàng ngày của bạn thuộc loại nào?",
  },
  {
    id: 3,
    icon: Sun,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    ring: "ring-amber-200 dark:ring-amber-800",
    title: "Thời điểm đỉnh năng lượng",
    subtitle: "Bạn cảm thấy nhiều năng lượng nhất vào thời điểm nào trong ngày?",
  },
  {
    id: 4,
    icon: BookOpen,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    ring: "ring-emerald-200 dark:ring-emerald-800",
    title: "Thời điểm tiếp thu tốt nhất",
    subtitle: "Khi nào trong ngày bạn học và tiếp thu kiến thức hiệu quả nhất?",
  },
  {
    id: 5,
    icon: GraduationCap,
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    ring: "ring-rose-200 dark:ring-rose-800",
    title: "Sức bền học tập",
    subtitle: "Bạn có thể duy trì việc học liên tục tối đa bao lâu?",
  },
  {
    id: 6,
    icon: Plug,
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    ring: "ring-indigo-200 dark:ring-indigo-800",
    title: "Tích hợp Task Manager",
    subtitle: "Bạn có muốn AI tự động sắp xếp các công việc từ Task Manager vào thời khóa biểu không?",
  },
];

const SLIDE_VARIANTS = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};

function formatMinutes(m: number) {
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} giờ ${rem} phút` : `${h} giờ`;
}

const OPTION_BASE =
  "flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all cursor-pointer select-none";
const OPTION_ACTIVE =
  "border-indigo-500 bg-indigo-950/50 text-indigo-300";
const OPTION_IDLE =
  "border-slate-800 hover:border-slate-700 bg-slate-900/50 text-slate-300";

export default function TimetableOnboardingModal({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);

  const [config, setConfig] = useState<OnboardingConfig>({
    max_focus_time: 60,
    is_job_flexible: false,
    best_energy_time: "morning",
    best_learning_time: "morning",
    max_learning_time: 45,
    sync_task_manager: false,
  });

  const current = STEPS[step];
  const StepIcon = current.icon;
  const isLast = step === STEPS.length - 1;

  const navigate = (delta: number) => {
    setDir(delta);
    setStep((s) => s + delta);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/timetable/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success("Đã tạo thời khóa biểu thành công! 🎉");
      onComplete(data.config, data.rows);
    } catch {
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      {/* Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg bg-slate-950/70 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Progress bar */}
        <div className="h-1 bg-slate-800">
          <motion.div
            className="h-full bg-indigo-500 rounded-full"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
          />
        </div>

        <div className="p-8">
          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 bg-indigo-950/50 px-2.5 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Thiết lập thời khóa biểu
            </span>
            <span className="ml-auto text-xs text-slate-400 font-medium">
              {step + 1} / {STEPS.length}
            </span>
          </div>

          {/* Step icon + title */}
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ring-4 ${current.bg} ${current.ring} mb-4`}>
            <StepIcon className={`w-6 h-6 ${current.color}`} />
          </div>

          <h2 className="text-xl font-bold text-slate-100 mb-1.5">
            {current.title}
          </h2>
          <p className="text-sm text-slate-400 mb-8 leading-relaxed">
            {current.subtitle}
          </p>

          {/* Step content */}
          <div className="min-h-[160px] relative overflow-hidden">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                variants={SLIDE_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
              >
                {/* Q1: Focus time slider */}
                {step === 0 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <span className="text-3xl font-bold text-slate-100">
                        {formatMinutes(config.max_focus_time)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={120}
                      step={15}
                      value={config.max_focus_time}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, max_focus_time: +e.target.value }))
                      }
                      className="w-full h-2 accent-indigo-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>15 phút</span>
                      <span>1 tiếng</span>
                      <span>2 tiếng</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {[15, 30, 60, 90, 120].map((v) => (
                        <button
                          key={v}
                          onClick={() => setConfig((c) => ({ ...c, max_focus_time: v }))}
                          className={`${OPTION_BASE} justify-center py-2 text-xs ${config.max_focus_time === v ? OPTION_ACTIVE : OPTION_IDLE}`}
                        >
                          {formatMinutes(v)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Q2: Job type */}
                {step === 1 && (
                  <div className="space-y-3">
                    {[
                      { value: false, label: "Cố định", desc: "Giờ giấc, đầu việc ổn định hàng ngày" },
                      { value: true, label: "Linh hoạt cao", desc: "Đầu việc thay đổi thường xuyên theo ngày" },
                    ].map(({ value, label, desc }) => (
                      <button
                        key={label}
                        onClick={() => setConfig((c) => ({ ...c, is_job_flexible: value }))}
                        className={`${OPTION_BASE} ${config.is_job_flexible === value ? OPTION_ACTIVE : OPTION_IDLE}`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${config.is_job_flexible === value ? "border-indigo-500 bg-indigo-500" : "border-slate-700"}`}>
                          {config.is_job_flexible === value && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="text-left">
                          <div className="font-semibold">{label}</div>
                          <div className="text-xs font-normal text-slate-400">{desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Q3: Energy peak */}
                {step === 2 && (
                  <div className="space-y-3">
                    {[
                      { value: "morning", label: "Buổi Sáng", desc: "Tràn đầy năng lượng, mức độ tập trung cao", emoji: "🌅" },
                      { value: "afternoon", label: "Buổi Chiều", desc: "Tràn đầy năng lượng, mức độ tập trung cao", emoji: "☀️" },
                    ].map(({ value, label, desc, emoji }) => (
                      <button
                        key={value}
                        onClick={() => setConfig((c) => ({ ...c, best_energy_time: value }))}
                        className={`${OPTION_BASE} ${config.best_energy_time === value ? OPTION_ACTIVE : OPTION_IDLE}`}
                      >
                        <span className="text-xl">{emoji}</span>
                        <div className="text-left">
                          <div className="font-semibold">{label}</div>
                          <div className="text-xs font-normal text-slate-400">{desc}</div>
                        </div>
                        {config.best_energy_time === value && (
                          <CheckCircle2 className="ml-auto w-5 h-5 text-indigo-500 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Q4: Best learning time */}
                {step === 3 && (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "morning", label: "Sáng sớm", emoji: "🌄" },
                      { value: "noon", label: "Buổi Trưa", emoji: "🌞" },
                      { value: "afternoon", label: "Đầu giờ chiều", emoji: "🌤️" },
                      { value: "evening", label: "Buổi Tối", emoji: "🌙" },
                    ].map(({ value, label, emoji }) => (
                      <button
                        key={value}
                        onClick={() => setConfig((c) => ({ ...c, best_learning_time: value }))}
                        className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all cursor-pointer ${config.best_learning_time === value ? OPTION_ACTIVE : OPTION_IDLE}`}
                      >
                        <span className="text-2xl">{emoji}</span>
                        <span className="text-sm font-semibold">{label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Q5: Max learning time */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <span className="text-3xl font-bold text-slate-100">
                        {formatMinutes(config.max_learning_time)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={180}
                      step={15}
                      value={config.max_learning_time}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, max_learning_time: +e.target.value }))
                      }
                      className="w-full h-2 accent-rose-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>15 phút</span>
                      <span>1 tiếng</span>
                      <span>3 tiếng</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {[30, 45, 60, 90, 120].map((v) => (
                        <button
                          key={v}
                          onClick={() => setConfig((c) => ({ ...c, max_learning_time: v }))}
                          className={`${OPTION_BASE} justify-center py-2 text-xs ${config.max_learning_time === v ? "border-rose-500 bg-rose-950/50 text-rose-300" : OPTION_IDLE}`}
                        >
                          {formatMinutes(v)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Q6: Sync Task Manager */}
                {step === 5 && (
                  <div className="space-y-4">
                    <div
                      className={`flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${config.sync_task_manager ? OPTION_ACTIVE : OPTION_IDLE}`}
                      onClick={() => setConfig((c) => ({ ...c, sync_task_manager: !c.sync_task_manager }))}
                    >
                      <div className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${config.sync_task_manager ? "bg-indigo-500" : "bg-slate-800"}`}>
                        <motion.span
                          animate={{ x: config.sync_task_manager ? 24 : 2 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {config.sync_task_manager ? "Bật tích hợp Task Manager" : "Không tích hợp"}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 font-normal">
                          {config.sync_task_manager
                            ? "AI sẽ tự động sắp xếp task có deadline vào thời khóa biểu."
                            : "Bạn có thể bật tính năng này sau trong cài đặt."}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 text-center">
                      Nếu bật, các task có deadline gần sẽ được tô màu đỏ và ưu tiên sắp xếp.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
            <button
              onClick={() => navigate(-1)}
              disabled={step === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
              Trước
            </button>

            {/* Step dots */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-5 bg-indigo-500" : i < step ? "w-1.5 bg-indigo-700" : "w-1.5 bg-slate-800"}`}
                />
              ))}
            </div>

            {isLast ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {loading ? "Đang tạo..." : "Tạo thời khóa biểu"}
              </button>
            ) : (
              <button
                onClick={() => navigate(1)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm"
              >
                Tiếp theo
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
