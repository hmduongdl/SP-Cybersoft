"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLayout } from "./layout-context";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import { useState, useEffect } from "react";
import { CheckSquare, Settings, Lock } from "lucide-react";
import { useTaskStore } from "@/store/useTaskStore";
import { usePlan } from "@/hooks/usePlan";
import { PlanBadge } from "@/components/shared/PlanGate";

import { UserAvatar } from "./user-avatar";
import { PersonalSettingsModal } from "./PersonalSettingsModal";
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed, isOpenPersonalSettings, setOpenPersonalSettings } = useLayout();
  const { data: session, status } = useSession();
  const { activeFilter, setActiveFilter } = useTaskStore();
  
  // Local profile state to display up-to-date data
  const [profile, setProfile] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const { plan, features, label: planLabel, badgeClass } = usePlan({
    role: profile?.role || session?.user?.role || "USER",
    plan: profile?.plan || "FREE",
    planExpiresAt: profile?.plan_expires_at,
  });


  const fetchProfile = () => {
    fetch("/api/user/profile", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setProfile(data.user);
      })
      .catch(console.error);
  };

  const fetchPendingCount = () => {
    const isAdmin = session?.user?.role === "ADMIN" || profile?.role === "ADMIN";
    if (!isAdmin) return;

    fetch("/api/admin/pending-count")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.pendingCount === "number") {
          setPendingCount(data.pendingCount);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const isAdmin = session?.user?.role === "ADMIN" || profile?.role === "ADMIN";
    if (isAdmin) {
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 60000); // 60s polling
      return () => clearInterval(interval);
    }
  }, [session?.user?.role, profile?.role]);

  // Re-fetch profile when profile-updated event fires (e.g. after modal save)
  useEffect(() => {
    window.addEventListener("profile-updated", fetchProfile);
    window.addEventListener("pending-count-updated", fetchPendingCount);
    return () => {
      window.removeEventListener("profile-updated", fetchProfile);
      window.removeEventListener("pending-count-updated", fetchPendingCount);
    };
  }, [profile]);

  const sectionedItems: Array<{
    title: string;
    adminOnly?: boolean;
    items: Array<{
      label: string;
      href: string;
      icon: string | React.ReactNode;
      adminOnly: boolean;
      devOnly?: boolean;
      adminOnlyAlert?: boolean;
    }>;
  }> = [
    {
      title: "Chung",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: "dashboard", adminOnly: false },
        { label: "Like - Share", href: "/like-share", icon: "task_alt", adminOnly: false },
        { label: "Build PC", href: "/build-pc", icon: "computer", adminOnly: false },
        { label: "Thời gian biểu", href: "/timetable", icon: "calendar_month", adminOnly: false },
        { label: "Task Manager", href: "/tasks", icon: <CheckSquare className="w-5 h-5" />, adminOnly: false },
        { label: "AI Studio", href: "/seo-tools", icon: "trending_up", adminOnly: false, requiresPlan: "MAX" as const },
        { label: "AI Chat", href: "/ai-chat", icon: "forum", adminOnly: false, devOnly: false },
        { label: "Báo Cáo", href: "/reports", icon: "bar_chart", adminOnly: false },
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
      ]
    }
  ];

  const filteredSections = sectionedItems
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.adminOnly || session?.user?.role === "ADMIN" || profile?.role === "ADMIN")
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
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 py-6 px-3 justify-between select-none">
        {/* Upper section */}
        <div className="flex flex-col gap-6 flex-1 min-h-0">
          {/* Logo Area */}
          <div className={clsx("flex items-center justify-between shrink-0", collapsed ? "flex-col gap-4 py-2 px-2 justify-center" : "")}>
            {!collapsed ? (
              <Link href="/">
                <div className="flex items-center">
                  <img src="/spcybersoftlogo.png" alt="SP-CyberSoft" className="h-7 w-auto dark:brightness-0 dark:invert" />
                </div>
              </Link>
            ) : (
              <Link href="/">
                <div className="flex items-center justify-center">
                  <span className="font-manrope font-bold text-2xl text-indigo-500 dark:text-indigo-400 tracking-tight">S</span>
                </div>
              </Link>
            )}

            {/* Toggle / Close Button */}
            {isMobile ? (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all md:hidden"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            ) : (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex p-1.5 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all"
                title={collapsed ? "Mở rộng" : "Thu gọn"}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {collapsed ? "menu_open" : "menu"}
                </span>
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-4 overflow-y-auto no-scrollbar pb-4 flex-1">
            {filteredSections.map((section) => (
              <div key={section.title} className="space-y-1">
                {/* Section Title */}
                {!collapsed && (
                  <p className="text-[11px] font-semibold tracking-[0.05em] font-inter uppercase text-slate-500 px-3 py-1">
                    {section.title}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map(({ label, href, icon, devOnly, adminOnlyAlert, ...rest }) => {
                    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                    const isTasksActive = pathname.startsWith("/tasks");
                    const isAdmin = session?.user?.role === "ADMIN" || profile?.role === "ADMIN";
                    const requiresPlan = (rest as any).requiresPlan as string | undefined;
                    const isPlanLocked = requiresPlan === "MAX" && plan !== "MAX";
                    return (
                      <div key={label} className="w-full">
                        <button
                        onClick={() => {
                            if (isPlanLocked) {
                              router.push("/pricing");
                              toast.info("AI Studio yêu cầu gói MAX. Nâng cấp để mở khóa!");
                              return;
                            }
                            if (devOnly || (adminOnlyAlert && !isAdmin)) {
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
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40"
                            )
                          )}
                          title={collapsed ? label : undefined}
                        >
                          {typeof icon === 'string' ? (
                            <div className="relative">
                              <span className={clsx(
                                "material-symbols-outlined text-[22px]",
                                isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                              )}>
                                {icon}
                              </span>
                              {label === "Duyệt Bài" && pendingCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border-2 border-white dark:border-slate-950"></span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className={clsx(
                              "relative flex items-center justify-center shrink-0",
                              isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                            )}>
                              {icon}
                              {label === "Duyệt Bài" && pendingCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border-2 border-white dark:border-slate-950"></span>
                                </span>
                              )}
                            </div>
                          )}
                          {!collapsed && (
                            <span className="text-sm font-medium font-inter flex-1 flex justify-between items-center">
                              <span className="flex items-center gap-1.5">
                                {label}
                                {isPlanLocked && !collapsed && (
                                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                                )}
                              </span>
                              {label === "Duyệt Bài" && pendingCount > 0 && (
                                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                  {pendingCount}
                                </span>
                              )}
                            </span>
                          )}
                        </button>

                        {/* Task Manager Dynamic Submenu */}
                        {isTasksActive && label === "Task Manager" && !collapsed && (
                          <div className="pl-8 space-y-3 mt-2 font-inter">
                            {/* NHÓM 1: LỌC CÔNG VIỆC */}
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Lọc công việc</p>
                              <div className="flex flex-col gap-1.5">
                                <button
                                  onClick={() => setActiveFilter('my_tasks')}
                                  className={clsx("text-[12px] text-left transition-colors px-2 py-1.5 rounded-md", activeFilter === 'my_tasks' ? "bg-slate-200/60 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200")}
                                >Việc của tôi</button>
                                <button
                                  onClick={() => setActiveFilter('all')}
                                  className={clsx("text-[12px] text-left transition-colors px-2 py-1.5 rounded-md", activeFilter === 'all' ? "bg-slate-200/60 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200")}
                                >Tất cả</button>
                                <button
                                  onClick={() => setActiveFilter('today')}
                                  className={clsx("text-[12px] text-left transition-colors px-2 py-1.5 rounded-md", activeFilter === 'today' ? "bg-slate-200/60 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200")}
                                >Hôm nay</button>
                                <button
                                  onClick={() => setActiveFilter('upcoming')}
                                  className={clsx("text-[12px] text-left transition-colors px-2 py-1.5 rounded-md", activeFilter === 'upcoming' ? "bg-slate-200/60 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200")}
                                >Sắp tới</button>
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Cài đặt (in-scroll) */}
            <div className="space-y-1">
              {!collapsed && (
                <p className="text-[11px] font-semibold tracking-[0.05em] font-inter uppercase text-slate-500 px-3 py-1">
                  Cài đặt
                </p>
              )}
              <button
                onClick={() => setOpenPersonalSettings(true)}
                className={twMerge(
                  clsx(
                    "flex items-center px-3 py-2.5 rounded-lg transition-all duration-150 w-full text-left cursor-pointer gap-3 group",
                    collapsed ? "justify-center px-0 w-10 h-10 mx-auto" : "",
                    "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40"
                  )
                )}
                title={collapsed ? "Cài đặt" : undefined}
              >
                <div className={clsx(
                  "flex items-center justify-center shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                )}>
                  <Settings size={22} className="stroke-[1.5]" />
                </div>
                {!collapsed && <span className="text-sm font-medium font-inter">Cài đặt</span>}
              </button>

              {(session?.user?.role === "ADMIN" || profile?.role === "ADMIN") && (
                <>
                  <Link
                    href="/pricing"
                    className={twMerge(
                      clsx(
                        "flex items-center px-3 py-2.5 rounded-lg transition-all duration-150 w-full text-left cursor-pointer gap-3 group",
                        collapsed ? "justify-center px-0 w-10 h-10 mx-auto" : "",
                        pathname === "/pricing"
                          ? "bg-slate-200/50 dark:bg-slate-800/40 text-slate-900 dark:text-slate-200"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40"
                      )
                    )}
                    title={collapsed ? "Plans" : undefined}
                  >
                    <div className={clsx(
                      "flex items-center justify-center shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                    )}>
                      <span className="material-symbols-outlined text-[22px]">account_tree</span>
                    </div>
                    {!collapsed && <span className="text-sm font-medium font-inter">Plans</span>}
                  </Link>

                  <Link
                    href="/admin/settings"
                    className={twMerge(
                      clsx(
                        "flex items-center px-3 py-2.5 rounded-lg transition-all duration-150 w-full text-left cursor-pointer gap-3 group",
                        collapsed ? "justify-center px-0 w-10 h-10 mx-auto" : "",
                        pathname === "/admin/settings"
                          ? "bg-slate-200/50 dark:bg-slate-800/40 text-slate-900 dark:text-slate-200"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40"
                      )
                    )}
                    title={collapsed ? "Cấu hình hệ thống" : undefined}
                  >
                    <div className={clsx(
                      "flex items-center justify-center shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200",
                      pathname === "/admin/settings" ? "text-slate-600 dark:text-slate-200" : ""
                    )}>
                      <span className="material-symbols-outlined text-[22px]">settings_applications</span>
                    </div>
                    {!collapsed && <span className="text-sm font-medium font-inter">Cấu hình hệ thống</span>}
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>

          {/* User Block */}
          <div className="flex flex-col gap-4">
          {status === "loading" ? (
            <div className="flex items-center gap-3 p-2 bg-slate-200/50 dark:bg-slate-800/20 animate-pulse justify-center rounded-lg">
              <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-800" />
              {!collapsed && (
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-300 dark:bg-slate-800 rounded w-2/3" />
                  <div className="h-3 bg-slate-300 dark:bg-slate-800 rounded w-1/2" />
                </div>
              )}
            </div>
          ) : (
            <div className={clsx(
              "flex items-center justify-between p-2 rounded-lg group relative border-t border-slate-200 dark:border-slate-800/80",
              collapsed ? "justify-center" : "bg-slate-100/50 dark:bg-slate-800/30"
            )}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-full p-[2px] bg-slate-50 dark:bg-[#0F172A] ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-[#0F172A] bg-clip-content shrink-0">
                  <UserAvatar 
                    name={userDisplayName} 
                    src={profile?.avatar_url || (session?.user as any)?.avatar_url} 
                    size="sm"
                    className="border-none shadow-none" 
                  />
                </div>
                {!collapsed && (
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate font-inter">{userDisplayName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {rawDepartment && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-200/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-slate-700/50 font-inter">
                          {departmentLabel}
                        </span>
                      )}
                      <PlanBadge plan={plan} />
                    </div>
                  </div>
                )}
              </div>

              {!collapsed && (
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Đăng xuất"
                  className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-all shrink-0"
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
      {/* Desktop Sidebar */}
      <aside className={twMerge(
        "hidden md:flex h-screen fixed left-0 top-0 flex-col z-50 transition-all duration-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950",
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
        <div
          className="absolute inset-0 z-50 bg-slate-950/70"
          onClick={() => setSidebarOpen(false)}
        />
        <aside
          className={twMerge(
            clsx(
              "absolute top-0 bottom-0 left-0 w-[min(280px,85vw)] shadow-[0_32px_64px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-in-out transform bg-slate-50 dark:bg-[#0F172A] border-r border-slate-200 dark:border-slate-800 z-[60]",
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )
          )}
        >
          {renderSidebarContent(false, true)}
        </aside>
      </div>
      <PersonalSettingsModal
        isOpen={isOpenPersonalSettings}
        onClose={() => setOpenPersonalSettings(false)}
      />
    </>
  );
}
