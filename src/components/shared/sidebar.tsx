"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, LayoutList, BarChart3, Settings, X, ShieldAlert, ShieldCheck } from "lucide-react";
import { useLayout } from "./layout-context";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, role, setRole } = useLayout();

  const navItems = [
    { label: "Tổng quan", href: "/dashboard", icon: Home, adminOnly: false },
    { label: "Lịch Công Việc", href: "/calendar", icon: Calendar, adminOnly: false },
    { label: "Danh Sách Bài Share", href: "/posts", icon: LayoutList, adminOnly: false },
    { label: "Báo Cáo Chi Tiết", href: "/admin/reports", icon: BarChart3, adminOnly: true },
    { label: "Quản Lý Bài Viết", href: "/admin/posts", icon: Settings, adminOnly: true },
  ];

  const filteredItems = navItems.filter((item) => !item.adminOnly || role === "ADMIN");

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 border-r border-slate-800/80">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-base">
            KS
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-tight text-white">Kinetic HR</h1>
            <p className="text-[10px] text-slate-400">Share Check-in Shell</p>
          </div>
        </div>
        
        {/* Close Button on Mobile */}
        <button
          className="md:hidden p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Menu chính
        </p>
        {filteredItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={label}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={twMerge(
                clsx(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/15"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                )
              )}
            >
              <Icon className={twMerge(clsx("h-5 w-5 transition-transform duration-200 group-hover:scale-105", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"))} />
              <span>{label}</span>
              {isActive && (
                <span className="absolute left-0 top-1/3 bottom-1/3 w-1 bg-white rounded-r" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Admin/User Role Simulation Switcher in Sidebar (Developer helper) */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex flex-col gap-2 rounded-xl bg-slate-900/60 border border-slate-800 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Chế độ giả lập:</span>
            {role === "ADMIN" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3" /> Admin
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-500/20">
                <ShieldAlert className="h-3 w-3" /> User
              </span>
            )}
          </div>
          <button
            onClick={() => setRole(role === "ADMIN" ? "USER" : "ADMIN")}
            className="mt-1 w-full rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] py-1.5 px-2 font-medium transition"
          >
            Đổi sang {role === "ADMIN" ? "User" : "Admin"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent, width 260px) */}
      <aside className="hidden md:block w-[260px] h-screen sticky top-0 flex-shrink-0 z-20">
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
              "absolute top-0 bottom-0 left-0 w-[260px] shadow-2xl transition-transform duration-300 ease-in-out transform",
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
