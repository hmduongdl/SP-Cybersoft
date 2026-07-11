"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, User, LogOut, Bell, FileText, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Sparkles, Wallet, Trophy } from "lucide-react";
import { useLayout } from "./layout-context";
import Link from "next/link";
import { PersonalSettingsModal } from "./PersonalSettingsModal";
import { UserAvatar } from "./user-avatar";
import { VerificationBanner } from "./verification-banner";
import { usePlan } from "@/hooks/usePlan";
import { twMerge } from "tailwind-merge";

interface RecentPost {
  id: string;
  title: string;
  description: string;
  start_at: string;
  isNew: boolean;
}

interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  PC_BUILD_APPROVED: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  PC_BUILD_AUTO_APPROVED: <Sparkles className="h-4 w-4 text-emerald-500" />,
  PC_BUILD_REJECTED: <XCircle className="h-4 w-4 text-rose-500" />,
};

export function SiteHeader() {
  const pathname = usePathname();
  const { setSidebarOpen, isOpenPersonalSettings, setOpenPersonalSettings } = useLayout();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const { plan: userPlan, label: planLabel } = usePlan({
    role: profile?.role || session?.user?.role || "USER",
    plan: profile?.plan || "FREE",
    planExpiresAt: profile?.plan_expires_at,
  });
  const role = session?.user?.role || profile?.role;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch profile to display actual department
  const fetchProfile = () => {
    fetch("/api/user/profile", { cache: "no-store" })
      .then((res) => {
        const contentType = res.headers.get("content-type") ?? "";
        return contentType.includes("application/json") ? res.json() : Promise.reject("non-JSON response");
      })
      .then((data) => {
        if (data.user) setProfile(data.user);
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
    }
  }, [session?.user?.id]);

  // Re-fetch profile when profile-updated event fires (e.g. after modal save)
  useEffect(() => {
    window.addEventListener("profile-updated", fetchProfile);
    return () => window.removeEventListener("profile-updated", fetchProfile);
  }, []);

  // Fetch recent posts and app notifications
  const fetchNotifications = () => {
    Promise.all([
      fetch("/api/posts?page=1&limit=5", { cache: "no-store" }).then(res => {
        const ct = res.headers.get("content-type") ?? "";
        return ct.includes("application/json") ? res.json() : {};
      }),
      fetch("/api/notifications", { cache: "no-store" }).then(res => {
        const ct = res.headers.get("content-type") ?? "";
        return ct.includes("application/json") ? res.json() : {};
      }),
    ])
      .then(([postsData, notifData]: [any, any]) => {
        if (postsData.posts) {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          setRecentPosts(
            postsData.posts.map((p: any) => ({
              id: p.id,
              title: p.title,
              description: p.description,
              start_at: p.start_at,
              isNew: new Date(p.start_at) >= todayStart,
            }))
          );
        }
        if (notifData.notifications) {
          setAppNotifications(notifData.notifications);
          setUnreadCount(notifData.unreadCount || 0);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Map pathnames to breadcrumbs
  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return [{ label: "Tổng quan", href: "/dashboard" }];

    const breadcrumbs = [];
    let currentPath = "";

    const labelMap: Record<string, string> = {
      dashboard: "Tổng quan",
      "like-share": "Like - Share",
      "build-pc": "Build PC",
      reports: "Báo cáo cá nhân",
      timetable: "Thời gian biểu",
      "task-manager": "Task Manager",
      tasks: "Task Manager",
      "seo-tools": "AI Studio",
      "ai-chat": "AI Chat",
      admin: "Quản trị",
      queue: "Duyệt Bài",
      analytics: "Reports",
      posts: "Quản lý Post",
      accounts: "Quản lý Account",
      account: "Quản lý Account",
      login: "Đăng nhập",
      create: "Tạo mới",
      edit: "Chỉnh sửa",
      detail: "Chi tiết",
    };

    for (const segment of segments) {
      currentPath += `/${segment}`;
      breadcrumbs.push({
        label: labelMap[segment] || segment,
        href: currentPath,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const userDisplayName = session?.user?.name || profile?.name || "Thành viên";
  const userEmail = session?.user?.email || profile?.email || "";
  const rawDepartment = profile?.department || session?.user?.department || "";
  const departmentLabel =
    rawDepartment === "TECH" ? "Kỹ Thuật"
    : rawDepartment === "SALES" ? "Kinh Doanh"
    : rawDepartment;

  // Dùng is_verified trực tiếp từ session (đồng bộ với DB)
  const isVerified = session?.user?.is_verified === true;

  return (
    <>
      {/* Non-blocking verification banner */}
      <VerificationBanner onOpenProfile={() => setOpenPersonalSettings(true)} />

      <header className="bg-surface-mid border-b border-slate-100 sticky top-0 z-40 h-14 sm:h-16 w-full px-3 sm:px-6 flex items-center justify-between gap-2 transition-all duration-200">
        {/* Left side: Hamburger (mobile) + Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button
            className="md:hidden p-2 -ml-1 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all duration-150 shrink-0"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-1 text-sm font-medium font-inter min-w-0" aria-label="Breadcrumb">
            <Link href="/dashboard" className="text-on-surface-variant hover:text-on-surface transition-all duration-150 hidden md:inline shrink-0">
              Trang chủ
            </Link>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={crumb.href} className={`items-center space-x-1 min-w-0 ${isLast ? "flex" : "hidden md:flex"}`}>
                  <span className="text-on-surface-variant/40 shrink-0">/</span>
                  <span
                    className={
                      isLast
                        ? "text-on-surface font-semibold truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none"
                        : "text-on-surface-variant hover:text-on-surface transition-all duration-150 truncate"
                    }
                  >
                    {crumb.label}
                  </span>
                </span>
              );
            })}
          </nav>
        </div>

        {/* Right side: Department, Bell, User Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Trust, Wallet, Score, and Department Badges */}
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpenPersonalSettings(true, "trust")}
              className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-600 border border-blue-500/20 hover:bg-blue-500/20 transition-all duration-150"
            >
              <ShieldCheck className="h-3 w-3" />
              {profile?.trust_score ?? session?.user?.trust_score ?? "..."}
            </button>
            <Link
              href="/pricing"
              className={twMerge(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border transition-all duration-150 shrink-0",
                userPlan === "MAX"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 dark:text-amber-400"
                  : userPlan === "PRO"
                  ? "bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20 dark:text-purple-400"
                  : "bg-slate-500/10 text-slate-600 border-slate-500/20 hover:bg-slate-500/20 dark:text-slate-400"
              )}
            >
              <Sparkles className="h-3 w-3" />
              <span>Gói: {planLabel}</span>
            </Link>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-600 border border-purple-500/20">
              <Trophy className="h-3 w-3" />
              {profile?.pc_score ?? session?.user?.pc_score ?? "..."}
            </span>
          </div>

          {/* Notification Bell */}
          <div className="relative shrink-0" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchNotifications(); }}
              className="relative w-9 h-9 flex items-center justify-center bg-surface-container text-on-surface-variant hover:text-on-surface rounded-[10px] transition-all duration-150"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <div className="fixed inset-x-3 top-[3.75rem] sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 w-auto sm:w-80 max-w-[calc(100vw-1.5rem)] origin-top-right rounded-2xl border-none bg-surface-container-lowest p-2 shadow-[0_32px_64px_rgba(19,27,46,0.12)] ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-none flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-on-surface font-manrope">Thông báo</h4>
                    <p className="text-xs text-on-surface-variant font-inter">
                      {unreadCount > 0
                        ? `${unreadCount} thông báo chưa đọc`
                        : 'Không có thông báo mới'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => {
                          fetch("/api/notifications", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ markAll: true }),
                          }).then(() => {
                            setAppNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                            setUnreadCount(0);
                          });
                        }}
                        className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-lg hover:bg-primary-container/50"
                      >
                        Đã đọc tất cả
                      </button>
                    )}
                    {appNotifications.length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm("Xóa toàn bộ thông báo?")) {
                            fetch("/api/notifications", {
                              method: "DELETE",
                            }).then(() => {
                              setAppNotifications([]);
                              setUnreadCount(0);
                            });
                          }
                        }}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50"
                      >
                        Xóa tất cả
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {/* App notifications (PC build results, etc.) */}
                  {appNotifications.length > 0 && (
                    <div className="space-y-0.5 mb-1">
                      {appNotifications.slice(0, 5).map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => {
                            if (!notif.is_read) {
                              fetch("/api/notifications", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ notificationId: notif.id }),
                              });
                              setAppNotifications(prev =>
                                prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
                              );
                              setUnreadCount(prev => Math.max(0, prev - 1));
                            }
                            setNotifOpen(false);
                          }}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low rounded-xl transition-all duration-150 w-full text-left ${
                            !notif.is_read ? 'bg-primary-container/10' : ''
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {NOTIFICATION_ICONS[notif.type] || <Bell className="h-4 w-4 text-outline" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm truncate font-inter ${
                                notif.is_read ? 'text-on-surface-variant' : 'text-on-surface font-semibold'
                              }`}>
                                {notif.title}
                              </p>
                              {!notif.is_read && (
                                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary" />
                              )}
                            </div>
                            <p className={`text-xs mt-0.5 line-clamp-1 font-inter ${
                              notif.is_read ? 'text-on-muted' : 'text-on-surface-variant'
                            }`}>
                              {notif.message}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Post notifications */}
                  {recentPosts.length > 0 ? (
                    recentPosts.map((post) => (
                      <Link
                        key={post.id}
                        href="/like-share"
                        onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low rounded-xl transition-all duration-150 group"
                      >
                        <div className="shrink-0 mt-0.5">
                          <FileText className="h-4 w-4 text-outline group-hover:text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-on-surface-variant truncate font-inter">
                              {post.title}
                            </p>
                            {post.isNew && (
                              <span className="shrink-0 px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold font-inter">
                                MỚI
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-muted mt-0.5 line-clamp-1 font-inter">
                            {post.description || "Không có mô tả"}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : appNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-outline font-inter">
                      Chưa có thông báo nào
                    </div>
                  ) : null}
                </div>
                {appNotifications.length > 5 && (
                  <div className="px-4 py-2 text-center text-[10px] text-on-muted font-inter">
                    ...và {appNotifications.length - 5} thông báo cũ hơn
                  </div>
                )}
                <Link
                  href="/like-share"
                  onClick={() => setNotifOpen(false)}
                  className="block mt-1 py-2.5 text-center text-xs font-semibold text-primary hover:bg-surface-container rounded-xl transition-all duration-150 border-none font-inter"
                >
                  Xem tất cả bài viết
                </Link>
              </div>
            )}
          </div>

          {/* User Dropdown */}
          <div className="relative shrink-0" ref={dropdownRef}>
            {status === "loading" ? (
              <div className="w-9 h-9 rounded-[10px] bg-surface-container animate-pulse" />
            ) : (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="relative w-9 h-9 flex items-center justify-center bg-surface-container rounded-[10px] hover:opacity-90 transition-all overflow-hidden shrink-0"
              >
                <div className="w-full h-full overflow-hidden rounded-[10px] flex items-center justify-center">
                  <UserAvatar 
                    name={userDisplayName} 
                    src={profile?.avatar_url || (session?.user as any)?.avatar_url} 
                    size="md" 
                    className="w-full h-full object-cover rounded-none shadow-none"
                  />
                </div>
              </button>
            )}

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="fixed inset-x-3 top-[3.75rem] sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 w-auto sm:w-64 max-w-[calc(100vw-1.5rem)] origin-top-right rounded-2xl border-none bg-surface-container-lowest p-2 shadow-[0_32px_64px_rgba(19,27,46,0.12)] ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Info Header */}
                <div className="px-4 py-3 border-none flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[10px] overflow-hidden flex items-center justify-center shrink-0">
                    <UserAvatar 
                      name={userDisplayName} 
                      src={profile?.avatar_url || (session?.user as any)?.avatar_url} 
                      size="md" 
                      className="w-full h-full object-cover rounded-none shadow-none"
                    />
                  </div>
                  <div className="overflow-hidden text-left flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-semibold text-on-surface truncate font-inter">{userDisplayName}</h4>
                      {isVerified ? (
                        <span title="Hồ sơ đã xác minh" className="shrink-0">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        </span>
                      ) : (
                        <span title="Hồ sơ chưa đầy đủ" className="shrink-0">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant truncate font-inter">{userEmail || "Chưa cập nhật email"}</p>
                  </div>
                </div>

                <div className="px-4 py-2.5 flex items-center gap-1.5">
                  <span className="rounded-full bg-primary-container px-2 py-0.5 text-[10px] font-semibold text-primary font-inter">
                    Quyền: {role === "ADMIN" ? "Admin" : "Nhân viên"}
                  </span>
                  {rawDepartment && (
                    <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-semibold text-on-secondary-container font-inter">
                      {departmentLabel}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-1 border-none pt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setOpenPersonalSettings(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container hover:text-primary rounded-xl transition-all duration-150 text-left font-inter"
                  >
                    <User className="h-4 w-4" />
                    Thông tin tài khoản
                  </button>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-all duration-150 text-left font-inter"
                  >
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <PersonalSettingsModal isOpen={isOpenPersonalSettings} onClose={() => setOpenPersonalSettings(false)} />
    </>
  );
}
