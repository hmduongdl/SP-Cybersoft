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
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState<Role>("USER");
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const { data: session, status } = useSession();

  // Initialize role from NextAuth session or fallback to local storage
  useEffect(() => {
    if (status === "loading") return;

    const savedRole = localStorage.getItem("simulated_role") as Role;
    if (savedRole) {
      setRole(savedRole);
    } else if (session?.user?.role) {
      const userRole = session.user.role as Role;
      setRole(userRole);
      localStorage.setItem("simulated_role", userRole);
    }
    setIsLoadingRole(false);
  }, [session, status]);

  const handleSetRole = (newRole: Role) => {
    setRole(newRole);
    localStorage.setItem("simulated_role", newRole);
  };

  return (
    <LayoutContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        role,
        setRole: handleSetRole,
        isLoadingRole,
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
