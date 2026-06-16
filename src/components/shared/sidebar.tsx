"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayout } from "./layout-context";
import { useSession, signOut } from "next-auth/react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import { useState, useEffect } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, role, setRole } = useLayout();
  const { data: session } = useSession();
  
  // Local profile state to display up-to-date data
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetch("/api/user/profile", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setProfile(data.user);
      })
      .catch(console.error);
  }, [session]);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: "dashboard", adminOnly: false },
    { label: "Calendar", href: "/calendar", icon: "calendar_today", adminOnly: false },
    { label: "List View", href: "/posts", icon: "list_alt", adminOnly: false },
    { label: "Duyệt Bài", href: "/admin/queue", icon: "rate_review", adminOnly: true },
    { label: "Reports", href: "/admin/analytics", icon: "analytics", adminOnly: true },
    { label: "Quản lý Post", href: "/admin/posts", icon: "post_add", adminOnly: true },
    { label: "Quản lý Account", href: "/admin/accounts", icon: "manage_accounts", adminOnly: true },
    { label: "Cấu hình Hệ thống", href: "/admin/settings", icon: "settings", adminOnly: true },
  ];

  const filteredItems = navItems.filter((item) => !item.adminOnly || role === "ADMIN");

  const userDisplayName = profile?.name || session?.user?.name || (role === "ADMIN" ? "Administrator" : "Thành viên Demo");
  const userEmail = profile?.email || profile?.gmail || session?.user?.email || (role === "ADMIN" ? "admin@kinetic.hr" : "member@kinetic.hr");
  const userRoleText = role === "ADMIN" ? "System Admin" : (session?.user?.role || "Team Member");
  const userImage = profile?.avatar_url || session?.user?.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuDVv15Bee8DJDvdJp7cpaPdeO-dM2zHY2Q33pS0dIsrjihSBeFazi0lQN1AAC3ImyUbK5iu2s-BPPmVwFOVNoRTzCBbi3_DQ3jEJ7fP8NVuUl7jI2jKRDfMW15Ha2ucfjU1J3F5Ihoe1nWV8p-7DRlMbZDXm4wJeeijJhj1uLseEUvqXTxtv5sU9Lw254bmA9DgqRk2X77CnFr2zeg3rAoPW__HJ-lq5ZOaxX3H1wQozGI7oI25yKP2yqfEWyEN3R-7Dng-UdPUbXs";

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800 py-lg px-4 justify-between">
      {/* Upper section */}
      <div className="flex flex-col gap-6">
        {/* Brand Logo Area */}
        <div className="px-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl text-white font-bold text-lg shadow-[0_0_15px_rgba(99,102,241,0.3)] select-none">
              TS
              <div className="absolute inset-0 rounded-xl border border-indigo-400/20 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-headline-md text-base font-bold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                  TeamSync HR
                </h1>
                <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-medium text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                  v1.0-Stable
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">Modern Workspace</p>
            </div>
          </div>
          {/* Close Button on Mobile */}
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {filteredItems.map(({ label, href, icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={label}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={twMerge(
                  clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 border-l-4",
                    isActive
                      ? "text-indigo-400 bg-indigo-500/10 border-indigo-500 font-medium shadow-[inset_4px_0_12px_rgba(99,102,241,0.05)]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border-transparent"
                  )
                )}
              >
                <span className="material-symbols-outlined text-[22px]">{icon}</span>
                <span className="text-sm font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Lower section */}
      <div className="flex flex-col gap-4">
        {/* Admin/User Role Switcher in Sidebar (Developer helper) */}
        <div className="rounded-xl bg-slate-900/50 border border-slate-800/80 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Role Sim:</span>
            <span className={clsx(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium border",
              role === "ADMIN" 
                ? "bg-emerald-950/50 text-emerald-400 border-emerald-800/50" 
                : "bg-indigo-950/50 text-indigo-400 border-indigo-800/50"
            )}>
              {role}
            </span>
          </div>
          <button
            onClick={() => {
              setRole(role === "ADMIN" ? "USER" : "ADMIN");
              window.location.href = "/dashboard";
            }}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-[11px] py-1.5 px-2 font-medium transition shadow-sm"
          >
            Switch to {role === "ADMIN" ? "User" : "Admin"}
          </button>
        </div>

        {/* User Context */}
        <div className="flex items-center justify-between p-2.5 bg-slate-900/30 border border-slate-800/80 rounded-xl shadow-md group">
          <div className="flex items-center gap-3 overflow-hidden">
            <img 
              alt="User profile avatar" 
              className="w-10 h-10 rounded-full border border-slate-800 object-cover bg-slate-900 group-hover:scale-105 transition-transform duration-200" 
              src={userImage}
            />
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-200 truncate">{userDisplayName}</p>
              <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Đăng xuất nhanh"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors duration-200"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent, width 280px) */}
      <aside className="hidden md:flex w-[280px] h-screen fixed left-0 top-0 flex-col z-50">
        {sidebarContent}
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
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        
        {/* Drawer Panel */}
        <aside
          className={twMerge(
            clsx(
              "absolute top-0 bottom-0 left-0 w-[280px] shadow-2xl transition-transform duration-300 ease-in-out transform bg-slate-950",
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )
          )}
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  );
}

