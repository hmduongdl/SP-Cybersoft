"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { X, ShieldCheck } from "lucide-react";

interface VerificationBannerProps {
  onOpenProfile: () => void;
}

/**
 * Non-blocking banner nhắc nhở người dùng hoàn thiện hồ sơ.
 * Chỉ hiển thị khi thiếu email hoặc facebook_link.
 * Người dùng có thể đóng banner bất cứ lúc nào.
 */
export function VerificationBanner({ onOpenProfile }: VerificationBannerProps) {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const user = session?.user;
  if (!user) return null;

  // Coi là verified khi có đủ: name, email, facebook_link
  const hasName = !!user.name?.trim();
  const hasEmail = !!user.email?.trim();
  const hasFacebook = !!(user as any).facebook_link?.trim();

  const isVerified = hasName && hasEmail && hasFacebook;
  if (isVerified) return null;

  // Build danh sách trường còn thiếu
  const missing: string[] = [];
  if (!hasName) missing.push("Họ tên");
  if (!hasEmail) missing.push("Email");
  if (!hasFacebook) missing.push("Link Facebook");

  return (
    <div
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-inter"
      style={{
        background: "linear-gradient(90deg, #dae1ff 0%, #eef1ff 100%)",
        borderBottom: "1px solid #c4ceff",
      }}
    >
      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
      <p className="flex-1 text-primary font-medium text-xs sm:text-sm">
        Hồ sơ chưa đầy đủ — còn thiếu:{" "}
        <span className="font-bold">{missing.join(", ")}</span>.{" "}
        <button
          type="button"
          onClick={onOpenProfile}
          className="underline underline-offset-2 hover:opacity-70 transition-opacity font-semibold"
        >
          Cập nhật ngay
        </button>
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 rounded-lg hover:bg-primary/10 text-primary/60 hover:text-primary transition-all shrink-0"
        aria-label="Đóng thông báo"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
