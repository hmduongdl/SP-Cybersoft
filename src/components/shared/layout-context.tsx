"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type Role = "ADMIN" | "USER";

interface LayoutContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  role: Role;
  setRole: (role: Role) => void;
  isLoadingRole: boolean;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [role, setRole] = useState<Role>("USER");
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const { data: session, status } = useSession();

  // Initialize role from NextAuth session or fallback to local storage
  useEffect(() => {
    if (status === "loading") return;

    const actualRole = session?.user?.role as Role;
    const isActualAdmin = actualRole === "ADMIN";

    const savedRole = localStorage.getItem("simulated_role") as Role;
    if (savedRole && isActualAdmin) {
      setRole(savedRole);
    } else if (isActualAdmin) {
      setRole("ADMIN");
      localStorage.setItem("simulated_role", "ADMIN");
    } else {
      setRole(actualRole || "USER");
      localStorage.setItem("simulated_role", actualRole || "USER");
    }
    setIsLoadingRole(false);
  }, [session, status]);

  // Load sidebarCollapsed from localStorage on mount
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar_collapsed");
    if (savedCollapsed === "true") {
      setSidebarCollapsed(true);
    }
  }, []);

  const handleSetRole = (newRole: Role) => {
    const actualRole = session?.user?.role as Role;
    if (actualRole !== "ADMIN" && newRole === "ADMIN") {
      // Chặn tuyệt đối user thường không được giả lập ADMIN
      return;
    }
    setRole(newRole);
    localStorage.setItem("simulated_role", newRole);
  };

  const handleSetSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem("sidebar_collapsed", collapsed ? "true" : "false");
  };

  return (
    <LayoutContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        role,
        setRole: handleSetRole,
        isLoadingRole,
        sidebarCollapsed,
        setSidebarCollapsed: handleSetSidebarCollapsed,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
