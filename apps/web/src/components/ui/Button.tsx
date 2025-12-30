import type { PropsWithChildren, ReactNode, ButtonHTMLAttributes } from "react";

type ButtonColor = "primary" | "default" | "success" | "dark";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: ButtonColor;
  icon?: ReactNode;
}

const colorStyles: Record<ButtonColor, string> = {
  primary: "bg-gray-800 text-white border-none",
  default: "bg-gray-100 border border-gray-300",
  success: "bg-green-600 text-white border-none",
  dark: "bg-gray-800 text-gray-400 border border-gray-600",
};

export const Button = ({
  color = "default",
  className = "",
  disabled,
  icon,
  children,
  ...props
}: PropsWithChildren<ButtonProps>) => (
  <button
    className={`px-3 py-1.5 rounded text-sm ${disabled ? "cursor-not-allowed" : "cursor-pointer"} ${icon ? "flex items-center gap-1.5" : ""} ${colorStyles[color]} ${className}`}
    disabled={disabled}
    {...props}
  >
    {icon}
    {children}
  </button>
);
