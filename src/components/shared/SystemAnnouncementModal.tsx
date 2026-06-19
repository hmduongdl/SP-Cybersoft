"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Megaphone, FileText, ExternalLink } from "lucide-react";

interface AnnouncementData {
  id: string;
  title: string;
  content: string;
  image_url?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  is_active: boolean;
}

export default function SystemAnnouncementModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<AnnouncementData | null>(null);

  useEffect(() => {
    const wasShown = sessionStorage.getItem("sps_announcement_shown");
    if (wasShown) return;

    fetch("/api/announcement")
      .then((res) => res.json())
      .then((json) => {
        const announcement = json?.announcement;
        if (announcement?.is_active) {
          setData(announcement);
          setIsOpen(true);
          sessionStorage.setItem("sps_announcement_shown", "true");
        }
      })
      .catch((err) => console.error("Failed to fetch announcement:", err));
  }, []);

  const handleClose = useCallback(() => setIsOpen(false), []);

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-3 rounded-t-2xl z-10">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Megaphone size={20} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900 truncate">
              {data.title}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Thông báo hệ thống
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Content text */}
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {data.content}
          </div>

          {/* Image */}
          {data.image_url && (
            <img
              src={data.image_url}
              alt={data.title}
              className="w-full rounded-xl border border-slate-200"
            />
          )}

          {/* File attachment */}
          {data.file_url && (
            <a
              href={data.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <FileText size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-slate-800 truncate group-hover:text-indigo-700">
                  {data.file_name || "Tệp đính kèm"}
                </p>
              </div>
              <ExternalLink
                size={14}
                className="text-slate-400 group-hover:text-indigo-500 flex-shrink-0"
              />
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 rounded-b-2xl">
          <button
            onClick={handleClose}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Tôi đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
