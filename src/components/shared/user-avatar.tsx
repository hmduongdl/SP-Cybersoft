"use client";

import { useState, useEffect } from "react";
import { DEFAULT_AVATAR_URL, getAvatarUrl } from "@/lib/avatar";

interface UserAvatarProps {
  name: string | null | undefined;
  src?: string | null | undefined;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const imageSizeClasses = {
  sm: "h-7 w-7",
  md: "h-10 w-10",
  lg: "h-16 w-16",
};

export function UserAvatar({ name, src, className = "", size = "md" }: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const imageSrc = imgFailed ? DEFAULT_AVATAR_URL : getAvatarUrl(src);

  // Reset error state when src changes
  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={name || "Avatar"}
      referrerPolicy="no-referrer"
      className={`${imageSizeClasses[size]} rounded-full object-cover shadow-ambient shrink-0 ${className}`}
      onError={() => {
        if (imageSrc !== DEFAULT_AVATAR_URL) setImgFailed(true);
      }}
    />
  );
}
