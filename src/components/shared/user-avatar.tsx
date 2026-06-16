"use client";

import { useState } from "react";

interface UserAvatarProps {
  src: string | null | undefined;
  name: string | null | undefined;
  size?: "sm" | "md";
}

/**
 * Avatar component hiển thị ảnh người dùng.
 * Khi không có ảnh hoặc ảnh lỗi → fallback chữ cái đầu tên.
 */
export function UserAvatar({ src, name, size = "md" }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const dims = size === "sm" ? "h-7 w-7 text-[11px]" : "h-10 w-10 text-sm";
  const border = size === "sm" ? "border-slate-200" : "border-slate-800";

  const initials = (name || "U")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hasSrc = src && !imgError;

  if (hasSrc) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        className={`${dims} rounded-full object-cover border ${border} group-hover:scale-105 transition-transform duration-200`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`${dims} rounded-full border ${border} bg-indigo-600 flex items-center justify-center text-white font-bold shrink-0`}
      title={name || "Người dùng"}
    >
      {initials}
    </div>
  );
}
