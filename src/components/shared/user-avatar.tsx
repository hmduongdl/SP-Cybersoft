"use client";

import { useState, useEffect } from "react";

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
  "bg-primary text-on-primary",
  "bg-secondary-container text-on-secondary-container",
  "bg-surface-container-high text-on-surface",
  "bg-primary-container text-primary-fixed",
  "bg-tertiary-fixed text-on-tertiary-fixed-variant",
];

function getColorClass(initials: string): string {
  const charCode = initials.charCodeAt(0) || 0;
  return bgColors[charCode % bgColors.length];
}

export function UserAvatar({ name, src, className = "", size = "md" }: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  // Reset error state when src changes
  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        referrerPolicy="no-referrer"
        className={`${imageSizeClasses[size]} rounded-full object-cover shadow-ambient shrink-0 ${className}`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  const initials = getInitials(name);
  const colorClass = getColorClass(initials);

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold tracking-wide shadow-ambient shrink-0 ${colorClass} ${className}`}
      title={name || "Người dùng"}
    >
      {initials}
    </div>
  );
}
