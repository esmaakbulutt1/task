import type { ReactNode } from "react";

type FormMessageVariant = "error" | "success" | "info";

type FormMessageProps = {
  children: ReactNode;
  variant?: FormMessageVariant;
};

const variantClasses: Record<FormMessageVariant, string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

export default function FormMessage({
  children,
  variant = "info",
}: FormMessageProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`rounded-xl border px-4 py-3 text-sm ${variantClasses[variant]}`}
    >
      {children}
    </div>
  );
}
