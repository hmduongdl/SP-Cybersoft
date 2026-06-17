"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { User, Mail, Building2, Loader2, X, Link, UserCircle } from "lucide-react";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountModal({ isOpen, onClose }: AccountModalProps) {
  const { data: session, status, update } = useSession();
  const router = useRouter();


  const [name, setName] = useState(session?.user?.name ?? "");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [department, setDepartment] = useState("");

  const [facebookLink, setFacebookLink] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync session data when it arrives
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setName(session.user.name ?? "");
      setEmail(session.user.email ?? "");
      setDepartment((session.user as any)?.department ?? "");
    }
  }, [session, status]);

  // Load full profile and departments from API when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);

    async function loadData() {
      try {
        const profileRes = await fetch("/api/user/profile", { cache: "no-store" });
        if (!active) return;

        if (profileRes.ok) {
          const data = await profileRes.json();
          if (data?.user) {
            setName(data.user.name ?? name);
            setUsername(data.user.username ?? "");
            setEmail(data.user.email ?? email);
            setDepartment(data.user.department ?? "");
            setFacebookLink(data.user.facebook_link ?? "");

          }
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
        toast.error("Lỗi khi tải thông tin.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error("Vui lòng nhập email liên lạc.");
      return;
    }

    setSaving(true);
    try {
      // Build payload — chỉ gửi các trường được phép cập nhật
      const payload: Record<string, unknown> = {};
      payload.email = email.trim();

      payload.facebook_link = facebookLink.trim() || null;

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Cập nhật thất bại.");
      }

      if (update) {
        await update();
      }

      window.dispatchEvent(new CustomEvent("profile-updated"));
      toast.success("Cập nhật thông tin cá nhân thành công!");
      router.refresh();
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi khi lưu thông tin.";
      console.error(error);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const departmentLabel =
    department === "SALES" ? "Phòng Kinh Doanh" : "Phòng Kỹ Thuật";
  const departmentBadgeClass =
    department === "SALES"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-sky-50 text-sky-700 border-sky-200";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Tài khoản cá nhân</h2>
            <p className="text-sm text-slate-500 mt-0.5">Quản lý thông tin cá nhân của bạn.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {status === "loading" || loading ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-9 w-9 animate-spin text-indigo-600" />
              <p className="text-sm">Đang tải thông tin tài khoản...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-6">


              {/* Grid fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* KHÓA CỨNG: Họ và tên */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                    <UserCircle className="w-4 h-4 text-slate-400" /> Họ và tên
                  </label>
                  <input
                    type="text"
                    value={name ?? ""}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>

                {/* KHÓA CỨNG: Tên đăng nhập */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                    <User className="w-4 h-4 text-slate-400" /> Tên đăng nhập
                  </label>
                  <input
                    type="text"
                    value={username ?? ""}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>

                {/* KHÓA CỨNG: Phòng ban — badge tĩnh */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                    <Building2 className="w-4 h-4 text-slate-400" /> Phòng ban
                  </label>
                  <div className="pt-1">
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${departmentBadgeClass}`}
                    >
                      {departmentLabel}
                    </span>
                  </div>
                </div>

                {/* CHO PHÉP SỬA: Email liên lạc (Gmail) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                    <Mail className="w-4 h-4 text-slate-400" /> Email liên lạc
                  </label>
                  <input
                    type="email"
                    value={email ?? ""}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nguyenvana@gmail.com"
                    disabled={saving}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* CHO PHÉP SỬA: Link Facebook */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase">
                    <Link className="w-4 h-4 text-slate-400" /> Link Facebook
                  </label>
                  <input
                    type="url"
                    value={facebookLink ?? ""}
                    onChange={(e) => setFacebookLink(e.target.value)}
                    placeholder="https://facebook.com/username"
                    disabled={saving}
                    className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>


              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu thay đổi</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
