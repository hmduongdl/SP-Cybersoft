"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLayout } from "./layout-context";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import { useState, useEffect } from "react";

import { UserAvatar } from "./user-avatar";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen, role, setRole, sidebarCollapsed, setSidebarCollapsed } = useLayout();
  const { data: session, status } = useSession();
  
  // Local profile state to display up-to-date data
  const [profile, setProfile] = useState<any>(null);

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

  const sectionedItems: Array<{
    title: string;
    adminOnly?: boolean;
    items: Array<{
      label: string;
      href: string;
      icon: string;
      adminOnly: boolean;
      devOnly?: boolean;
    }>;
  }> = [
    {
      title: "Chung",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: "dashboard", adminOnly: false },
        { label: "Like - Share", href: "/like-share", icon: "task_alt", adminOnly: false },
        { label: "Báo cáo cá nhân", href: "/reports", icon: "bar_chart", adminOnly: false },
        { label: "Task Manager", href: "/task-manager", icon: "checklist", adminOnly: false, devOnly: true },
        { label: "SEO Tools", href: "/seo-tools", icon: "trending_up", adminOnly: false, devOnly: true },
      ]
    },
    {
      title: "Quản trị",
      adminOnly: true,
      items: [
        { label: "Duyệt Bài", href: "/admin/queue", icon: "rate_review", adminOnly: true },
        { label: "Reports", href: "/admin/analytics", icon: "analytics", adminOnly: true },
        { label: "Quản lý Post", href: "/admin/posts", icon: "post_add", adminOnly: true },
        { label: "Quản lý Account", href: "/admin/accounts", icon: "manage_accounts", adminOnly: true },
        { label: "Cấu hình Hệ thống", href: "/admin/settings", icon: "settings", adminOnly: true },
      ]
    }
  ];

  const filteredSections = sectionedItems
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.adminOnly || role === "ADMIN")
    }))
    .filter(section => section.items.length > 0);

  const userDisplayName = session?.user?.name || profile?.name || "Thành viên";
  const userEmail = session?.user?.email || profile?.email || "";
  const rawDepartment = profile?.department || session?.user?.department || "";
  const departmentLabel =
    rawDepartment === "TECH" ? "Kỹ Thuật"
    : rawDepartment === "SALES" ? "Kinh Doanh"
    : rawDepartment;

  const renderSidebarContent = (collapsed: boolean, isMobile: boolean) => {
    return (
      <div className="flex flex-col h-full bg-[#0F172A] py-6 px-3 justify-between select-none">
        {/* Upper section */}
        <div className="flex flex-col gap-6">
          {/* Logo Area */}
          <div className={clsx("flex items-center justify-between px-2", collapsed ? "flex-col gap-4 py-2 justify-center" : "")}>
            {!collapsed ? (
              <div className="flex items-center gap-1">
                <span className="font-manrope font-bold text-2xl text-white tracking-tight">SPS</span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2" />
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span className="font-manrope font-bold text-2xl text-indigo-400 tracking-tight">S</span>
              </div>
            )}

            {/* Toggle / Close Button */}
            {isMobile ? (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all md:hidden"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            ) : (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex p-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all"
                title={collapsed ? "Mở rộng" : "Thu gọn"}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {collapsed ? "menu_open" : "menu"}
                </span>
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-4">
            {filteredSections.map((section) => (
              <div key={section.title} className="space-y-1">
                {/* Section Title */}
                {!collapsed && (
                  <p className="text-[11px] font-semibold tracking-[0.05em] font-inter uppercase text-slate-500 px-3 py-1">
                    {section.title}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map(({ label, href, icon, devOnly }) => {
                    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                    return (
                      <button
                        key={label}
                        onClick={() => {
                          if (devOnly && role !== "ADMIN") {
                            toast.info("Chức năng đang phát triển");
                            return;
                          }
                          if (isMobile) setSidebarOpen(false);
                          router.push(href);
                        }}
                        className={twMerge(
                          clsx(
                            "flex items-center px-3 py-2.5 rounded-lg transition-all duration-150 w-full text-left cursor-pointer gap-3 group",
                            collapsed ? "justify-center px-0 w-10 h-10 mx-auto" : "",
                            isActive
                              ? "bg-indigo-600 text-white font-medium shadow-sm shadow-indigo-500/10"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                          )
                        )}
                        title={collapsed ? label : undefined}
                      >
                        <span className={clsx(
                          "material-symbols-outlined text-[22px]",
                          isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                        )}>
                          {icon}
                        </span>
                        {!collapsed && <span className="text-sm font-medium font-inter">{label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Lower section */}
        <div className="flex flex-col gap-4">
          {/* Admin Role Sim (only if expanded & admin user) */}
          {!collapsed && session?.user?.role === "ADMIN" && (
            <div className="rounded-lg bg-slate-800/20 p-3 space-y-2 border border-slate-800/40">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-inter">Role Sim:</span>
                <span className={clsx(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold font-inter",
                  role === "ADMIN"
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "bg-slate-800/80 text-slate-300 border border-slate-700/50"
                )}>
                  {role}
                </span>
              </div>
              <button
                onClick={() => {
                  setRole(role === "ADMIN" ? "USER" : "ADMIN");
                  window.location.href = "/dashboard";
                }}
                className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 shadow-sm text-[11px] py-1.5 px-2 font-semibold font-inter transition-all"
              >
                Switch to {role === "ADMIN" ? "User" : "Admin"}
              </button>
            </div>
          )}

          {/* User Block */}
          {status === "loading" ? (
            <div className="flex items-center gap-3 p-2 bg-slate-800/20 animate-pulse justify-center rounded-lg">
              <div className="w-10 h-10 rounded-full bg-slate-800" />
              {!collapsed && (
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-2/3" />
                  <div className="h-3 bg-slate-800 rounded w-1/2" />
                </div>
              )}
            </div>
          ) : (
            <div className={clsx(
              "flex items-center justify-between p-2 rounded-lg group relative border-t border-slate-800/80",
              collapsed ? "justify-center" : "bg-slate-800/30"
            )}>
              <div className="flex items-center gap-3 overflow-hidden">
                {/* 2px gap ring using sidebar bg color (NOT a border) */}
                <div className="rounded-full p-[2px] bg-[#0F172A] ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#0F172A] bg-clip-content shrink-0">
                  <UserAvatar 
                    name={userDisplayName} 
                    src={profile?.avatar_url || (session?.user as any)?.avatar_url} 
                    size="sm"
                    className="border-none shadow-none" 
                  />
                </div>
                {!collapsed && (
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-slate-100 truncate font-inter">{userDisplayName}</p>
                    {rawDepartment && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/50 mt-0.5 font-inter">
                        {departmentLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {!collapsed && (
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Đăng xuất"
                  className="p-1.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-all shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                </button>
              )}

              {/* Tooltip for logout on collapsed view */}
              {collapsed && (
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Đăng xuất"
                  className="absolute left-16 p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-50 pointer-events-none group-hover:pointer-events-auto shadow-ambient"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar (Permanent, width 240px expanded, 64px collapsed) */}
      <aside className={twMerge(
        "hidden md:flex h-screen fixed left-0 top-0 flex-col z-50 transition-all duration-300 border-r border-slate-800",
        sidebarCollapsed ? "w-16" : "w-[240px]"
      )}>
        {renderSidebarContent(sidebarCollapsed, false)}
      </aside>

      {/* Mobile Drawer Sidebar */}
      <div
        className={twMerge(
          clsx(
            "fixed inset-0 z-50 md:hidden transition-opacity duration-300 ease-in-out",
            sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )
        )}
      >
        {/* Backdrop overlay */}
        <div
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        
        {/* Drawer Panel */}
        <aside
          className={twMerge(
            clsx(
              "absolute top-0 bottom-0 left-0 w-[240px] shadow-[0_32px_64px_rgba(19,27,46,0.12)] transition-transform duration-300 ease-in-out transform bg-[#0F172A] border-r border-slate-800 z-10",
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )
          )}
        >
          {renderSidebarContent(false, true)}
        </aside>
      </div>
    </>
  );
}
