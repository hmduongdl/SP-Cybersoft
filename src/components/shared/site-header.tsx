"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, User, LogOut, Bell, FileText, ShieldCheck, ShieldAlert } from "lucide-react";
import { useLayout } from "./layout-context";
import Link from "next/link";
import { PersonalSettingsModal } from "./PersonalSettingsModal";
import { UserAvatar } from "./user-avatar";
import { VerificationBanner } from "./verification-banner";

interface RecentPost {
  id: string;
  title: string;
  description: string;
  start_at: string;
  isNew: boolean;
}

export function SiteHeader() {
  const pathname = usePathname();
  const { setSidebarOpen, isOpenPersonalSettings, setOpenPersonalSettings } = useLayout();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const role = session?.user?.role || profile?.role;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
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
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setProfile(data.user);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchProfile();
  }, [session]);

  // Re-fetch profile when profile-updated event fires (e.g. after modal save)
  useEffect(() => {
    window.addEventListener("profile-updated", fetchProfile);
    return () => window.removeEventListener("profile-updated", fetchProfile);
  }, []);

  // Fetch recent posts for notifications
  const fetchRecentPosts = () => {
    fetch("/api/posts?page=1&limit=5", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.posts) {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          setRecentPosts(
            data.posts.map((p: any) => ({
              id: p.id,
              title: p.title,
              description: p.description,
              start_at: p.start_at,
              isNew: new Date(p.start_at) >= todayStart,
            }))
          );
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchRecentPosts();
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
      reports: "Báo cáo cá nhân",
      timetable: "Thời gian biểu",
      "task-manager": "Task Manager",
      tasks: "Task Manager",
      "seo-tools": "Công cụ nội dung",
      admin: "Quản trị",
      queue: "Duyệt Bài",
      analytics: "Reports",
      posts: "Quản lý Post",
      accounts: "Quản lý Account",
      account: "Quản lý Account",
      settings: "Cấu hình Hệ thống",
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
          {/* Department Badge */}
          {rawDepartment && (
            <div className="hidden xs:flex">
              <span className="inline-flex items-center rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-on-secondary-container whitespace-nowrap">
                {departmentLabel}
              </span>
            </div>
          )}

          {/* Notification Bell */}
          <div className="relative shrink-0" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchRecentPosts(); }}
              className="relative w-9 h-9 flex items-center justify-center bg-surface-container text-on-surface-variant hover:text-on-surface rounded-[10px] transition-all duration-150"
            >
              <Bell className="h-5 w-5" />
              {recentPosts.some(p => p.isNew) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <div className="fixed inset-x-3 top-[3.75rem] sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 w-auto sm:w-80 max-w-[calc(100vw-1.5rem)] origin-top-right rounded-2xl border-none bg-surface-container-lowest p-2 shadow-[0_32px_64px_rgba(19,27,46,0.12)] ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-none">
                  <h4 className="text-sm font-bold text-on-surface font-manrope">Thông báo</h4>
                  <p className="text-xs text-on-surface-variant font-inter">
                    {recentPosts.filter(p => p.isNew).length > 0
                      ? `${recentPosts.filter(p => p.isNew).length} bài viết mới hôm nay`
                      : 'Không có bài viết mới'}
                  </p>
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {recentPosts.length > 0 ? (
                    recentPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={role === "ADMIN" ? "/admin/posts" : "/like-share"}
                        onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low rounded-xl transition-all duration-150 group"
                      >
                        <div className="shrink-0 mt-0.5">
                          <FileText className="h-4 w-4 text-outline group-hover:text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-on-surface truncate font-inter">
                              {post.title}
                            </p>
                            {post.isNew && (
                              <span className="shrink-0 px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold font-inter">
                                MỚI
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1 font-inter">
                            {post.description || "Không có mô tả"}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-outline font-inter">
                      Chưa có thông báo nào
                    </div>
                  )}
                </div>
                <Link
                  href={role === "ADMIN" ? "/admin/posts" : "/like-share"}
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
