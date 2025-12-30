import type { PropsWithChildren, ReactNode } from "react";

interface PanelProps {
  header: ReactNode;
}

export const Panel = ({ header, children }: PropsWithChildren<PanelProps>) => (
  <div>
    <div className="sticky top-0 p-3 border-b border-gray-200 font-semibold text-sm bg-gray-50">
      {header}
    </div>
    <div className="p-3">{children}</div>
  </div>
);
