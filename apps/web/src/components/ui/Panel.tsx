import type { ReactNode } from "react";

interface PanelHeaderProps {
  children: ReactNode;
}

export const PanelHeader = ({ children }: PanelHeaderProps) => (
  <div className="p-3 border-b border-gray-200 font-semibold text-sm">
    {children}
  </div>
);

interface PanelContentProps {
  children: ReactNode;
}

export const PanelContent = ({ children }: PanelContentProps) => (
  <div className="p-3">{children}</div>
);
