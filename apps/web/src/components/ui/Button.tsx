import type { PropsWithChildren, ButtonHTMLAttributes } from "react";

type ButtonColor = "primary" | "default" | "success";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: ButtonColor;
}

const colorStyles: Record<ButtonColor, string> = {
  primary: "bg-gray-800 text-white border-none",
  default: "bg-gray-100 border border-gray-300",
  success: "bg-green-600 text-white border-none",
};

export const Button = ({
  color = "default",
  className = "",
  children,
  ...props
}: PropsWithChildren<ButtonProps>) => (
  <button
    className={`px-3 py-1.5 rounded cursor-pointer ${colorStyles[color]} ${className}`}
    {...props}
  >
    {children}
  </button>
);
