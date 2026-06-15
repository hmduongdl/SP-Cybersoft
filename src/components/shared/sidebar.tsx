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
    { label: "Admin", href: "/admin/posts", icon: "settings", adminOnly: true },
  ];


  const filteredItems = navItems.filter((item) => !item.adminOnly || role === "ADMIN");

  const userDisplayName = session?.user?.name || (role === "ADMIN" ? "Administrator" : "Thành viên Demo");
  const userRoleText = role === "ADMIN" ? "System Admin" : (session?.user?.role || "Team Member");
  const userImage = session?.user?.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuDVv15Bee8DJDvdJp7cpaPdeO-dM2zHY2Q33pS0dIsrjihSBeFazi0lQN1AAC3ImyUbK5iu2s-BPPmVwFOVNoRTzCBbi3_DQ3jEJ7fP8NVuUl7jI2jKRDfMW15Ha2ucfjU1J3F5Ihoe1nWV8p-7DRlMbZDXm4wJeeijJhj1uLseEUvqXTxtv5sU9Lw254bmA9DgqRk2X77CnFr2zeg3rAoPW__HJ-lq5ZOaxX3H1wQozGI7oI25yKP2yqfEWyEN3R-7Dng-UdPUbXs";

  const sidebarContent = (
    <div className="flex flex-col h-full bg-on-background border-r border-outline-variant/10 shadow-xl py-lg">
      {/* Brand Logo Area */}
      <div className="px-lg mb-3xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-headline-md">TS</div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-surface">TeamSync HR</h1>
            <p className="font-label-sm text-label-sm text-outline-variant">Modern Workspace</p>
          </div>
        </div>
        {/* Close Button on Mobile */}
        <button
          className="md:hidden p-1 rounded-lg hover:bg-white/10 text-outline-variant hover:text-white transition"
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
                    ? "text-on-primary bg-primary border-l-4 border-primary sidebar-active scale-[0.98]"
                    : "text-surface-variant hover:text-white hover:bg-primary/20"
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
        <div className="flex flex-col gap-2 rounded-xl bg-surface/5 border border-outline-variant/10 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-outline-variant">Role Sim:</span>
            <span className={clsx(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border",
              role === "ADMIN" 
                ? "bg-secondary-container/20 text-secondary border-secondary/20" 
                : "bg-primary-fixed/20 text-primary-fixed border-primary-fixed/30"
            )}>
              {role}
            </span>
          </div>
          <button
            onClick={() => setRole(role === "ADMIN" ? "USER" : "ADMIN")}
            className="w-full rounded-lg bg-surface/10 hover:bg-surface/20 text-white text-[11px] py-1 px-2 font-medium transition"
          >
            Switch to {role === "ADMIN" ? "User" : "Admin"}
          </button>
        </div>
      </div>

      {/* User Context */}
      <div className="px-lg mt-auto">
        <div className="flex items-center gap-3 p-3 bg-surface/5 rounded-xl">
          <img 
            alt="User profile avatar" 
            className="w-10 h-10 rounded-full border border-outline-variant/20 object-cover" 
            src={userImage}
          />
          <div className="overflow-hidden">
            <p className="font-label-md text-label-md text-surface truncate">{userDisplayName}</p>
            <p className="font-label-sm text-label-sm text-outline-variant truncate">{userRoleText}</p>
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
          className="absolute inset-0 bg-on-background/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        
        {/* Drawer Panel */}
        <aside
          className={twMerge(
            clsx(
              "absolute top-0 bottom-0 left-0 w-64 shadow-2xl transition-transform duration-300 ease-in-out transform",
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
