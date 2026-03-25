"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface SidebarPanelContextValue {
  panelContent: ReactNode | null;
  showPanel: (content: ReactNode) => void;
  hidePanel: () => void;
}

const SidebarPanelContext = createContext<SidebarPanelContextValue>({
  panelContent: null,
  showPanel: () => {},
  hidePanel: () => {},
});

export function SidebarPanelProvider({ children }: { children: ReactNode }) {
  const [panelContent, setPanelContent] = useState<ReactNode | null>(null);

  const showPanel = useCallback((content: ReactNode) => {
    setPanelContent(content);
  }, []);

  const hidePanel = useCallback(() => {
    setPanelContent(null);
  }, []);

  return (
    <SidebarPanelContext.Provider value={{ panelContent, showPanel, hidePanel }}>
      {children}
    </SidebarPanelContext.Provider>
  );
}

export function useSidebarPanel() {
  return useContext(SidebarPanelContext);
}
