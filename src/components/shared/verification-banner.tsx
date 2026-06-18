"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { X, ShieldAlert } from "lucide-react";

interface VerificationBannerProps {
  onOpenProfile: () => void;
}

/**
 * Non-blocking banner nhắc nhở người dùng hoàn thiện hồ sơ.
 * Chỉ hiển thị khi is_verified = false trong session.
 * Người dùng có thể đóng banner bất cứ lúc nào mà không bị block.
 */
export function VerificationBanner({ onOpenProfile }: VerificationBannerProps) {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const user = session?.user;
  if (!user) return null;

  // Dùng is_verified trực tiếp từ session (sync với DB)
  if (user.is_verified === true) return null;

  return (
    <div
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-inter"
      style={{
        background: "linear-gradient(90deg, #fff7ed 0%, #fffbeb 100%)",
        borderBottom: "1px solid #fde68a",
      }}
    >
      <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
      <p className="flex-1 text-amber-800 font-medium text-xs sm:text-sm">
        Hồ sơ của bạn chưa được xác minh.{" "}
        <button
          type="button"
          onClick={onOpenProfile}
          className="underline underline-offset-2 font-semibold hover:opacity-70 transition-opacity"
        >
          Cập nhật thông tin ngay
        </button>{" "}
        để được xác minh.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 rounded-lg hover:bg-amber-100 text-amber-500/70 hover:text-amber-600 transition-all shrink-0"
        aria-label="Đóng thông báo"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
