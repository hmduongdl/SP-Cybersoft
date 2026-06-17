"use client";

import { useState } from "react";
import Image from "next/image";

interface UserAvatarProps {
  src: string | null | undefined;
  name: string | null | undefined;
  size?: "sm" | "md";
}

/**
 * Avatar component hiển thị ảnh người dùng.
 * Khi không có ảnh hoặc ảnh lỗi → fallback SVG person icon.
 */
export function UserAvatar({ src, name, size = "md" }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const dims = size === "sm" ? "h-7 w-7 text-[11px]" : "h-10 w-10 text-sm";
  const border = size === "sm" ? "border-slate-200" : "border-slate-800";

  const hasSrc = src && !imgError;

  if (hasSrc) {
    return (
      <div className={`${dims} relative rounded-full overflow-hidden border ${border} bg-slate-700 group-hover:scale-105 transition-transform duration-200`}>
        <Image
          src={src}
          alt={name || "Avatar"}
          fill
          className="object-cover"
          sizes="40px"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${dims} rounded-full border ${border} bg-slate-700 flex items-center justify-center shrink-0`}
      title={name || "Người dùng"}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={size === "sm" ? "w-4 h-4 text-slate-400" : "w-5 h-5 text-slate-400"}
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8" />
      </svg>
    </div>
  );
}
