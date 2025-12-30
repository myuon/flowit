import type { PropsWithChildren, ReactNode } from "react";

interface PanelProps {
  header: ReactNode;
  scrollable?: boolean;
}

export const Panel = ({
  header,
  children,
  scrollable = false,
}: PropsWithChildren<PanelProps>) => (
  <div className={scrollable ? "flex flex-col h-full min-h-0" : ""}>
    <div className="p-3 border-b border-gray-200 font-semibold text-sm shrink-0">
      {header}
    </div>
    <div className={`p-3 ${scrollable ? "overflow-auto flex-1 min-h-0" : ""}`}>
      {children}
    </div>
  </div>
);
