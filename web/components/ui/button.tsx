"use client";

import type { ButtonHTMLAttributes } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "outlineDanger";

type ButtonSize = "sm" | "md";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary:
    "bg-slate-100 text-slate-700 hover:bg-slate-200",
  success: "bg-green-600 text-white hover:bg-green-700",
  danger: "bg-red-50 text-red-600 hover:bg-red-100",
  warning:
    "bg-yellow-50 text-yellow-700 hover:bg-yellow-100",
  info: "bg-blue-50 text-blue-600 hover:bg-blue-100",
  outlineDanger:
    "border border-red-300 bg-white text-red-600 hover:bg-red-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-4 py-3 text-sm",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  align?: "center" | "start";
};

export default function Button({
  children,
  type = "button",
  loading = false,
  loadingText,
  variant = "primary",
  size = "md",
  fullWidth = true,
  align = "center",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      className={`
        inline-flex
        items-center
        gap-2
        rounded-xl
        font-semibold
        transition
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-blue-500
        focus-visible:ring-offset-2
        disabled:cursor-not-allowed
        disabled:opacity-60
        ${align === "start" ? "justify-start" : "justify-center"}
        ${fullWidth ? "w-full" : ""}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      <span>{loading ? loadingText ?? children : children}</span>
    </button>
  );
}
