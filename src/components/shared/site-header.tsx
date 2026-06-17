"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, User, LogOut, ChevronDown } from "lucide-react";
import { useLayout } from "./layout-context";
import Link from "next/link";
import { AccountModal } from "../AccountModal";
import { UserAvatar } from "./user-avatar";

export function SiteHeader() {
  const pathname = usePathname();
  const { setSidebarOpen, role } = useLayout();
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<any>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
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
      <header className="h-16 w-full backdrop-blur-md bg-white/80 border-b border-slate-200/80 sticky top-0 z-30 px-6 flex items-center justify-between shadow-sm transition-all duration-200">
        {/* Left side: Hamburger (mobile) + Breadcrumbs */}
        <div className="flex items-center gap-4">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-1.5 text-sm font-medium" aria-label="Breadcrumb">
            <Link href="/dashboard" className="text-slate-500 hover:text-slate-800 transition-colors">
              Trang chủ
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <span key={crumb.href} className="flex items-center space-x-1.5">
                <span className="text-slate-300">/</span>
                <span
                  className={
                    idx === breadcrumbs.length - 1
                      ? "text-slate-900 font-semibold"
                      : "text-slate-500 hover:text-slate-800 transition-colors"
                  }
                >
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        </div>

        {/* Right side: Search, Department, Bell, User Dropdown */}
        <div className="flex items-center gap-4">
          {/* Quick Search Box (⌘K) */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-400 text-xs w-44 lg:w-48 hover:bg-slate-100/70 hover:border-slate-300 transition duration-150 cursor-pointer select-none">
            <span className="material-symbols-outlined text-[16px]">search</span>
            <span>Tìm kiếm...</span>
            <kbd className="ml-auto font-sans text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 px-1 rounded">⌘K</kbd>
          </div>

          {/* Department Badge */}
          <div className="hidden xs:flex">
            <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-3 py-0.5 text-xs font-semibold text-indigo-700 shadow-sm whitespace-nowrap">
              {userDepartment}
            </span>
          </div>

          {/* Notification Bell */}
          <button className="relative p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition duration-150">
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white" />
          </button>

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            {status === "loading" ? (
              <div className="flex items-center gap-2 p-1.5 animate-pulse">
                <div className="h-7 w-7 rounded-full bg-slate-200" />
                <div className="h-4 w-20 bg-slate-200 rounded hidden sm:block" />
              </div>
            ) : (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-50 transition text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200"
              >
                <UserAvatar name={userDisplayName} size="sm" />
                <span className="text-sm font-medium hidden sm:block max-w-[120px] truncate">
                  {userDisplayName}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
              </button>
            )}

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <UserAvatar name={userDisplayName} size="md" />
                  <div className="overflow-hidden text-left flex-1">
                    <h4 className="text-sm font-semibold text-slate-900 truncate">{userDisplayName}</h4>
                    <p className="text-xs text-slate-500 truncate">{userEmail || "Chưa cập nhật email"}</p>
                  </div>
                </div>

                <div className="px-4 py-2.5 flex items-center gap-1.5">
                  <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                    Quyền: {role === "ADMIN" ? "Admin" : "Nhân viên"}
                  </span>
                  {userDepartment && (
                    <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {userDepartment}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-1 border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600 rounded-lg transition-colors text-left"
                  >
                    <User className="h-4 w-4" />
                    Thông tin tài khoản
                  </button>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors text-left"
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

