"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, User, Facebook, LogOut, ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";
import { useLayout } from "./layout-context";
import Link from "next/link";
import { ProfileModal } from "./profile-modal";

export function SiteHeader() {
  const pathname = usePathname();
  const { setSidebarOpen, role } = useLayout();
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Map pathnames to breadcrumbs
  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return [{ label: "Tổng quan", href: "/dashboard" }];

    const breadcrumbs = [];
    let currentPath = "";

    const labelMap: Record<string, string> = {
      dashboard: "Tổng quan",
      calendar: "Lịch Công Việc",
      posts: "Danh Sách Bài Share",
      admin: "Quản trị",
      reports: "Báo Cáo Chi Tiết",
      login: "Đăng nhập",
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

  // Extract user info (simulated fallback if no active next-auth session)
  const userDisplayName = session?.user?.name || (role === "ADMIN" ? "Administrator" : "Thành viên Demo");
  const userEmail = session?.user?.email || (role === "ADMIN" ? "admin@kinetic.hr" : "member@kinetic.hr");
  const userImage = session?.user?.image || null;
  const isFacebookLinked = session?.user?.hasFacebook ?? (role === "ADMIN" ? true : false);

  return (
    <>
      <header className="h-16 w-full bg-white border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between shadow-sm">
        {/* Left side: Hamburger (mobile) + Breadcrumbs */}
        <div className="flex items-center gap-4">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-1.5 text-sm font-medium" aria-label="Breadcrumb">
            <Link href="/dashboard" className="text-slate-500 hover:text-slate-800 transition">
              Trang chủ
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <span key={crumb.href} className="flex items-center space-x-1.5">
                <span className="text-slate-300">/</span>
                <span
                  className={
                    idx === breadcrumbs.length - 1
                      ? "text-slate-900 font-semibold"
                      : "text-slate-500 hover:text-slate-800 transition"
                  }
                >
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        </div>

        {/* Right side: User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-slate-50 transition text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200"
          >
            {userImage ? (
              <img
                src={userImage}
                alt={userDisplayName}
                className="h-7 w-7 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                {userDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium hidden sm:block max-w-[120px] truncate">
              {userDisplayName}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
              {/* User Info Header */}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tài khoản</p>
                <p className="text-sm font-semibold text-slate-900 mt-1 truncate">{userDisplayName}</p>
                <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                    Quyền: {role === "ADMIN" ? "Admin" : "User"}
                  </span>
                </div>
              </div>

              {/* Facebook Status Section */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-[#1877F2]" />
                  <span className="text-xs font-medium text-slate-600">Facebook:</span>
                </div>
                {isFacebookLinked ? (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Đã liên kết
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                    Chưa liên kết
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600 rounded-lg transition"
                >
                  <User className="h-4 w-4" />
                  Thông tin tài khoản
                </button>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </>
  );
}
