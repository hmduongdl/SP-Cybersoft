"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayout } from "./layout-context";
import { useSession } from "next-auth/react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, role, setRole } = useLayout();
  const { data: session } = useSession();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: "dashboard", adminOnly: false },
    { label: "Calendar", href: "/calendar", icon: "calendar_today", adminOnly: false },
    { label: "List View", href: "/posts", icon: "list_alt", adminOnly: false },
    { label: "Duyệt Bài", href: "/admin/queue", icon: "rate_review", adminOnly: true },
    { label: "Reports", href: "/admin/analytics", icon: "analytics", adminOnly: true },
    { label: "Quản lý Post", href: "/admin/posts", icon: "post_add", adminOnly: true },
    { label: "Quản lý Account", href: "/admin/accounts", icon: "manage_accounts", adminOnly: true },
  ];


  const filteredItems = navItems.filter((item) => !item.adminOnly || role === "ADMIN");

  const userDisplayName = session?.user?.name || (role === "ADMIN" ? "Administrator" : "Thành viên Demo");
  const userRoleText = role === "ADMIN" ? "System Admin" : (session?.user?.role || "Team Member");
  const userImage = session?.user?.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuDVv15Bee8DJDvdJp7cpaPdeO-dM2zHY2Q33pS0dIsrjihSBeFazi0lQN1AAC3ImyUbK5iu2s-BPPmVwFOVNoRTzCBbi3_DQ3jEJ7fP8NVuUl7jI2jKRDfMW15Ha2ucfjU1J3F5Ihoe1nWV8p-7DRlMbZDXm4wJeeijJhj1uLseEUvqXTxtv5sU9Lw254bmA9DgqRk2X77CnFr2zeg3rAoPW__HJ-lq5ZOaxX3H1wQozGI7oI25yKP2yqfEWyEN3R-7Dng-UdPUbXs";

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 shadow-sm py-lg">
      {/* Brand Logo Area */}
      <div className="px-lg mb-3xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-headline-md shadow-sm">TS</div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-slate-900">TeamSync HR</h1>
            <p className="font-label-sm text-label-sm text-slate-500">Modern Workspace</p>
          </div>
        </div>
        {/* Close Button on Mobile */}
        <button
          className="md:hidden p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition"
          onClick={() => setSidebarOpen(false)}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-grow space-y-1">
        {filteredItems.map(({ label, href, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={label}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={twMerge(
                clsx(
                  "flex items-center gap-3 px-4 py-3 transition-all duration-200",
                  isActive
                    ? "text-indigo-600 bg-indigo-50 border-l-4 border-indigo-600 sidebar-active font-medium"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-l-4 border-transparent"
                )
              )}
            >
              <span className="material-symbols-outlined">{icon}</span>
              <span className="font-label-md text-label-md">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Admin/User Role Switcher in Sidebar (Developer helper) */}
      <div className="px-lg my-md">
        <div className="flex flex-col gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Role Sim:</span>
            <span className={clsx(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border",
              role === "ADMIN" 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                : "bg-indigo-50 text-indigo-700 border-indigo-200"
            )}>
              {role}
            </span>
          </div>
          <button
            onClick={() => setRole(role === "ADMIN" ? "USER" : "ADMIN")}
            className="w-full rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] py-1 px-2 font-medium transition shadow-sm"
          >
            Switch to {role === "ADMIN" ? "User" : "Admin"}
          </button>
        </div>
      </div>

      {/* User Context */}
      <div className="px-lg mt-auto pb-4">
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl shadow-sm">
          <img 
            alt="User profile avatar" 
            className="w-10 h-10 rounded-full border border-slate-200 object-cover bg-white" 
            src={userImage}
          />
          <div className="overflow-hidden">
            <p className="font-label-md text-label-md text-slate-900 font-semibold truncate">{userDisplayName}</p>
            <p className="font-label-sm text-label-sm text-slate-500 truncate">{userRoleText}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent, width 256px) */}
      <aside className="hidden md:flex w-64 h-screen fixed left-0 top-0 flex-col z-50">
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
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        
        {/* Drawer Panel */}
        <aside
          className={twMerge(
            clsx(
              "absolute top-0 bottom-0 left-0 w-64 shadow-2xl transition-transform duration-300 ease-in-out transform bg-white",
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
