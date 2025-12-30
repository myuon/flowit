import type { PropsWithChildren, ReactNode } from "react";

interface PanelProps {
  header: ReactNode;
}

export const Panel = ({ header, children }: PropsWithChildren<PanelProps>) => (
  <div>
    <div className="p-3 border-b border-gray-200 font-semibold text-sm">
      {header}
    </div>
    <div className="p-3">{children}</div>
  </div>
);
