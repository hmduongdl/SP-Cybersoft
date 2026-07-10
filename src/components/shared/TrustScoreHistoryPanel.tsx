"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  History,
  Loader2,
} from "lucide-react";

interface TrustScoreLog {
  id: string;
  change: number;
  score_after: number;
  action: string;
  description: string;
  post_id: string | null;
  created_at: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  AUTO_APPROVED: <TrendingUp className="h-4 w-4 text-emerald-500" />,
  APPROVED: <TrendingUp className="h-4 w-4 text-emerald-500" />,
  REJECTED: <TrendingDown className="h-4 w-4 text-rose-500" />,
  MISSED: <TrendingDown className="h-4 w-4 text-orange-500" />,
  AI_FRAUD: <TrendingDown className="h-4 w-4 text-red-600" />,
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-rose-500";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500/10 border-emerald-500/20";
  if (score >= 60) return "bg-amber-500/10 border-amber-500/20";
  return "bg-rose-500/10 border-rose-500/20";
}

function getChangeBadge(change: number) {
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-md text-xs font-semibold">
        <TrendingUp className="h-3 w-3" />+{change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400 px-1.5 py-0.5 rounded-md text-xs font-semibold">
        <TrendingDown className="h-3 w-3" />{change}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-slate-500 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-xs font-semibold">
      <Minus className="h-3 w-3" />0
    </span>
  );
}

export function TrustScoreHistoryPanel() {
  const [logs, setLogs] = useState<TrustScoreLog[]>([]);
  const [currentScore, setCurrentScore] = useState<number>(80);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/user/trust-score/history")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setLogs(data.logs || []);
        setCurrentScore(data.currentScore ?? 80);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-500 dark:text-slate-400 font-inter leading-relaxed">
        Điểm uy tín phản ánh lịch sử nộp bài và duyệt bài. Cộng điểm khi bài được duyệt, trừ điểm khi bị từ chối hoặc vi phạm.
      </p>

      <div className={`rounded-2xl border p-5 ${getScoreBg(currentScore)}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 font-inter">
              Điểm hiện tại
            </p>
            <p className={`text-3xl font-bold mt-1 font-manrope ${getScoreColor(currentScore)}`}>
              {currentScore}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-inter">
              Tối đa 100 điểm
            </p>
          </div>
          <ShieldCheck className={`h-12 w-12 shrink-0 opacity-20 ${getScoreColor(currentScore)}`} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/50">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <History className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-inter">
            Lịch sử thay đổi
          </h2>
          {logs.length > 0 && (
            <span className="text-xs text-slate-400 font-inter ml-auto">
              {logs.length} bản ghi
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto" />
            <p className="text-sm text-slate-500 mt-3 font-inter">Đang tải...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <ShieldCheck className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-inter">
              Chưa có lịch sử thay đổi trust score
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[min(50vh,420px)] overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="shrink-0">
                  {ACTION_ICONS[log.action] || <Minus className="h-4 w-4 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 font-inter">
                    {log.description || log.action}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-inter mt-0.5">
                    {new Date(log.created_at).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {log.post_id && ` • Bài #${log.post_id.slice(0, 8)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {getChangeBadge(log.change)}
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-inter tabular-nums">
                    {log.score_after}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
