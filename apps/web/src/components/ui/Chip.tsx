import type { PropsWithChildren } from "react";

type ChipColor = "default" | "success" | "warning";

interface ChipProps {
  color?: ChipColor;
  className?: string;
}

const colorStyles: Record<ChipColor, string> = {
  default: "bg-gray-100 text-gray-500",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
};

export const Chip = ({
  color = "default",
  className = "",
  children,
}: PropsWithChildren<ChipProps>) => (
  <span
    className={`px-2 py-0.5 rounded text-xs font-medium ${colorStyles[color]} ${className}`}
  >
    {children}
  </span>
);
