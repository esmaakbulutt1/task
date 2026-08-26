"use client";

import { useId } from "react";
import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  id?: string;
  label: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
};

export default function Input({
  id,
  label,
  error,
  hint,
  containerClassName = "",
  className = "",
  required,
  disabled,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={`space-y-2 ${containerClassName}`}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <input
        {...props}
        id={inputId}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`
          w-full
          rounded-xl
          border
          bg-white
          px-4
          py-3
          text-sm
          text-slate-900
          outline-none
          transition-all
          duration-200
          placeholder:text-slate-400
          disabled:cursor-not-allowed
          disabled:bg-slate-100
          disabled:text-slate-500
          sm:text-base
          ${
            error
              ? "border-red-500 focus:ring-2 focus:ring-red-200"
              : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          }
          ${className}
        `}
      />

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-red-600"
        >
          {error}
        </p>
      )}

      {!error && hint && (
        <p id={hintId} className="text-sm text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}
