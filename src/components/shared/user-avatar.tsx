"use client";

import { useState } from "react";

interface UserAvatarProps {
  name: string | null | undefined;
  src?: string | null | undefined;
  className?: string;
  size?: "sm" | "md" | "lg";
}

function getInitials(name: string | null | undefined): string {
  if (!name || !name.trim()) return "U";
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  const lastWord = parts[parts.length - 1];
  return lastWord.charAt(0).toUpperCase();
}

const sizeClasses = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-2xl",
};

const imageSizeClasses = {
  sm: "h-7 w-7",
  md: "h-10 w-10",
  lg: "h-16 w-16",
};

const bgColors = [
  "bg-indigo-600 text-indigo-50",
  "bg-emerald-600 text-emerald-50",
  "bg-slate-700 text-slate-100",
  "bg-indigo-500 text-indigo-50",
  "bg-teal-600 text-teal-50",
];

function getColorClass(initials: string): string {
  const charCode = initials.charCodeAt(0) || 0;
  return bgColors[charCode % bgColors.length];
}

export function UserAvatar({ name, src, className = "", size = "md" }: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        className={`${imageSizeClasses[size]} rounded-full object-cover border-2 border-white shadow-sm shrink-0 ${className}`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  const initials = getInitials(name);
  const colorClass = getColorClass(initials);

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold tracking-wide shadow-sm shrink-0 ${colorClass} ${className}`}
      title={name || "Người dùng"}
    >
      {initials}
    </div>
  );
}
