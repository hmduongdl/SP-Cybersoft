"use client";

import { useCallback, useEffect, useState } from "react";

export interface FeatureQuotaSnapshot {
  used: number;
  limit: number;
  isUnlimited: boolean;
  resetsAt: string;
}

export interface FeatureQuotasState {
  aiStudio: FeatureQuotaSnapshot | null;
  reportExport: FeatureQuotaSnapshot | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useFeatureQuotas(): FeatureQuotasState {
  const [aiStudio, setAiStudio] = useState<FeatureQuotaSnapshot | null>(null);
  const [reportExport, setReportExport] = useState<FeatureQuotaSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/user/feature-quotas");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.aiStudio) setAiStudio(data.aiStudio);
      if (data?.reportExport) setReportExport(data.reportExport);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { aiStudio, reportExport, loading, refresh };
}

export function isQuotaExhausted(quota: FeatureQuotaSnapshot | null): boolean {
  if (!quota || quota.isUnlimited) return false;
  return quota.used >= quota.limit;
}
