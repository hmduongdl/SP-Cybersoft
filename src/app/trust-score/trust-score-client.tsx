"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, TrendingUp, TrendingDown, Minus, History, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
      <span className="inline-flex items-center gap-0.5 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md text-xs font-semibold">
        <TrendingUp className="h-3 w-3" />+{change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md text-xs font-semibold">
        <TrendingDown className="h-3 w-3" />{change}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md text-xs font-semibold">
      <Minus className="h-3 w-3" />0
    </span>
  );
}

export default function TrustScoreClient() {
  const [logs, setLogs] = useState<TrustScoreLog[]>([]);
  const [currentScore, setCurrentScore] = useState<number>(80);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/trust-score/history")
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs || []);
        setCurrentScore(data.currentScore ?? 80);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-on-surface font-manrope">Lịch sử Trust Score</h1>
        </div>
        <p className="text-sm text-on-surface-variant mt-1 font-inter">
          Theo dõi điểm uy tín của bạn và lịch sử thay đổi
        </p>
      </div>

      {/* Current Score Card */}
      <div className={`rounded-2xl border p-6 mb-6 ${getScoreBg(currentScore)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-on-surface-variant font-inter">Điểm hiện tại</p>
            <p className={`text-4xl font-bold mt-1 font-manrope ${getScoreColor(currentScore)}`}>
              {currentScore}
            </p>
            <p className="text-xs text-on-surface-variant mt-1 font-inter">
              Tối đa 100 điểm
            </p>
          </div>
          <div className="hidden sm:block">
            <ShieldCheck className={`h-16 w-16 opacity-20 ${getScoreColor(currentScore)}`} />
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-surface-mid rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <History className="h-4 w-4 text-on-surface-variant" />
          <h2 className="text-sm font-semibold text-on-surface font-inter">Lịch sử thay đổi</h2>
          {logs.length > 0 && (
            <span className="text-xs text-on-surface-variant font-inter ml-auto">
              {logs.length} bản ghi
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-on-surface-variant mt-3 font-inter">Đang tải...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <ShieldCheck className="h-10 w-10 text-on-muted mx-auto mb-3" />
            <p className="text-sm text-on-surface-variant font-inter">
              Chưa có lịch sử thay đổi trust score
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-surface-container-low transition-colors">
                <div className="shrink-0">
                  {ACTION_ICONS[log.action] || <Minus className="h-4 w-4 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface font-inter">
                    {log.description || log.action}
                  </p>
                  <p className="text-xs text-on-surface-variant font-inter mt-0.5">
                    {new Date(log.created_at).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {log.post_id && " • Bài #" + log.post_id.slice(0, 8)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {getChangeBadge(log.change)}
                  <span className="text-xs text-on-surface-variant font-inter">
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
