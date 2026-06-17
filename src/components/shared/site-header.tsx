"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, User, LogOut, ChevronDown, Bell, FileText, ExternalLink } from "lucide-react";
import { useLayout } from "./layout-context";
import Link from "next/link";
import { AccountModal } from "../AccountModal";
import { UserAvatar } from "./user-avatar";

interface RecentPost {
  id: string;
  title: string;
  description: string;
  start_at: string;
  isNew: boolean;
}

const AUTHOR_LABELS: Record<string, string> = {
  songphuong_tech: "Song Phương Technology",
  songphuong: "Song Phương",
};

export function SiteHeader() {
  const pathname = usePathname();
  const { setSidebarOpen, role } = useLayout();
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<any>(null);
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
      posts: "Bài Share",
      admin: "Quản trị",
      queue: "Duyệt Bài",
      analytics: "Báo Cáo Chi Tiết",
      login: "Đăng nhập",
      settings: "Cấu hình",
      accounts: "Quản lý Tài khoản",
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
  const isFacebookLinked = profile?.facebook_profile_url ? true : false;
  const userDepartment = profile?.department || session?.user?.department || "";

  return (
    <>
      <header className="h-16 w-full backdrop-blur-md bg-surface-container-lowest/80 border-none/80 sticky top-0 z-30 px-6 flex items-center justify-between shadow-ambient transition-all duration-200">
        {/* Left side: Hamburger (mobile) + Breadcrumbs */}
        <div className="flex items-center gap-4">
          <button
            className="md:hidden p-2 rounded-lg-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-1.5 text-xs xs:text-sm font-medium" aria-label="Breadcrumb">
            <Link href="/dashboard" className="text-on-surface-variant hover:text-on-surface transition-colors hidden md:inline">
              Trang chủ
            </Link>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={crumb.href} className={`items-center space-x-1.5 ${isLast ? "flex" : "hidden md:flex"}`}>
                  <span className="text-outline">/</span>
                  <span
                    className={
                      isLast
                        ? "text-on-surface font-semibold truncate max-w-[120px] sm:max-w-none"
                        : "text-on-surface-variant hover:text-on-surface transition-colors"
                    }
                  >
                    {crumb.label}
                  </span>
                </span>
              );
            })}
          </nav>
        </div>

        {/* Right side: Search, Department, Bell, User Dropdown */}
        <div className="flex items-center gap-4">
          {/* Department Badge */}
          <div className="hidden xs:flex">
            <span className="inline-flex items-center rounded-lg-full bg-indigo-50 border border-indigo-100 px-3 py-0.5 text-xs font-semibold text-indigo-700 shadow-ambient whitespace-nowrap">
              {userDepartment}
            </span>
          </div>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchRecentPosts(); }}
              className="relative p-1.5 text-outline hover:text-on-surface-variant rounded-lg-full hover:bg-surface-container-low transition duration-150"
            >
              <Bell className="h-5 w-5" />
              {recentPosts.some(p => p.isNew) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-lg-full border border-white animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-lg-2xl border-none bg-surface-container-lowest p-2 shadow-ambient ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-none">
                  <h4 className="text-sm font-bold text-on-surface">Thông báo</h4>
                  <p className="text-xs text-on-surface-variant">
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
                        href={role === "ADMIN" ? "/admin/posts" : "/tasks"}
                        onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low rounded-lg-xl transition-colors group"
                      >
                        <div className="shrink-0 mt-0.5">
                          <FileText className="h-4 w-4 text-outline group-hover:text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-on-surface truncate">
                              {post.title}
                            </p>
                            {post.isNew && (
                              <span className="shrink-0 px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[10px] font-bold">
                                MỚI
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">
                            {post.description || "Không có mô tả"}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-outline">
                      Chưa có thông báo nào
                    </div>
                  )}
                </div>
                <Link
                  href={role === "ADMIN" ? "/admin/posts" : "/tasks"}
                  onClick={() => setNotifOpen(false)}
                  className="block mt-1 py-2.5 text-center text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg-xl transition-colors border-none"
                >
                  Xem tất cả bài viết
                </Link>
              </div>
            )}
          </div>

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            {status === "loading" ? (
              <div className="flex items-center gap-2 p-1.5 animate-pulse">
                <div className="h-7 w-7 rounded-lg-full bg-surface-container" />
                <div className="h-4 w-20 bg-surface-container rounded-lg hidden sm:block" />
              </div>
            ) : (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg-full hover:bg-surface-container-low transition text-on-surface-variant hover:text-on-surface border border-transparent hover:border-outline-variant/10"
              >
                <UserAvatar name={userDisplayName} src={profile?.avatar_url || (session?.user as any)?.avatar_url} size="sm" />
                <span className="text-sm font-medium hidden sm:block max-w-[120px] truncate">
                  {userDisplayName}
                </span>
                <ChevronDown className="h-4 w-4 text-outline hidden sm:block" />
              </button>
            )}

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-lg-2xl border-none bg-surface-container-lowest p-2 shadow-ambient ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Info Header */}
                <div className="px-4 py-3 border-none flex items-center gap-3">
                  <UserAvatar name={userDisplayName} src={profile?.avatar_url || (session?.user as any)?.avatar_url} size="md" />
                  <div className="overflow-hidden text-left flex-1">
                    <h4 className="text-sm font-semibold text-on-surface truncate">{userDisplayName}</h4>
                    <p className="text-xs text-on-surface-variant truncate">{userEmail || "Chưa cập nhật email"}</p>
                  </div>
                </div>

                <div className="px-4 py-2.5 flex items-center gap-1.5">
                  <span className="rounded-lg-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                    Quyền: {role === "ADMIN" ? "Admin" : "Nhân viên"}
                  </span>
                  {userDepartment && (
                    <span className="rounded-lg-full bg-surface-container border-none px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                      {userDepartment}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-1 border-none pt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container hover:text-indigo-600 rounded-lg-lg transition-colors text-left"
                  >
                    <User className="h-4 w-4" />
                    Thông tin tài khoản
                  </button>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg-lg transition-colors text-left"
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

      <AccountModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </>
  );
}

