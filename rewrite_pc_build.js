const fs = require('fs');
const file = 'src/app/(dashboard)/training/pc-build/pc-build-training-client.tsx';
let code = fs.readFileSync(file, 'utf8');

// Update imports at the top
const newImports = `import React, { useEffect, useState, useRef } from "react";
import { toast, Toaster } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import CountUp from "react-countup";
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
  Plus,
  FileText,
  Zap,
  Database,
  HardDrive,
  Layers,
  Monitor,
  Box,
  Wind,
  Tv,
  Award,
  TrendingUp,
  Coins,
  Clock,
  Sparkles,
  CheckCircle,
  MousePointer,
  Headphones
} from "lucide-react";`;

code = code.replace(/import React[\s\S]*?from "lucide-react";/, newImports);

// Inject CATEGORY_ICONS definition right after CATEGORY_LABELS (before DEFAULT_TASK_STATE)
const categoryIconsDef = `
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  cpu: <Cpu className="h-3.5 w-3.5 text-violet-500" />,
  mainboard: <Layers className="h-3.5 w-3.5 text-indigo-500" />,
  ram: <Database className="h-3.5 w-3.5 text-blue-500" />,
  vga: <Monitor className="h-3.5 w-3.5 text-cyan-500" />,
  ssd: <HardDrive className="h-3.5 w-3.5 text-teal-500" />,
  psu: <Zap className="h-3.5 w-3.5 text-amber-500" />,
  case: <Box className="h-3.5 w-3.5 text-slate-500" />,
  cooler_fan: <Wind className="h-3.5 w-3.5 text-emerald-500" />,
  cooler: <Wind className="h-3.5 w-3.5 text-emerald-500" />,
  monitor: <Tv className="h-3.5 w-3.5 text-rose-500" />,
  keyboard_mouse: <MousePointer className="h-3.5 w-3.5 text-pink-500" />,
  headphone: <Headphones className="h-3.5 w-3.5 text-purple-500" />,
  desk_chair: <FileText className="h-3.5 w-3.5 text-orange-500" />,
};
`;

const targetState = 'const DEFAULT_TASK_STATE: TaskState = {';
code = code.replace(targetState, categoryIconsDef + '\n' + targetState);

// Replace expandedTaskId hook and add missing hooks
const targetHookDecl = 'const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);';
const replacementHooks = `const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [cancelingTaskId, setCancelingTaskId] = useState<string | null>(null);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);`;

code = code.replace(targetHookDecl, replacementHooks);

// Inject helper countdown function inside component
const targetRefs = 'const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});';
const helperFunc = `
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getCountdownLabel = (deadlineStr: string | null | undefined) => {
    if (!deadlineStr) return "";
    const deadlineDate = new Date(deadlineStr);
    deadlineDate.setHours(23, 59, 59, 999);
    const now = new Date();
    const diffMs = deadlineDate.getTime() - now.getTime();
    if (diffMs <= 0) return "Đã hết hạn";
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHrs >= 24) {
      const days = Math.floor(diffHrs / 24);
      return \`Còn \${days} ngày\`;
    }
    return \`Còn \${diffHrs}g \${diffMins}p\`;
  };
`;
code = code.replace(targetRefs, helperFunc);

// Extract handleImageSelect and rewrite it with handleImageFileProcessing
const targetImageSelect = `  const handleImageSelect = async (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
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
  };`;

const replacementImageSelect = `  const handleImageFileProcessing = async (taskId: string, file: File) => {
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

  const handleImageSelect = async (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleImageFileProcessing(taskId, file);
  };`;

code = code.replace(targetImageSelect, replacementImageSelect);

// Locate return statement to rewrite UI
const returnStr = '  return (\n    <div className="space-y-6">';
const returnStart = code.indexOf(returnStr);

if (returnStart === -1) {
  console.error("Could not find return statement");
  process.exit(1);
}

// Inject stats calculation before returnCode
const returnCode = `  // Stats calculation
  const completedCount = tasks.filter(t => {
    const state = getTaskState(t.id);
    return state.previewImage && !state.isDraft;
  }).length;

  const approvedCount = tasks.filter(t => {
    const state = getTaskState(t.id);
    return state.isApproved;
  }).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-6 py-6 animate-in fade-in duration-300">
      <Toaster position="top-right" richColors />

      <style>{\`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          50% { transform: translateY(220px); }
          100% { transform: translateY(-100%); }
        }
        .scanner-line {
          animation: scan 2.5s ease-in-out infinite;
        }
        .result-page {
          max-width: 760px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .uploaded-image { width: 100%; height: auto; display: block; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.3); border-radius: 10px; }
      \`}</style>

      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl border border-surface-container bg-surface-mid/40 backdrop-blur-md p-6 md:p-8 shadow-ambient">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-gradient-to-tr from-primary to-indigo-600 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg shadow-primary/20">
            <Cpu className="h-7 w-7 text-on-primary animate-pulse" />
          </div>
          <div>
            <h1 className="font-manrope text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              Đào tạo Build PC
            </h1>
            <p className="font-inter text-xs text-on-muted mt-1.5 max-w-2xl leading-relaxed">
              Thực hành lắp cấu hình theo nhu cầu thực tế của khách hàng. AI sẽ tự động phân tích độ tương thích và chỉ bạn cách tối ưu cấu hình nếu có thể.
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Dashboard Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-mid border border-surface-container rounded-2xl p-5 flex items-center justify-between hover:shadow-card transition-all duration-200">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-on-muted uppercase tracking-wider">Số đề bài hôm nay</p>
            <p className="text-2xl font-extrabold font-manrope text-on-surface">{tasks.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-violet-500/10 text-violet-600">
            <Award className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-surface-mid border border-surface-container rounded-2xl p-5 flex items-center justify-between hover:shadow-card transition-all duration-200">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-on-muted uppercase tracking-wider">Đã hoàn thành</p>
            <p className="text-2xl font-extrabold font-manrope text-on-surface">
              {completedCount} <span className="text-xs font-normal text-on-muted">/ {tasks.length} đề</span>
            </p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-surface-mid border border-surface-container rounded-2xl p-5 flex items-center justify-between hover:shadow-card transition-all duration-200">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-on-muted uppercase tracking-wider">Đã được phê duyệt</p>
            <p className="text-2xl font-extrabold font-manrope text-emerald-600 dark:text-emerald-400">
              {approvedCount} <span className="text-xs font-normal text-on-muted">đề</span>
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-surface-container pb-3">
          <h2 className="font-manrope text-base font-bold text-on-surface flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Nhiệm vụ đào tạo hàng ngày
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-xs text-on-muted font-medium">Đang tải danh sách bài tập...</p>
          </div>
        ) : tasks.length === 0 ? (
          <Card className="border-dashed border-2 border-surface-container bg-surface-mid/10 rounded-3xl">
            <CardContent className="py-16 text-center space-y-3">
              <FileText className="h-12 w-12 text-on-muted mx-auto" />
              <p className="text-sm font-semibold text-on-surface">Chưa có đề bài nào được giao hôm nay</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {tasks.map((task, idx) => {
              const state = getTaskState(task.id);
              const isSubmitted = !!(state.previewImage && !state.isDraft);

              return (
                <div
                  key={task.id}
                  onClick={() => setActiveTaskId(task.id)}
                  className={cn(
                    "group rounded-3xl border transition-all duration-300 overflow-hidden bg-surface-container-lowest cursor-pointer hover:-translate-y-0.5",
                    "border-surface-container hover:border-primary/50 shadow-sm hover:shadow-md"
                  )}
                >
                  <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-manrope font-extrabold text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Đề bài #{idx + 1}
                        </span>
                        
                        {task.deadline && (
                          <span className="bg-rose-500/10 text-rose-600 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border border-rose-500/10">
                            <Clock className="h-3 w-3" />
                            Hạn nộp: {getCountdownLabel(task.deadline)}
                          </span>
                        )}

                        {state.previewImage && (
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border",
                            state.isAnalyzing 
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/15 animate-pulse" 
                              : (isSubmitted 
                                  ? (state.status === "AUTO_APPROVED" || state.isApproved ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/15" : "bg-blue-500/10 text-blue-600 border-blue-500/15") 
                                  : "bg-indigo-500/10 text-indigo-600 border-indigo-500/15")
                          )}>
                            {state.isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            {state.isAnalyzing 
                              ? "AI Đang phân tích chạy ngầm..." 
                              : (isSubmitted 
                                  ? (state.status === "AUTO_APPROVED" || state.isApproved ? "Đạt bài tập 🎉" : "Đã nộp bài (Chờ duyệt)") 
                                  : "Nháp phân tích (Chưa nộp)")
                            }
                          </span>
                        )}
                      </div>
                      
                      <h3 className="font-manrope text-base font-bold text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                        🎯 Nhu cầu: {task.customer_need}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-4 text-xs text-on-muted">
                        <span className="flex items-center gap-1">
                          <Coins className="h-3.5 w-3.5 text-amber-500" />
                          Ngân sách tối đa: <span className="font-bold text-on-surface text-sm">{formatVND(task.max_budget)}</span>
                        </span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Plus className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FULLSCREEN OVERLAY MODAL */}
      <AnimatePresence>
        {activeTaskId && (() => {
          const task = tasks.find(t => t.id === activeTaskId);
          if (!task) return null;
          const state = getTaskState(task.id);
          const isResultView = !!state.previewImage;

          const checksAnimDelay = 0.5;
          const checkKeys = ["socket", "ram", "power", "case", "budget"];
          
          const parts = state.extractedParts;
          const partsKeys = parts ? Object.keys(parts).filter(k => {
            if (["total_price", "checks", "reason", "is_analyzing", "explanation", "is_draft", "is_approved", "temp_ai_score", "temp_ai_feedback"].includes(k)) return false;
            const val = parts[k] as any;
            return val && val.name;
          }) : [];
          
          const partsAnimDelay = checksAnimDelay + (checkKeys.length * 0.4) + 0.5;
          const finalResultAnimDelay = partsAnimDelay + (partsKeys.length * 0.3) + 1.0;
          
          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
              onClick={() => setActiveTaskId(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={cn(
                  "relative bg-surface-container-lowest rounded-3xl shadow-2xl w-full my-auto flex flex-col",
                  isResultView ? "max-w-[760px] h-[90vh]" : "max-w-4xl max-h-[90vh]"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setActiveTaskId(null)}
                  className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/80 text-white rounded-full transition-all cursor-pointer border-none shadow-md"
                >
                  <X className="h-5 w-5" />
                </button>
                
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 result-page relative">
                   {!isResultView ? (
                     <div className="space-y-6">
                        <div className="text-center space-y-2 mb-8">
                          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <Sparkles className="w-8 h-8" />
                          </div>
                          <h2 className="text-2xl font-bold font-manrope">Nộp cấu hình PC</h2>
                          <p className="text-on-muted text-sm">Vui lòng xem kỹ yêu cầu và tải lên ảnh báo giá linh kiện.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="relative rounded-2xl bg-surface-mid/85 p-5 border border-surface-container space-y-3 shadow-inner">
                              <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                                <FileText className="w-4 h-4 text-violet-500" /> Nhu cầu khách hàng
                              </h3>
                              <p className="text-sm font-semibold text-on-surface">{task.customer_need}</p>
                              
                              <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider mt-4">
                                <Coins className="w-4 h-4 text-amber-500" /> Ngân sách tối đa
                              </h3>
                              <p className="text-lg font-extrabold text-emerald-500">{formatVND(task.max_budget)}</p>
                              
                              <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider mt-4">
                                <AlertTriangle className="w-4 h-4 text-rose-500" /> Yêu cầu chi tiết
                              </h3>
                              <p className="text-sm text-on-surface-variant leading-relaxed">
                                {task.requirements || "Không có yêu cầu ràng buộc cụ thể."}
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-4 flex flex-col">
                            <div
                              onClick={() => fileInputRefs.current[task.id]?.click()}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDraggingTaskId(task.id);
                              }}
                              onDragLeave={(e) => {
                                e.preventDefault();
                                setDraggingTaskId(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                setDraggingTaskId(null);
                                const file = e.dataTransfer.files?.[0];
                                if (file) handleImageFileProcessing(task.id, file);
                              }}
                              className={cn(
                                "flex-1 group/drop flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all min-h-[260px] relative overflow-hidden",
                                draggingTaskId === task.id
                                  ? "border-primary bg-primary/10 scale-[0.98] ring-2 ring-primary/20"
                                  : "border-surface-container-high hover:border-primary/50 bg-surface-mid/30 hover:bg-primary/5"
                              )}
                            >
                              <div className={cn(
                                "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-200",
                                draggingTaskId === task.id
                                  ? "bg-primary text-on-primary scale-110"
                                  : "bg-primary/10 text-primary group-hover/drop:scale-110"
                              )}>
                                <UploadCloud className="h-8 w-8" />
                              </div>
                              <p className="text-sm font-bold text-on-surface">
                                {draggingTaskId === task.id ? "Thả ảnh vào đây" : "Kéo thả hoặc nhấn để tải ảnh"}
                              </p>
                              <p className="text-xs text-on-muted mt-2 max-w-[220px] leading-relaxed font-medium">
                                Hỗ trợ các định dạng JPG, PNG. Đảm bảo ảnh rõ nét để AI đọc bảng giá tốt nhất.
                              </p>
                              <input
                                type="file"
                                ref={(el) => { fileInputRefs.current[task.id] = el; }}
                                onChange={(e) => handleImageSelect(task.id, e)}
                                accept="image/*"
                                className="hidden"
                              />
                            </div>
                          </div>
                        </div>
                     </div>
                   ) : (
                     <div className="flex flex-col gap-8 pb-10">
                        <div className="w-full relative group">
                           <img 
                             src={state.previewImage || undefined} 
                             className="uploaded-image rounded-2xl border border-surface-container-high shadow-lg cursor-zoom-in" 
                             alt="Báo giá"
                             onClick={() => setSelectedImage(state.previewImage || null)}
                           />
                           {state.isAnalyzing && (
                              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 border border-white/10 z-10">
                                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-primary to-violet-500 shadow-[0_0_15px_rgba(99,102,241,1)] scanner-line" />
                                <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-3xl p-8 flex flex-col items-center gap-4 text-center max-w-sm shadow-2xl">
                                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                  <h3 className="text-lg font-bold text-on-surface font-manrope">AI đang phân tích & kiểm tra</h3>
                                  <p className="text-sm text-on-muted leading-relaxed">Đang bóc tách linh kiện và đối chiếu độ tương thích. Vui lòng chờ trong giây lát...</p>
                                  <button
                                    type="button"
                                    onClick={() => setCancelingTaskId(task.id)}
                                    className="mt-4 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 bg-rose-500/10 px-4 py-2 rounded-xl transition-all border-none"
                                  >
                                    Hủy quét bài viết
                                  </button>
                                </div>
                              </div>
                           )}
                        </div>

                        {!state.isAnalyzing && state.compatibilityChecks && (
                          <div className="space-y-4">
                            <motion.h3 
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="font-manrope text-lg font-extrabold flex items-center gap-2"
                            >
                              <Sparkles className="w-5 h-5 text-violet-500" /> Quá trình kiểm tra kỹ thuật
                            </motion.h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {checkKeys.map((key, i) => {
                                const check = state.compatibilityChecks[key];
                                if (!check) return null;
                                return (
                                  <motion.div 
                                    key={key}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ 
                                      delay: checksAnimDelay + (i * 0.4), 
                                      type: "spring", 
                                      stiffness: 200, 
                                      damping: 15 
                                    }}
                                    className="flex items-start gap-3 p-4 rounded-2xl bg-surface-container border border-surface-container-high shadow-sm"
                                  >
                                    <div className="mt-0.5 shrink-0">
                                      {check.status === "PASS" ? (
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                                          <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                      ) : check.status === "FAIL" ? (
                                        <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center animate-bounce">
                                          <XCircle className="w-4 h-4" />
                                        </div>
                                      ) : (
                                        <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center">
                                          <AlertTriangle className="w-4 h-4" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-sm">
                                      <p className="font-bold text-on-surface">
                                        {key === "socket" ? "Socket CPU & Mainboard" :
                                         key === "ram" ? "Chuẩn thế hệ RAM" :
                                         key === "power" ? "Công suất Nguồn (PSU)" :
                                         key === "case" ? "Kích thước vỏ máy (Case)" :
                                         "Ràng buộc Ngân sách"}
                                      </p>
                                      <p className="text-on-muted mt-1 text-xs">{check.message}</p>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {!state.isAnalyzing && parts && partsKeys.length > 0 && (
                          <div className="space-y-4">
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: partsAnimDelay - 0.2 }}
                              className="flex items-center justify-between border-b border-surface-container-high pb-2"
                            >
                              <h3 className="font-manrope text-lg font-extrabold flex items-center gap-2">
                                <Layers className="w-5 h-5 text-indigo-500" /> Linh kiện bóc tách
                              </h3>
                              <div className="text-right">
                                <span className="text-xs text-on-muted uppercase font-bold block">Tổng tiền</span>
                                <span className="text-xl font-extrabold text-primary font-mono bg-primary/10 px-3 py-1 rounded-lg inline-block shadow-inner mt-1">
                                  <CountUp 
                                    end={Number(parts.total_price?.price || parts.total_price || 0)} 
                                    duration={partsKeys.length * 0.3} 
                                    delay={partsAnimDelay}
                                    separator="."
                                    suffix="đ"
                                    preserveValue
                                  />
                                </span>
                              </div>
                            </motion.div>
                            
                            <div className="flex flex-col gap-2">
                              {partsKeys.map((key, i) => {
                                const part = parts ? (parts[key] as any) : null;
                                if (!part) return null;
                                return (
                                  <motion.div
                                    key={key}
                                    initial={{ opacity: 0, x: -30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ 
                                      delay: partsAnimDelay + (i * 0.3),
                                      type: "spring",
                                      damping: 20
                                    }}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container transition-colors border border-transparent hover:border-surface-container-high"
                                  >
                                    <div className="flex items-center gap-3 w-1/3 min-w-[140px] shrink-0">
                                      <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center">
                                        {CATEGORY_ICONS[key] || <Box className="w-4 h-4 text-slate-400" />}
                                      </div>
                                      <span className="font-bold text-sm text-on-surface">{CATEGORY_LABELS[key] || key}</span>
                                    </div>
                                    <span className="text-sm font-medium text-on-surface-variant truncate flex-1 px-4">{part.name}</span>
                                    <span className="text-sm font-bold font-mono text-on-surface shrink-0">{part.price > 0 ? formatVND(part.price) : "—"}</span>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {!state.isAnalyzing && parts && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: finalResultAnimDelay, type: "spring", bounce: 0.4 }}
                            className="space-y-6 mt-4"
                          >
                            <div className={cn(
                              "p-6 rounded-3xl border-2 text-center shadow-xl",
                              state.isApproved
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-400"
                                : "bg-rose-500/10 border-rose-500 text-rose-800 dark:text-rose-400 animate-in shake duration-300"
                            )}>
                               <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
                                 {state.isApproved ? <Award className="w-8 h-8 text-emerald-600 dark:text-emerald-400" /> : <XCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />}
                               </div>
                               <h2 className="text-2xl font-black font-manrope mb-2">
                                 {state.isApproved ? "CẤU HÌNH ĐẠT YÊU CẦU!" : "CẤU HÌNH CHƯA ĐẠT!"}
                               </h2>
                               <p className="text-sm font-medium opacity-90 max-w-md mx-auto">
                                 {state.approvalReason || "Hệ thống AI đã hoàn thành kiểm thử báo giá linh kiện."}
                               </p>
                            </div>

                            {(!state.previewImage || state.isDraft) && (
                              <div className="space-y-4 bg-surface-container-low p-6 rounded-3xl border border-surface-container">
                                <h3 className="text-sm font-bold flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-primary" /> Lời nhắn gửi Admin (Tùy chọn)
                                </h3>
                                <textarea
                                  rows={3}
                                  value={state.explanation}
                                  onChange={(e) => updateTaskState(task.id, { explanation: e.target.value })}
                                  placeholder="Ví dụ: Cấu hình này đã tối ưu hiệu năng chơi game 2K trong tầm giá..."
                                  className="w-full resize-none rounded-2xl border border-surface-container-high bg-surface-container px-4 py-3 font-inter text-sm outline-none focus:border-primary transition-all shadow-inner"
                                />
                                <div className="flex justify-end pt-2">
                                  <Button
                                    onClick={() => setSubmittingTaskId(task.id)}
                                    disabled={state.submitting}
                                    className="gradient-primary text-on-primary rounded-xl font-bold font-manrope text-sm px-8 py-6 cursor-pointer shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                                  >
                                    {state.submitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Đang nộp...</> : <><Send className="w-5 h-5 mr-2"/> Hoàn thành & Nộp bài</>}
                                  </Button>
                                </div>
                              </div>
                            )}

                            <div className="flex justify-center pt-8 border-t border-surface-container">
                                <Button
                                  onClick={() => {
                                    updateTaskState(task.id, {
                                      previewImage: null,
                                      isAnalyzing: false,
                                      extractedParts: null,
                                      compatibilityChecks: null,
                                      isApproved: false,
                                      approvalReason: "",
                                      explanation: "",
                                      submitting: false,
                                      isDraft: true,
                                      checkin_id: undefined,
                                      status: undefined
                                    });
                                  }}
                                  variant="outline"
                                  className="rounded-xl font-bold font-manrope text-sm px-6 py-5 cursor-pointer hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30 transition-all"
                                >
                                  <Plus className="w-4 h-4 mr-2" /> Nộp lại cấu hình mới
                                </Button>
                            </div>
                          </motion.div>
                        )}
                     </div>
                   )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Image Modal Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[95vh] bg-transparent rounded-3xl overflow-hidden p-2 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/40 text-white rounded-full transition-all cursor-pointer shadow-md border-none backdrop-blur-sm"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={selectedImage}
              alt="Bản xem trước hóa đơn"
              className="w-full h-auto max-h-[90vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* Confirm Cancel Scanning / Config Modal */}
      {cancelingTaskId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-3xl border border-surface-container shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-sm font-bold text-on-surface font-manrope">Xác nhận hủy cấu hình</h3>
            </div>
            <p className="text-xs text-on-muted leading-relaxed font-inter">
              Bạn có chắc chắn muốn hủy quá trình hiện tại không? Mọi tiến trình phân tích báo giá sẽ bị dừng lại.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-xl text-xs font-bold font-manrope cursor-pointer" onClick={() => setCancelingTaskId(null)}>
                Quay lại
              </Button>
              <Button
                className="bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-xs font-bold font-manrope cursor-pointer border-none"
                onClick={async () => {
                  const taskId = cancelingTaskId;
                  setCancelingTaskId(null);
                  await handleCancelTask(taskId);
                  setActiveTaskId(null);
                }}
              >
                Đồng ý hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Final Submit Modal */}
      {submittingTaskId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-3xl border border-surface-container shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-primary">
              <Sparkles className="h-6 w-6" />
              <h3 className="text-sm font-bold text-on-surface font-manrope">Xác nhận nộp bài</h3>
            </div>
            <p className="text-xs text-on-muted leading-relaxed font-inter">
              Bạn có chắc chắn muốn nộp cấu hình này để Admin phê duyệt không? Sau khi nộp, bạn vẫn có thể nộp lại cấu hình mới nếu cần thiết.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-xl text-xs font-bold font-manrope cursor-pointer" onClick={() => setSubmittingTaskId(null)}>
                Quay lại
              </Button>
              <Button
                className="gradient-primary text-on-primary rounded-xl text-xs font-bold font-manrope cursor-pointer border-none shadow-md shadow-primary/10"
                onClick={async () => {
                  const taskId = submittingTaskId;
                  setSubmittingTaskId(null);
                  await handleSubmit(taskId);
                  setActiveTaskId(null);
                }}
              >
                Xác nhận nộp bài
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

code = code.substring(0, returnStart) + returnCode;
fs.writeFileSync(file, code);
