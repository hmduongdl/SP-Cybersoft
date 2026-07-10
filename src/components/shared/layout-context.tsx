"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export type PersonalSettingsTab = "profile" | "workspaces" | "appearance" | "trust";

interface LayoutContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isOpenPersonalSettings: boolean;
  personalSettingsTab: PersonalSettingsTab;
  setOpenPersonalSettings: (open: boolean, tab?: PersonalSettingsTab) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isOpenPersonalSettings, setIsOpenPersonalSettings] = useState(false);
  const [personalSettingsTab, setPersonalSettingsTab] = useState<PersonalSettingsTab>("profile");

  const setOpenPersonalSettings = (open: boolean, tab?: PersonalSettingsTab) => {
    if (open && tab) setPersonalSettingsTab(tab);
    if (!open) setPersonalSettingsTab("profile");
    setIsOpenPersonalSettings(open);
  };
  const { data: session, status } = useSession();

  // Load sidebarCollapsed from localStorage on mount
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar_collapsed");
    if (savedCollapsed === "true") {
      setSidebarCollapsed(true);
    }
  }, []);

  const handleSetSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem("sidebar_collapsed", collapsed ? "true" : "false");
  };

  return (
    <LayoutContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        sidebarCollapsed,
        setSidebarCollapsed: handleSetSidebarCollapsed,
        isOpenPersonalSettings,
        personalSettingsTab,
        setOpenPersonalSettings,
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
