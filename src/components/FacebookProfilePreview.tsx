"use client";

import React, { useState, useRef, useCallback } from "react";
import { ExternalLink, AlertTriangle, Loader2, User } from "lucide-react";
import Image from "next/image";

interface OGData {
  ogTitle: string | null;
  ogImage: string | null;
  ogDescription: string | null;
}

interface FacebookProfilePreviewProps {
  facebookLink: string;
}

export default function FacebookProfilePreview({ facebookLink }: FacebookProfilePreviewProps) {
  const [ogData, setOgData] = useState<OGData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOGData = useCallback(async () => {
    if (ogData || error || loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/og-scraper?url=${encodeURIComponent(facebookLink)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scrape failed");
      setOgData(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [facebookLink, ogData, error, loading]);

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setTooltipPos({
          top: rect.top - 12,
          left: rect.left + rect.width / 2,
        });
      }
      setShowTooltip(true);
      fetchOGData();
    }, 400);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowTooltip(false);
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    img.style.display = "none";
    const fallback = img.parentElement?.querySelector(".fb-avatar-fallback") as HTMLElement | null;
    fallback?.classList.remove("hidden");
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <a
        href={facebookLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="w-3 h-3" />
        Ghé thăm Facebook
        {error && !showTooltip && (
          <AlertTriangle className="w-3 h-3 text-amber-500" />
        )}
      </a>

      {showTooltip && (
        <div
          className="fixed z-[200]"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-surface-bright rounded-xl shadow-[0_32px_64px_rgba(19,27,46,0.12)] p-3 min-w-[200px] animate-in fade-in zoom-in-95 duration-150">
            {loading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-outline" />
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-amber-600 text-[10px] leading-tight">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Không thể tải thông tin. Nhấn link để mở trực tiếp.</span>
              </div>
            ) : ogData ? (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-surface-container flex-shrink-0 relative">
                  {ogData.ogImage ? (
                    <Image
                      src={ogData.ogImage}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="36px"
                      onError={handleImgError}
                    />
                  ) : null}
                  <div className={`fb-avatar-fallback w-full h-full flex items-center justify-center absolute inset-0 bg-surface-container ${ogData.ogImage ? "hidden" : ""}`}>
                    <User className="w-4 h-4 text-on-surface-variant" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-on-surface truncate leading-tight">
                    {ogData.ogTitle || "Facebook Profile"}
                  </p>
                  {ogData.ogDescription && (
                    <p className="text-[10px] text-on-surface-variant truncate mt-0.5 leading-tight">
                      {ogData.ogDescription}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
