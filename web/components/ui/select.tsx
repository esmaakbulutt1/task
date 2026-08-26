"use client";

import { useId } from "react";
import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
};

export default function Select({
  id,
  label,
  error,
  hint,
  containerClassName = "",
  className = "",
  required,
  disabled,
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = error
    ? `${selectId}-error`
    : hint
      ? `${selectId}-hint`
      : undefined;

  return (
    <div className={`space-y-2 ${containerClassName}`}>
      <label
        htmlFor={selectId}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <select
        {...props}
        id={selectId}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={descriptionId}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 sm:text-base ${
          error
            ? "border-red-500 focus:ring-2 focus:ring-red-200"
            : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        } ${className}`}
      >
        {children}
      </select>

      {error ? (
        <p id={descriptionId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={descriptionId} className="text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
